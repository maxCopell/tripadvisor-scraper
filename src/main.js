const Apify = require('apify');

process.env.API_KEY = '3c7beec8-846d-4377-be03-71cae6145fdc';

const general = require('./tools/general');

const {
    resolveInBatches,
    getRequestListSources,
    getClient,
    setState,
    getState,
    randomDelay,
    validateInput,
    proxyConfiguration,
    getLocationId,
} = general;

const { processRestaurant } = require('./tools/restaurant-tools');
const { processHotel } = require('./tools/hotel-tools');
const { processAttraction, getAttractions } = require('./tools/attraction-tools');

const {
    buildRestaurantUrl,
    getPlaceInformation,
    callForRestaurantList,
    callForHotelList,
    buildHotelUrl,
    getHostelListUrl,
} = require('./tools/api');

const { API_RESULTS_PER_PAGE } = require('./constants');
const { getConfig, setConfig, checkMaxItemsLimit } = require('./tools/data-limits');

const { utils: { log } } = Apify;

Apify.main(async () => {
    /** @type {any} */
    const input = await Apify.getValue('INPUT');
    let error = 0;
    validateInput(input);
    const {
        locationFullName,
        locationId: locationIdInput,
        lastReviewDate = '2010-01-01',
        hotelId,
        restaurantId,
        checkInDate,
        debugLog = false,
    } = input;

    if (debugLog) {
        log.setLevel(log.LEVELS.DEBUG);
    }

    const requestQueue = await Apify.openRequestQueue();

    setConfig(input);

    const state = await Apify.getValue('STATE') || {};
    setState(state);

    log.debug('Received input', input);
    global.INCLUDE_REVIEWS = input.includeReviews || false;
    global.LAST_REVIEW_DATE = lastReviewDate;
    global.CHECKIN_DATE = checkInDate;
    global.INCLUDE_REVIEW_TAGS = input.includeTags || false;
    global.PROXY = await proxyConfiguration({
        proxyConfig: input.proxyConfiguration,
        hint: ['RESIDENTIAL'],
    });

    global.LANGUAGE = input.language || 'en';
    global.CURRENCY = input.currency || 'USD';

    /** @type {Apify.RequestOptions[]} */
    const startUrls = [];
    const generalDataset = await Apify.openDataset();
    /** @type {string} */

    let locationId = (await Apify.getValue('LOCATION-ID')) || null;

    if (locationFullName || locationIdInput) {
        if (locationIdInput) {
            locationId = locationIdInput;
            startUrls.push(...getRequestListSources({ ...input, locationId }));
            log.info(`Processing locationId: ${locationId}`);
        } else {
            startUrls.push({
                url: 'https://www.tripadvisor.com/',
                userData: { StartLocationId: true },
            });
        }
    }

    Apify.events.on('persistState', async () => {
        const saveState = getState();
        await Apify.setValue('STATE', saveState);
        await Apify.setValue('LOCATION-ID', locationId);
    });

    if (restaurantId) {
        log.debug(`Processing restaurant ${restaurantId}`);

        startUrls.push({
            url: 'https://www.tripadvisor.com',
            userData: { restaurantId, restaurantDetail: true },
        });
    }

    if (hotelId) {
        log.debug(`Processing hotel ${restaurantId}`);

        startUrls.push({
            url: 'https://www.tripadvisor.com',
            userData: { hotelId, hotelDetail: true },
        });
    }

    /** @type {Record<string, general.Client>} */
    const sessionClients = {};
    let listenerAdded = false;
    const crawler = new Apify.BasicCrawler({
        requestQueue,
        requestList: await Apify.openRequestList('STARTURLS', startUrls),
        maxConcurrency: 20,
        maxRequestRetries: 10,
        useSessionPool: true,
        sessionPoolOptions: {
            maxPoolSize: 40,
            createSessionFunction: async (sessionPool) => {
                log.debug('CREATING SESSION');
                const session = new Apify.Session({ sessionPool });

                if (!sessionClients[session.id]) {
                    try {
                        sessionClients[session.id] = await getClient(session);
                    } catch (e) {
                        log.warning(`Could not create create for session due to: ${e.message}`, { stack: e.stack });
                    }
                }

                if (!listenerAdded) {
                    sessionPool.on('sessionRetired', (ses) => delete sessionClients[ses.id]);
                    listenerAdded = true;
                }
                return session;
            },
        },
        handleRequestTimeoutSecs: 180,
        handleRequestFunction: async ({ request, session }) => {
            if (!session) {
                throw new Error('session is undefined');
            }
            log.debug('HANDLING REQUEST');
            if (checkMaxItemsLimit()) {
                log.debug('REACHED MAX ITEMS LIMIT');
                return;
            }

            const client = sessionClients[session.id] || await getClient(session);
            // await checkIp(); // Proxy check

            const { maxItems } = getConfig();

            if (request.userData.StartLocationId) {
                log.debug('GETTING LOCATION ID');
                log.debug(`locationFullName: ${locationFullName}`);
                locationId = await getLocationId(locationFullName);

                log.debug(`locationId: ${locationId}`);
                const urls = [];
                urls.push(...getRequestListSources({ ...input, locationId }));

                for (const url of urls) {
                    await requestQueue.addRequest(url);
                }
            }

            if (request.userData.initialHotel) {
                log.debug('INITIAL HOTEL LIST');
                // Process initial hotelList url and add others with pagination to request queue
                // Get total results count
                const { paging } = await callForHotelList({
                    locationId,
                    session,
                    limit: 1,
                });

                if (!paging.results) {
                    request.noRetry = true;
                    throw new Error(`Hotels are empty`);
                }

                // eslint-disable-next-line no-nested-ternary
                const maxLimit = maxItems === 0 ? paging.total_results : maxItems;
                log.info(`Processing ${API_RESULTS_PER_PAGE} hotels with last data offset: ${maxLimit}`);

                log.debug(`Found ${paging.total_results} hotels`);
                const promises = [];
                for (let i = 0; i < maxLimit; i += API_RESULTS_PER_PAGE) {
                    promises.push(() => requestQueue.addRequest({
                        url: getHostelListUrl(locationId, global.CURRENCY, global.LANGUAGE, maxLimit, i),
                        userData: { hotelList: true, offset: i, limit: API_RESULTS_PER_PAGE },
                    }));
                    log.debug(`Adding location with ID: ${locationId} Offset: ${i.toString()}`);
                    if (checkMaxItemsLimit(i)) break;
                }
                await resolveInBatches(promises);
            } else if (request.userData.hotelList) {
                log.debug('HOTEL LIST WITH OFFSET');
                // Gets ids of hotels from hotelList -> gets data for given id and saves hotel to dataset
                log.info(`Processing hotel list with offset ${request.userData.offset}`);
                const { data: hotelList } = await callForHotelList({
                    locationId,
                    session,
                    limit: request.userData.limit,
                    offset: request.userData.offset,
                });

                if (!hotelList?.length) {
                    throw new Error('Hotel list is empty');
                }

                await resolveInBatches(hotelList.map((hotel, index) => {
                    log.debug(`Processing hotel: ${hotel.name}`);

                    if (checkMaxItemsLimit(index)) return () => {};

                    return () => processHotel({ placeInfo: hotel, session, client, dataset: generalDataset });
                }));
            } else if (request.userData.initialRestaurant) {
                // Process initial restaurantList url and add others with pagination to request queue
                log.debug('INITIAL RESTAURANT LIST');
                const promises = [];
                // Get total results count
                const { paging } = await callForRestaurantList({ locationId, session, limit: 1 });

                if (!paging.results) {
                    request.noRetry = true;
                    throw new Error(`Result length is zero`);
                }

                // eslint-disable-next-line no-nested-ternary
                const maxLimit = maxItems === 0 ? paging.total_results : maxItems;

                log.info(`Processing restaurants with last data offset: ${maxLimit}`);
                for (let i = 0; i < maxLimit; i += API_RESULTS_PER_PAGE) {
                    log.info(`Adding restaurants search page with offset: ${i} to list`);

                    promises.push(() => requestQueue.addRequest({
                        url: buildRestaurantUrl(locationId, i.toString()),
                        userData: { restaurantList: true, offset: i, limit: API_RESULTS_PER_PAGE },
                    }));

                    if (checkMaxItemsLimit(i)) break;
                }
                await resolveInBatches(promises);
            } else if (request.userData.restaurantList) {
                log.debug('RESTAURANT LIST WITH OFFSET');
                log.info(`Processing restaurant list with offset ${request.userData.offset}`);
                const { data: restaurantList } = await callForRestaurantList({
                    locationId,
                    session,
                    limit: request.userData.limit,
                    offset: request.userData.offset,
                });

                if (!restaurantList?.length) {
                    throw new Error(`Restaurant list is empty`);
                }

                await resolveInBatches(restaurantList.map((restaurant, index) => {
                    log.debug(`Processing restaurant: ${restaurant.name}`);

                    if (checkMaxItemsLimit(index)) return () => {};

                    return () => processRestaurant({
                        placeInfo: restaurant,
                        client,
                        dataset: generalDataset,
                        session,
                    });
                }));
            } else if (request.userData.restaurantDetail) {
                // For API usage only gets restaurantId from input and sets OUTPUT.json to key-value store
                //  a.k.a. returns response with restaurant data
                log.debug('RESTAURANT DETAIL');
                const { restaurantId: id } = request.userData;
                log.info(`Processing single API request for restaurant with id: ${id}`);
                await processRestaurant({
                    placeInfo: await getPlaceInformation({ placeId: restaurantId, session }),
                    client,
                    session,
                });
            } else if (request.userData.hotelDetail) {
                // For API usage only gets hotelId from input and sets OUTPUT.json to key-value store
                //  a.k.a. returns response with hotel data
                log.debug('HOTEL DETAIL');
                const { hotelId: id } = request.userData;
                log.info(`Processing single API request for hotel with id: ${id}`);
                await processHotel({
                    placeInfo: await getPlaceInformation({ placeId: hotelId, session }),
                    client,
                    session,
                });
            } else if (request.userData.initialAttraction) {
                log.debug('ATTRACTIONS');
                const attractions = await getAttractions({ locationId, session });
                log.info(`Scraped ${attractions.length} attractions`);
                await resolveInBatches(attractions.map((attr, index) => {
                    if (checkMaxItemsLimit(index)) return () => {};
                    return () => processAttraction({
                        attraction: attr,
                        session,
                    });
                }), 10);
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
