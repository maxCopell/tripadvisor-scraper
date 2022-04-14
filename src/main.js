const Apify = require('apify');

process.env.API_KEY = '3c7beec8-846d-4377-be03-71cae6145fdc';

const general = require('./tools/general');

const {
    resolveInBatches,
    getRequestListSources,
    getClient,
    setState,
    getState,
    validateInput,
    proxyConfiguration,
    getLocationId,
} = general;

const { processRestaurant } = require('./tools/restaurant-tools');
const { processHotel } = require('./tools/hotel-tools');
const { processAttraction, getAttractions } = require('./tools/attraction-tools');

const {
    doRequest,
    buildRestaurantUrl,
    getPlaceInformation,
    callForRestaurantList,
    callForHotelList,
    getHostelListUrl,
} = require('./tools/api');

const { API_RESULTS_PER_PAGE } = require('./constants');
const { getConfig, setConfig, checkMaxItemsLimit } = require('./tools/data-limits');

const { utils: { log } } = Apify;

Apify.main(async () => {
    /** @type {any} */
    const input = await Apify.getInput();

    let error = 0;
    validateInput(input);

    console.log("1st check " + input.maxItems);

    let { maxItems = 0 } = input;

    console.log("2nd check " + maxItems);

    const {
        locationFullName,
        locationId: locationIdInput,
        lastReviewDate = '2010-01-01',
        hotelId,
        restaurantId,
        checkInDate,
        debugLog = false,
        paid = false
    } = input;

    if (!paid) {
        if (maxItems > 100) {
            log.warning(`You asked for ${maxItems} number of videos but this actor allows only 100.` +
            `If you want more results use paid version of TikTok scraper, available here: https://apify.com/sauermar/tiktok-scraper`);
            maxItems = 100;
        }
    }

    console.log("3rd check " + maxItems);

    if (debugLog) {
        log.setLevel(log.LEVELS.DEBUG);
    }

    const requestQueue = await Apify.openRequestQueue();

    setConfig(input);

    const state = await Apify.getValue('STATE') || {};
    setState(state);

    log.debug('Received input', input);

    // @ts-expect-error
    global.INCLUDE_REVIEWS = input.includeReviews || false; // @ts-expect-error
    global.LAST_REVIEW_DATE = lastReviewDate; // @ts-expect-error
    global.CHECKIN_DATE = checkInDate; // @ts-expect-error
    global.INCLUDE_REVIEW_TAGS = input.includeTags || false; // @ts-expect-error
    global.PROXY = await proxyConfiguration({
        proxyConfig: input.proxyConfiguration,
        hint: ['RESIDENTIAL'],
    });

    // @ts-expect-error
    global.LANGUAGE = input.language || 'en'; // @ts-expect-error
    global.CURRENCY = input.currency || 'USD';

    /** @type {Apify.RequestOptions[]} */
    const startUrls = input?.startUrls || [];
    const generalDataset = await Apify.openDataset();

    /** @type {string | { [x: string]: any } | Buffer | null} */
    const inputLocationId = await Apify.getValue('LOCATION-ID');

    /** @type {string} */
    let locationId = typeof inputLocationId === 'string' ? inputLocationId : '';

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
                    } catch (/** @type {any} */ e) {
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
            log.debug('HANDLING REQUEST', { url: request.url });
            if (checkMaxItemsLimit()) {
                log.debug('REACHED MAX ITEMS LIMIT', { url: request.url });
                return;
            }

            const client = sessionClients[session.id] || await getClient(session);
            // await checkIp(); // Proxy check

            //const { maxItems } = getConfig();
            console.log("4th check " + maxItems)

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

                const buildRequest = async (/** @type {number} */ offset) => {
                    requestQueue.addRequest({
                        // @ts-ignore
                        url: getHostelListUrl(locationId, global.CURRENCY, global.LANGUAGE, maxLimit, offset),
                        userData: { hotelList: true, offset, limit: API_RESULTS_PER_PAGE },
                    });
                };

                for (let i = 0; i < maxLimit; i += API_RESULTS_PER_PAGE) {
                    promises.push(() => buildRequest(i));
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

                await resolveInBatches(hotelList.map((/** @type {any} */ hotel, /** @type {number} */ index) => {
                    log.debug(`Processing hotel: ${hotel.name}`);

                    if (checkMaxItemsLimit(index)) return () => {};

                    return () => processHotel({ placeInfo: hotel, session, client, dataset: generalDataset });
                }));
            } else if (request.userData.initialRestaurant) {
                // Process initial restaurantList url and add others with pagination to request queue
                log.debug('INITIAL RESTAURANT LIST');

                /** @type {(() => Promise<any>)[]} */
                const promises = [];

                // Get total results count
                const { paging } = await callForRestaurantList({ locationId, session, limit: 1 });

                if (!paging.results) {
                    request.noRetry = true;
                    throw new Error(`Result length is zero`);
                }

                // eslint-disable-next-line no-nested-ternary
                const maxLimit = maxItems === 0 ? paging.total_results : maxItems;

                const buildRequest = async (/** @type {number} */ offset) => {
                    requestQueue.addRequest({
                        url: buildRestaurantUrl(locationId, offset.toString()),
                        userData: { restaurantList: true, offset, limit: API_RESULTS_PER_PAGE },
                    });
                };

                log.info(`Processing restaurants with last data offset: ${maxLimit}`);
                for (let i = 0; i < maxLimit; i += API_RESULTS_PER_PAGE) {
                    log.info(`Adding restaurants search page with offset: ${i} to list`);

                    promises.push(() => buildRequest(i));

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

                await resolveInBatches(restaurantList.map((/** @type {any} */ restaurant, /** @type {number} */ index) => {
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
                await resolveInBatches(attractions.map((/** @type {any} */ attr, /** @type {number} */ index) => {
                    if (checkMaxItemsLimit(index)) return () => {};
                    return () => processAttraction({
                        attraction: attr,
                        session,
                    });
                }), 10);
            } else if (request.url.startsWith('https://api.tripadvisor.com/api/internal')) {
                const response = await doRequest({
                    url: request.url,
                    session,
                });

                await Apify.pushData({
                    ...request.userData,
                    ...response.body,
                });
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
