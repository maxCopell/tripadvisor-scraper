// @ts-nocheck
const moment = require('moment');
const Apify = require('apify');

const { SearchQuery } = require('./graphql-queries');
const { API_RESULTS_PER_PAGE } = require('../constants');
const general = require('./general'); // eslint-disable-line no-unused-vars

const { log, requestAsBrowser, sleep } = Apify.utils;
const { API_KEY } = process.env;

/**
 * @param {{
 *   query: string,
 *   client: general.Client,
 * }} param0
 */
async function callForSearch({ query, client }) {
    await Apify.setValue('searchQuery', SearchQuery);
    const response = await client({
        url: '/ids',
        body: [{
            query: SearchQuery,
            variables: {
                request: {
                    query,
                    limit: 10,
                    scope: 'WORLDWIDE',
                    locale: 'en-US',
                    scopeGeoId: 1,
                    searchCenter: null,
                    types: ['LOCATION', 'QUERY_SUGGESTION', 'USER_PROFILE', 'RESCUE_RESULT'],
                    locationTypes: ['GEO', 'AIRPORT', 'ACCOMMODATION', 'ATTRACTION', 'ATTRACTION_PRODUCT', 'EATERY', 'NEIGHBORHOOD', 'AIRLINE', 'SHOPPING', 'UNIVERSITY', 'GENERAL_HOSPITAL', 'PORT', 'FERRY', 'CORPORATION', 'VACATION_RENTAL', 'SHIP', 'CRUISE_LINE', 'CAR_RENTAL_OFFICE'],
                    userId: null,
                    context: {
                        searchSessionId: '91CDC537DA7536533B97CF5EEFE80DA41638306855528ssid',
                        typeaheadId: '1638306877219',
                        uiOrigin: 'SINGLE_SEARCH_HERO',
                        routeUid: '20b035aa-a83c-4750-ad15-234206bd6c5d',
                    },
                    articleCategories: ['default', 'love_your_local', 'insurance_lander'],
                    enabledFeatures: ['typeahead-q'],
                },
            },
        }],
    });

    try {
        await Apify.setValue('SEARCH_QUERY_RESPONSE', response);
        return response[0].data.Typeahead_autocomplete.results[0].locationId;
    } catch (e) {
        log.debug('SEARCH FAILED', { e: e.message, data: response[0]?.data, results: response?.[0]?.data?.Typeahead_autocomplete });
        throw new Error(`Nothing found for "${query}"`);
    }
}

/**
 *
 * @param {{
 *  placeId?: number | string,
 *  session: Apify.Session,
 *  client: general.Client,
 *  offset?: number,
 *  limit?: number
 *  lang?: string
 *  currency?: string
 * }} param0
 * @returns
 */
async function callForReview({ placeId = 300974, session, offset = 0, limit = 100, lang = 'en', currency = 'USD' }) {
    // const response = await client({
    //     url: '/batched',
    //     payload: [{
    //         variables: {
    //             filterCacheKey: `locationReviewFilters_${placeId}`,
    //             filters: [
    //                 {
    //                     axis: 'LANGUAGE',
    //                     selections: [
    //                         global.LANGUAGE,
    //                     ],
    //                 },
    //             ],
    //             initialPrefs: {},
    //             keywordVariant: `location_keywords_v2_llr_order_30_${global.LANGUAGE}`,
    //             limit,
    //             locationId: placeId,
    //             needKeywords: false,
    //             offset,
    //             prefs: null,
    //             prefsCacheKey: 'locationReviewPrefs',
    //         },
    //         query: ReviewQuery,
    //     }],
    // });

    // return response?.[0];

    const url = `https://api.tripadvisor.com/api/internal/1.14/location/${placeId}/reviews?limit=${limit}&currency=${currency}&lang=${lang}&offset=${offset}`;
    const response = await doRequest({
        url,
        session,
    });
    return response;
}

/**
 *
 * @param {{
 *   url: string,
 *   session?: Apify.Session,
 *   cookie?: boolean,
 *   method?: 'GET' | 'POST'
 *   retries?: number
 * }} param0
 *
 * @returns {Promise<any>}
 */
const doRequest = async ({ url, session, cookie = true, method = 'GET', retries = 0 }) => {
    const proxyUrl = global.PROXY?.newUrl(session?.id || `s${Math.round(Math.random() * 999999)}`);

    const response = await requestAsBrowser({
        url,
        method,
        useInsecureHttpParser: false,
        headers: {
            'X-TripAdvisor-API-Key': API_KEY,
            // 'X-TripAdvisor-UUID': UUID,
            ...(cookie ? { Cookie: session?.getCookieString(url) } : {}),
        },
        responseType: 'json',
        proxyUrl,
    });

    if (![200, 304, 301, 302].includes(response.statusCode)) {
        if (retries < 3) {
            log.debug('Retrying request', { url, status: response.statusCode });

            await sleep(3000);

            return doRequest({ url, cookie: true, method, retries: retries + 1 });
        }

        throw new Error(`Status code ${response.statusCode} for ${url}`);
    }

    if (cookie) {
        session?.setCookiesFromResponse(response);
    }

    return response;
};

/**
 *
 * @param {{
 *  placeId: string,
 *  delay: () => Promise<void>,
 *  session: Apify.Session
 * }} params
 */
async function getPlacePrices({ placeId, delay, session }) {
    const dateString = global.CHECKIN_DATE || moment().format('YYYY-MM-DD');
    const url = `https://api.tripadvisor.com/api/internal/1.19/en/meta_hac/${placeId}?adults=2&checkin=${dateString}&currency=${global.CURRENCY}&lod=extended&nights=1&lang=${global.LANGUAGE}`;
    const response = await doRequest({
        url,
        session,
        cookie: false,
    });
    // console.log('prices', response.body.data);
    /** @type {any} */
    const offers = response.body.data?.[0]?.hac_offers;

    if (!offers) {
        throw new Error(`Could not find offers for: ${placeId}`);
    }

    const isLoaded = offers?.availability !== 'pending' ?? false;

    if (!isLoaded) {
        await delay();
        return getPlacePrices({ placeId, delay, session });
    }

    return offers;
}

/**
 * @param {{
 *   placeId: string,
 *   session: Apify.Session,
 * }} params
 */
async function getPlaceInformation({ placeId, session }) {
    const url = `https://api.tripadvisor.com/api/internal/1.14/location/${placeId}?currency=${global.CURRENCY}&lang=${global.LANGUAGE}`;

    log.debug(`Getting place information`, { url });

    const response = await doRequest({
        url,
        session,
    });

    return response.body;
}

function buildRestaurantUrl(locationId, offset) {
    return `https://www.tripadvisor.com/RestaurantSearch?Action=PAGE&geo=${locationId}&ajax=1&sortOrder=relevance&${offset ? `o=a${offset}` : ''}&availSearchEnabled=false`;
}

function buildHotelUrl(locationId, offset) {
    return `https://www.tripadvisor.com/Hotels-g${locationId}-${offset ? `oa${offset}` : ''}.html`;
}

function buildAttractionsUrl(locationId) {
    return `https://www.tripadvisor.com/Attractions-g${locationId}`;
}

/**
 * @param {{
 *  locationId: string,
 *  session: Apify.Session,
 *  limit?: number,
 *  offset?: number
 * }} params
 * @returns {Promise<{
 *  data: any[],
 *  paging: {
 *   next: string | nu,
 *   previous: string | null,
 *   skipped: string,
 *   results: string,
 *   total_results: string,
 *  }
 * }>}
 */
async function callForAttractionList({ locationId, session, limit = 10, offset = 0 }) {
    const url = `https://api.tripadvisor.com/api/internal/1.14/location/${locationId}/attractions?limit=${limit}&currency=${global.CURRENCY}&lang=${global.LANGUAGE}${offset ? `&offset=${offset}` : ''}`;
    const response = await doRequest({
        url,
        session,
    });
    return response.body;
}

/**
 * @param {{
 *   locationId: string,
 *   session: Apify.Session,
 *   limit?: number,
 *   offset?: number
 * }} params
 */
async function callForAttractionReview({ locationId, session, limit = 10, offset = 0 }) {
    const url = `https://api.tripadvisor.com/api/internal/1.14/location/${locationId}/reviews?limit=${limit}&currency=${global.CURRENCY}&lang=${global.LANGUAGE}${offset ? `&offset=${offset}` : ''}`;

    const response = await doRequest({
        url,
        session,
    });

    return response.body.data;
}

/**
 * @param {{
 *   locationId: string,
 *   session: Apify.Session,
 *   limit?: number,
 *   offset?: number
 * }} params
 */
async function getReviewTagsForLocation({ locationId, session, limit = API_RESULTS_PER_PAGE, offset = 0 }) {
    const url = `https://api.tripadvisor.com/api/internal/1.14/location/${locationId}/keywords?currency=${global.CURRENCY}&lang=${global.LANGUAGE}&limit=${limit}${offset ? `&offset=${offset}` : ''}`;
    const response = await doRequest({
        url,
        session,
    });

    return response.body.data;
}

/**
 * @param {{
 *   locationId: string,
 *   session: Apify.Session,
 *   limit?: number,
 *   offset?: number
 * }} params
 * @returns {Promise<{data: any, paging: {total_results: number, results: number}}>} responseBody
 */
async function callForRestaurantList({ locationId, session, limit = API_RESULTS_PER_PAGE, offset = 0 }) {
    const url = `https://api.tripadvisor.com/api/internal/1.14/location/${locationId}/restaurants?currency=${global.CURRENCY}&lang=${global.LANGUAGE}&limit=${limit}${offset ? `&offset=${offset}` : ''}`;
    const response = await doRequest({
        url,
        session,
    });

    return response.body;
}

/**
 *
 * @param {string} locationId
 * @param {string} currency
 * @param {string} language
 * @param {number} limit
 * @param {number} offset
 * @returns {string} url
 */
function getHostelListUrl(locationId, currency, language, limit, offset) {
    return `https://api.tripadvisor.com/api/internal/1.14/location/${locationId}/hotels?currency=${currency}&lang=${language}&limit=${limit || API_RESULTS_PER_PAGE}${offset ? `&offset=${offset}` : ''}`;
}

/**
 * @param {{
 *   locationId: string,
 *   session: Apify.Session,
 *   limit?: number,
 *   offset?: number
 * }} params
 */
async function callForHotelList({ locationId, session, limit = API_RESULTS_PER_PAGE, offset = 0 }) {
    const url = getHostelListUrl(locationId, global.CURRENCY, global.LANGUAGE, limit, offset);
    const response = await doRequest({
        url,
        session,
    });

    return response.body;
}

module.exports = {
    doRequest,
    callForReview,
    getPlacePrices,
    getPlaceInformation,
    buildHotelUrl,
    buildRestaurantUrl,
    getReviewTagsForLocation,
    callForRestaurantList,
    callForHotelList,
    buildAttractionsUrl,
    callForAttractionList,
    callForAttractionReview,
    callForSearch,
    getHostelListUrl,
};
