const Apify = require('apify');

process.env.API_KEY = '3c7beec8-846d-4377-be03-71cae6145fdc';
const {
    resolveInBatches,
    getRequestListSources,
    getClient,
    randomDelay,
    validateInput,
} = require('./tools/general');

const { processRestaurant } = require('./tools/restaurant-tools');
const { processHotel } = require('./tools/hotel-tools');
const { processAttraction, getAttractions } = require('./tools/attraction-tools');

const {
    getLocationId,
    buildRestaurantUrl,
    getPlaceInformation,
    callForRestaurantList,
    callForHotelList,
} = require('./tools/api');

const { LIMIT } = require('./constants');

const { utils: { log } } = Apify;


Apify.main(async () => {
    // Create and initialize an instance of the RequestList class that contains the start URL.
    const input = await Apify.getValue('INPUT');
    let error = 0;
    validateInput(input);
    const {
        locationFullName,
        locationId: locationIdInput,
        includeRestaurants = true,
        includeHotels = true,
        includeReviews = true,
        includeAttractions = true,
        lastReviewDate = '2010-01-01',
        hotelId,
        restaurantId,
        checkInDate,
    } = input;
    log.debug('Received input', input);
    global.INCLUDE_REVIEWS = includeReviews;
    global.LAST_REVIEW_DATE = lastReviewDate;
    global.CHECKIN_DATE = checkInDate;
    global.PROXY_GROUPS = input.proxyConfiguration && input.proxyConfiguration.apifyProxyGroups;
    global.LANGUAGE = input.language || 'en_USA';

    let requestList;
    const generalDataset = await Apify.openDataset();
    let locationId;

    if (locationFullName || locationIdInput) {
        if (locationIdInput) {
            locationId = locationIdInput;
        } else {
            locationId = await getLocationId(locationFullName);
        }
        log.info(`Processing locationId: ${locationId}`);
        requestList = new Apify.RequestList({
            sources: getRequestListSources(locationId, includeHotels, includeRestaurants, includeAttractions),
        });
    }
    if (restaurantId) {
        log.debug(`Processing restaurant ${restaurantId}`);
        requestList = new Apify.RequestList({
            sources: [{ url: 'https://www.tripadvisor.com', userData: { restaurantId, restaurantDetail: true } }],
        });
    } else if (hotelId) {
        log.debug(`Processing hotel ${restaurantId}`);
        requestList = new Apify.RequestList({
            sources: [{ url: 'https://www.tripadvisor.com', userData: { hotelId, hotelDetail: true } }],
        });
    }

    await requestList.initialize();
    const requestQueue = await Apify.openRequestQueue();


    const crawler = new Apify.BasicCrawler({
        requestList,
        requestQueue,
        minConcurrency: 10,
        maxConcurrency: 20,
        handleRequestTimeoutSecs: 180,
        handleRequestFunction: async ({ request }) => {
            let client;

            if (request.userData.initialHotel) {
                // Process initial hotelList url and add others with pagination to request queue
                const initialRequest = await callForHotelList(locationId);
                const maxOffset = initialRequest.paging.total_results;
                log.info(maxOffset, 'Number of hotels');
                log.info(`Processing hotels with last data offset: ${maxOffset}`);
                const promises = [];
                for (let i = 0; i <= maxOffset; i += LIMIT) {
                    promises.push(() => requestQueue.addRequest({
                        url: `https://api.tripadvisor.com/api/internal/1.14/location/${locationId}/hotels?currency=CZK&lang=${global.LANGUAGE}&limit=${LIMIT}&offset=${i}`,
                        userData: { hotelList: true, offset: i, limit: LIMIT },
                    }));
                    log.debug(`Adding location with ID: ${locationId} Offset: ${i.toString()}`);
                }
                await resolveInBatches(promises);
            } else if (request.userData.hotelList) {
                // Gets ids of hotels from hotelList -> gets data for given id and saves hotel to dataset
                try {
                    log.info(`Processing hotel list with offset ${request.userData.offset}`);
                    client = await getClient();
                    const hotelList = await callForHotelList(locationId, request.userData.limit, request.userData.offset);
                    await resolveInBatches(hotelList.data.map((hotel) => {
                        log.debug(`Processing hotel: ${hotel.name}`);

                        return () => processHotel(hotel, client, generalDataset);
                    }));
                } catch (e) {
                    log.error('Hotel list error', e);
                }
            } else if (request.userData.initialRestaurant) {
                // Process initial restaurantList url and add others with pagination to request queue
                const promises = [];
                const initialRequest = await callForRestaurantList(locationId);
                const maxOffset = initialRequest.paging.total_results;
                log.info(maxOffset, 'Number of Restaurants');
                log.info(`Processing restaurants with last data offset: ${maxOffset}`);
                for (let i = 0; i <= maxOffset; i += LIMIT) {
                    log.info(`Adding restaurants search page with offset: ${i} to list`);

                    promises.push(() => requestQueue.addRequest({
                        url: buildRestaurantUrl(locationId, i.toString()),
                        userData: { restaurantList: true, offset: i, limit: LIMIT },
                    }));
                }
                await randomDelay();
                await resolveInBatches(promises);
            } else if (request.userData.restaurantList) {
                log.info(`Processing restaurant list with offset ${request.userData.offset}`);
                const restaurantList = await callForRestaurantList(locationId, request.userData.limit, request.userData.offset);
                client = await getClient();
                await resolveInBatches(restaurantList.data.map((restaurant) => {
                    log.debug(`Processing restaurant: ${restaurant.name}`);

                    return () => processRestaurant(restaurant, client, generalDataset);
                }));
            } else if (request.userData.restaurantDetail) {
                // For API usage only gets restaurantId from input and sets OUTPUT.json to key-value store
                //  a.k.a. returns response with restaurant data
                const { restaurantId: id } = request.userData;
                log.info(`Processing single API request for restaurant with id: ${id}`);
                client = await getClient();
                await processRestaurant(await getPlaceInformation(restaurantId), client);
            } else if (request.userData.hotelDetail) {
                // For API usage only gets hotelId from input and sets OUTPUT.json to key-value store
                //  a.k.a. returns response with hotel data
                const { hotelId: id } = request.userData;
                log.info(`Processing single API request for hotel with id: ${id}`);
                client = await getClient();
                await processHotel(await getPlaceInformation(hotelId), client);
            } else if (request.userData.initialAttraction) {
                try {
                    const attractions = await getAttractions(locationId);
                    log.info(`Found ${attractions.length} attractions`);
                    const attractionsWithDetails = await resolveInBatches(attractions.map(attr => () => processAttraction(attr)), 20);
                    await Apify.pushData(attractionsWithDetails);
                } catch (e) {
                    log.error(`Could not process attraction... ${e.message}`);
                }
            }
        },
        handleFailedRequestFunction: async ({ request }) => {
            log.info(`Request ${request.url} failed too many times`);
            await Apify.setValue(`ERROR-${Date.now()}`, JSON.stringify(request), { contentType: 'application/json' });
            error += 1;
        },
    });
    // Run the crawler and wait for it to finish.
    await crawler.run();
    log.info(`Requests failed: ${error}`);

    log.info('Crawler finished.');
});
