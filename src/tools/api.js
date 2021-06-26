const querystring = require('querystring');
const moment = require('moment');
const Apify = require('apify');

const { ReviewQuery } = require('./graphql-queries');
const { LIMIT } = require('../constants');

const { log, requestAsBrowser } = Apify.utils;
const { API_KEY } = process.env;

async function callForReview(placeId = 300974, client, offset = 0, limit = 100) {
    const response = await client({
        url: '/batched',
        payload: JSON.stringify([{
            variables: {
                filterCacheKey: `locationReviewFilters_${placeId}`,
                filters: [
                    {
                        axis: 'LANGUAGE',
                        selections: [
                            global.LANGUAGE,
                        ],
                    },
                ],
                initialPrefs: {},
                keywordVariant: `location_keywords_v2_llr_order_30_${global.LANGUAGE}`,
                limit,
                locationId: placeId,
                needKeywords: false,
                offset,
                prefs: null,
                prefsCacheKey: 'locationReviewPrefs',
            },
            query: ReviewQuery,
        }]),
    });

    return response?.[0];
}

const doRequest = async ({ url, session, cookie = true, method = 'GET' }) => {
    const proxyUrl = global.PROXY?.newUrl(session?.id || `s${Math.round(Math.random() * 9999)}`);

    const response = await requestAsBrowser({
        url,
        method,
        headers: {
            'X-TripAdvisor-API-Key': API_KEY,
            ...(cookie ? { Cookie: session?.getCookieString(url) } : {}),
        },
        abortFunction: () => false,
        json: true,
        proxyUrl,
    });

    if (![200, 304, 301, 302].includes(response.statusCode)) {
        throw new Error(`Status code ${response.statusCode} for ${url}`);
    }

    session?.setCookiesFromResponse(response);

    return response;
};

async function getLocationId(searchString, session) {
    const queryString = querystring.stringify({
        query: searchString,
        alternate_tag_name: true,
        auto_broaden: true,
        category_type: 'neighborhoods,geos',
        currency: global.CURRENCY,
        lang: global.LANGUAGE,
    });

    const url = `https://api.tripadvisor.com/api/internal/1.14/typeahead?${queryString}`;
    const result = await doRequest({
        url,
        method: 'POST',
        session,
        cookie: false,
    });

    const { data } = result.body;

    if (!data) {
        throw new Error(`Could not find location "${searchString}" reason`);
    }

    return data[0].result_object.location_id;
}

async function getPlacePrices(placeId, delay, session) {
    const dateString = global.CHECKIN_DATE || moment().format('YYYY-MM-DD');
    const url = `https://api.tripadvisor.com/api/internal/1.19/en/meta_hac/${placeId}?adults=2&checkin=${dateString}&currency=${global.CURRENCY}&lod=extended&nights=1&lang=${global.LANGUAGE}`;
    const response = await doRequest({
        url,
        session,
        cookie: false,
    });
    // console.log('prices', response.body);
    const offers = response.body.data?.[0]?.hac_offers;

    if (!offers) {
        throw new Error(`Could not find offers for: ${placeId}`);
    }

    const isLoaded = offers?.availability !== 'pending' ?? false;

    if (!isLoaded) {
        await delay();
        return getPlacePrices(placeId, delay, session);
    }

    return offers;
}

async function getPlaceInformation(placeId, session) {
    const url = `https://api.tripadvisor.com/api/internal/1.14/location/${placeId}?&lang=${global.LANGUAGE}`;

    const response = await doRequest({
        url,
        session,
    });

    return response.body.data;
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

async function callForAttractionList(locationId, session, limit = 10, offset = 0) {
    const url = `https://api.tripadvisor.com/api/internal/1.14/location/${locationId}/attractions?limit=${limit}&offset=${offset}`;
    const response = await doRequest({
        url,
        session,
    });
    return response.body.data;
}

async function callForAttractionReview(locationId, session, limit = 10, offset = 0) {
    const url = `https://api.tripadvisor.com/api/internal/1.14/location/${locationId}/reviews?limit=${limit}&offset=${offset}`;

    const response = await doRequest({
        url,
        session,
    });

    return response.body.data;
}

async function getReviewTagsForLocation(locationId, session, limit = LIMIT, offset = 0) {
    const url = `https://api.tripadvisor.com/api/internal/1.14/location/${locationId}/keywords?currency=${global.CURRENCY}&lang=${global.LANGUAGE}&limit=${limit}&offset=${offset}`;
    const response = await doRequest({
        url,
        session,
    });

    return response.body.data;
}

async function callForRestaurantList(locationId, session, limit = LIMIT, offset = 0) {
    const url = `https://api.tripadvisor.com/api/internal/1.14/location/${locationId}/restaurants?currency=${global.CURRENCY}&lang=${global.LANGUAGE}&limit=${limit}&offset=${offset}`;
    const response = await doRequest({
        url,
        session,
    });

    return response.body.data;
}

async function callForHotelList(locationId, session, limit = LIMIT, offset = 0) {
    const url = `https://api.tripadvisor.com/api/internal/1.14/location/${locationId}/hotels?currency=${global.CURRENCY}&lang=${global.LANGUAGE}&limit=${limit}&offset=${offset}`;
    const response = await doRequest({
        url,
        session,
    });

    return response.body.data;
}

module.exports = {
    callForReview,
    getLocationId,
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
};
