const Apify = require('apify');

// eslint-disable-next-line no-unused-vars
const general = require('./general');

const { API_RESULTS_PER_PAGE } = require('../constants');
const { callForHotelList, getHostelListUrl, buildRestaurantUrl, callForRestaurantList, getPlaceInformation, doRequest } = require('./api');
const { checkMaxItemsLimit, getConfig } = require('./data-limits');
const { resolveInBatches } = require('./general');
const { processHotel } = require('./hotel-tools');
const { processRestaurant } = require('./restaurant-tools');
const { getAttractions, processAttraction } = require('./attraction-tools');

const { utils: { log } } = Apify;

/**
 * @typedef CrawlingContext
 * @property {Apify.Request} request
 * @property {Apify.Session} session
 * @property {Apify.BasicCrawler} [crawler]
 */

/**
 *
 * @param {CrawlingContext} context
 */
async function handleInitialHotel({ request, session, crawler }) {
    if (!crawler) return;

    const { requestQueue } = crawler;
    const { locationId } = request.userData;

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

    const { maxItems } = getConfig();
    const maxLimit = maxItems === 0 ? paging.total_results : maxItems;
    log.info(`Processing ${API_RESULTS_PER_PAGE} hotels with last data offset: ${maxLimit}`);

    log.debug(`Found ${paging.total_results} hotels`);

    const promises = [];

    const buildRequest = async (/** @type {number} */ offset) => {
        requestQueue?.addRequest({
            // @ts-ignore
            url: getHostelListUrl(locationId, global.CURRENCY, global.LANGUAGE, maxLimit, offset),
            userData: { locationId, hotelList: true, offset, limit: API_RESULTS_PER_PAGE },
        });
    };

    for (let i = 0; i < maxLimit; i += API_RESULTS_PER_PAGE) {
        promises.push(() => buildRequest(i));
        log.debug(`Adding location with ID: ${locationId} Offset: ${i.toString()}`);
        if (checkMaxItemsLimit(i)) break;
    }

    await resolveInBatches(promises);
}

/**
 *
 * @param {CrawlingContext} context
 */
async function handleInitialRestaurant({ request, session, crawler }) {
    if (!crawler) return;

    const { requestQueue } = crawler;
    const { locationId } = request.userData;

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

    const { maxItems } = getConfig();
    const maxLimit = maxItems === 0 ? paging.total_results : maxItems;

    const buildRequest = async (/** @type {number} */ offset) => {
        requestQueue?.addRequest({
            url: buildRestaurantUrl(locationId, offset.toString()),
            userData: { locationId, restaurantList: true, offset, limit: API_RESULTS_PER_PAGE },
        });
    };

    log.info(`Processing restaurants with last data offset: ${maxLimit}`);
    for (let i = 0; i < maxLimit; i += API_RESULTS_PER_PAGE) {
        log.info(`Adding restaurants search page with offset: ${i} to list`);

        promises.push(() => buildRequest(i));

        if (checkMaxItemsLimit(i)) break;
    }
    await resolveInBatches(promises);
}

/**
 *
 * @param {CrawlingContext} context
 */
async function handleInitialAttraction({ request, session }) {
    const { locationId } = request.userData;

    log.debug('ATTRACTIONS');
    const attractions = await getAttractions({ locationId, session });
    log.info(`Scraped ${attractions.length} attractions`);
    await resolveInBatches(attractions.map(
        (/** @type {any} */ attraction, /** @type {number} */ index) => {
            if (checkMaxItemsLimit(index)) {
                return () => {};
            }

            return () => processAttraction({
                attraction,
                session,
            });
        },
    ), 10);
}

/**
 *
 * @param {CrawlingContext} context
 * @param {general.Client} client
 * @param {Apify.Dataset} dataset
 */
async function handleHotelList({ request, session }, client, dataset) {
    const { locationId } = request.userData;

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

        return () => processHotel({ placeInfo: hotel, session, client, dataset });
    }));
}

/**
 *
 * @param {CrawlingContext} context
 * @param {general.Client} client
 * @param {Apify.Dataset} dataset
 */
async function handleRestaurantList({ request, session }, client, dataset) {
    const { locationId } = request.userData;

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
            dataset,
            session,
        });
    }));
}

/**
 *
 * @param {CrawlingContext} context
 * @param {general.Client} client
 * @param {Apify.Dataset} dataset
 */
async function handleRestaurantDetail({ request, session }, client, dataset) {
    log.debug('RESTAURANT DETAIL');
    const { placeId } = request.userData;
    log.info(`Processing single API request for restaurant with id: ${placeId}`);
    await processRestaurant({
        placeInfo: await getPlaceInformation({ placeId, session }),
        client,
        dataset,
        session,
    });
}

/**
 *
 * @param {CrawlingContext} context
 * @param {general.Client} client
 * @param {Apify.Dataset} dataset
 */
async function handleHotelDetail({ request, session }, client, dataset) {
    log.debug('HOTEL DETAIL');
    const { placeId } = request.userData;
    log.info(`Processing single API request for hotel with id: ${placeId}`);
    await processHotel({
        placeInfo: await getPlaceInformation({ placeId, session }),
        client,
        dataset,
        session,
    });
}

/**
 *
 * @param {CrawlingContext} context
 */
async function handleInternalApiPage({ request, session }) {
    const response = await doRequest({
        url: request.url,
        session,
    });

    await Apify.pushData({
        ...request.userData,
        ...response.body,
    });
}

module.exports = {
    handleInitialHotel,
    handleInitialRestaurant,
    handleInitialAttraction,
    handleHotelList,
    handleRestaurantList,
    handleRestaurantDetail,
    handleHotelDetail,
    handleInternalApiPage,
};
