const Apify = require('apify');

process.env.API_KEY = '3c7beec8-846d-4377-be03-71cae6145fdc';

const general = require('./tools/general');

const {
    getClient,
    setState,
    getState,
    validateInput,
    proxyConfiguration,
} = general;

const { setConfig, checkMaxItemsLimit } = require('./tools/data-limits');
const { buildStartRequests, buildSearchRequestsFromLocationName } = require('./tools/general');
const { handleInitialHotel, handleHotelList, handleInitialRestaurant, handleRestaurantList, handleRestaurantDetail, handleHotelDetail, handleInitialAttraction, handleInternalApiPage } = require('./tools/routes');

const { utils: { log } } = Apify;

Apify.main(async () => {
    /** @type {any} */
    const input = await Apify.getInput();

    const {
        locationFullName,
        lastReviewDate = '2010-01-01',
        checkInDate,
        debugLog = false
    } = input;

    if (debugLog) {
        log.setLevel(log.LEVELS.DEBUG);
    }

    validateInput(input);
    setConfig(input);
    log.debug('Received input', input);

    let error = 0;
    const state = await Apify.getValue('STATE') || {};
    setState(state);

    const requestQueue = await Apify.openRequestQueue();
    const startUrls = [];

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

    const dataset = await Apify.openDataset();

    if (locationFullName) {
        const searchRequests = await buildSearchRequestsFromLocationName(locationFullName, input);
        startUrls.push(...searchRequests);
    }

    Apify.events.on('persistState', async () => {
        const saveState = getState();
        await Apify.setValue('STATE', saveState);
    });

    const startRequests = await buildStartRequests(input);
    startUrls.push(...startRequests);
    log.debug(`Start urls: ${JSON.stringify(startUrls, null, 2)}`);

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
        handleRequestFunction: async ({ request, session, crawler: basicCrawler }) => {
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

            const {
                initialHotel, initialRestaurant, initialAttraction,
                hotelList, restaurantList,
                restaurantDetail, hotelDetail,
            } = request.userData;

            if (initialHotel) {
                await handleInitialHotel({ request, session, crawler: basicCrawler });
            } else if (initialRestaurant) {
                await handleInitialRestaurant({ request, session, crawler: basicCrawler });
            } else if (initialAttraction) {
                await handleInitialAttraction({ request, session });
            } else if (hotelList) {
                await handleHotelList({ request, session }, client, dataset);
            } else if (restaurantList) {
                await handleRestaurantList({ request, session }, client, dataset);
            } else if (restaurantDetail) {
                await handleRestaurantDetail({ request, session }, client, dataset);
            } else if (hotelDetail) {
                await handleHotelDetail({ request, session }, client, dataset);
            } else if (request.url.startsWith('https://api.tripadvisor.com/api/internal')) {
                await handleInternalApiPage({ request, session });
            }
        },
        handleFailedRequestFunction: async ({ request }) => {
            log.info(`Request ${request.url} failed too many times`);
            await Apify.setValue(`ERROR-${Date.now()}`, JSON.stringify(request), { contentType: 'application/json' });
            error += 1;
        },
    });

    log.info('Starting the crawler...');
    await crawler.run();
    log.info('Crawler finished.');

    log.info(`Requests failed: ${error}`);
});
