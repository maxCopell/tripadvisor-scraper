const querystring = require('querystring');
const axios = require('axios');
const moment = require('moment');
const Apify = require('apify');
const ProxyAgent = require('proxy-agent');

const { ReviewQuery } = require('./graphql-queries');
const { LIMIT } = require('../constants');

const { API_KEY } = process.env;

function callForReview(placeId = 300974, client, offset = 0, limit = 100) {
    return client.post('/batched',
        [{
            operationName: 'ReviewListQuery',
            variables: {
                locationId: placeId,
                offset,
                filters: [],
                prefs: null,
                initialPrefs: {},
                limit,
                filterCacheKey: null,
                prefsCacheKey: 'hotelReviewPrefs',
                needKeywords: false,
                keywordVariant: 'location_keywords_v2_llr_order_30_en',
            },
            query: ReviewQuery,
        }]);
}

async function getLocationId(searchString, session) {
    const queryString = querystring.stringify({
        query: searchString,
        alternate_tag_name: true,
        auto_broaden: true,
        category_type: 'neighborhoods,geos',
        currency: 'USD',

    });
    let error;
    let result;
    try {
        const url = `https://api.tripadvisor.com/api/internal/1.14/typeahead?${queryString}&lang=${global.LANGUAGE}`;
        result = await axios.post(
            url,
            {},
            {
                headers: {
                    'X-TripAdvisor-API-Key': API_KEY,
                },
                ...getAgentOptions({ id: session }) },
        );
    } catch (e) {
        error = e;
    }
    console.log(error);
    const { data } = result.data;

    if (!data || error) {
        throw new Error(`Could not find location "${searchString}" reason: ${error.message}`);
    }

    return data[0].result_object.location_id;
}

async function getPlacePrices(placeId, delay, session) {
    const dateString = global.CHECKIN_DATE || moment().format('YYYY-MM-DD');
    const url = `https://api.tripadvisor.com/api/internal/1.19/en/meta_hac/${placeId}?adults=2&checkin=${dateString}&currency=USD&lod=extended&nights=1&lang=${global.LANGUAGE}`;
    const response = await axios.get(
        url,
        {
            headers: {
                'X-TripAdvisor-API-Key': API_KEY,
                Cookie: session.getCookieString(url),
            },
            ...getAgentOptions(session),
        },
    );
    const offers = response.data.data[0].hac_offers;
    const isLoaded = offers && offers.availability && offers.availability !== 'pending';
    if (!offers) {
        throw new Error(`Could not find offers for: ${placeId}`);
    }
    if (!isLoaded) {
        await delay();
        return getPlacePrices(placeId, delay, session);
    }

    session.setCookiesFromResponse({ headers: response.headers, url });
    return offers;
}

async function getPlaceInformation(placeId, session) {
    const url = `https://api.tripadvisor.com/api/internal/1.14/location/${placeId}?&lang=${global.LANGUAGE}`;

    const response = await axios.get(
        url,
        { headers: { 'X-TripAdvisor-API-Key': API_KEY, Cookie: session.getCookieString(url) }, ...getAgentOptions(session) },
    );
    session.setCookiesFromResponse({ headers: response.headers, url });

    return response.data;
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
    const response = await axios.get(
        url,
        { headers: { 'X-TripAdvisor-API-Key': API_KEY, Cookie: session.getCookieString(url) }, ...getAgentOptions(session) },
    );
    session.setCookiesFromResponse({ headers: response.headers, url });
    return response.data;
}

async function callForAttractionReview(locationId, session, limit = 10, offset = 0) {
    const url = `https://api.tripadvisor.com/api/internal/1.14/location/${locationId}/reviews?limit=${limit}&offset=${offset}`;

    const response = await axios.get(
        url,
        { headers: { 'X-TripAdvisor-API-Key': API_KEY, Cookie: session.getCookieString(url) }, ...getAgentOptions(session) },
    );
    session.setCookiesFromResponse({ headers: response.headers, url });

    return response.data;
}

async function getReviewTagsForLocation(locationId, session, limit = LIMIT, offset = 0) {
    const url = `https://api.tripadvisor.com/api/internal/1.14/location/${locationId}/keywords?currency=CZK&lang=${global.LANGUAGE}&limit=${limit}&offset=${offset}`;
    const response = await axios.get(
        url,
        { headers: { 'X-TripAdvisor-API-Key': API_KEY, Cookie: session.getCookieString(url) }, ...getAgentOptions(session) },
    );
    session.setCookiesFromResponse({ headers: response.headers, url });

    return response.data;
}

async function callForRestaurantList(locationId, session, limit = LIMIT, offset = 0) {
    const url = `https://api.tripadvisor.com/api/internal/1.14/location/${locationId}/restaurants?currency=CZK&lang=${global.LANGUAGE}&limit=${limit}&offset=${offset}`;
    const response = await axios.get(
        url,
        { headers: { 'X-TripAdvisor-API-Key': API_KEY, Cookie: session.getCookieString(url) }, ...getAgentOptions(session) },
    );
    session.setCookiesFromResponse({ headers: response.headers, url });

    return response.data;
}

async function callForHotelList(locationId, session, limit = LIMIT, offset = 0) {
    const url = `https://api.tripadvisor.com/api/internal/1.14/location/${locationId}/hotels?currency=CZK&lang=${global.LANGUAGE}&limit=${limit}&offset=${offset}`;
    const response = await axios.get(
        url,
        { headers: { 'X-TripAdvisor-API-Key': API_KEY, Cookie: session.getCookieString(url) }, ...getAgentOptions(session) },
    );
    session.setCookiesFromResponse({ headers: response.headers, url });

    return response.data;
}


function getAgentOptions(session) {
    if (!global.USE_PROXY) {
        return {};
    }
    const proxyUrl = Apify.getApifyProxyUrl({
        password: process.env.APIFY_PROXY_PASSWORD,
        groups: global.PROXY_GROUPS,
        session: session.id,
    });
    const agent = new ProxyAgent(proxyUrl);
    return {
        httpsAgent: agent,
        httpAgent: agent,
    };
}

module.exports = {
    callForReview,
    getLocationId,
    getPlacePrices,
    getPlaceInformation,
    buildHotelUrl,
    buildRestaurantUrl,
    getAgentOptions,
    getReviewTagsForLocation,
    callForRestaurantList,
    callForHotelList,
    buildAttractionsUrl,
    callForAttractionList,
    callForAttractionReview,
};
