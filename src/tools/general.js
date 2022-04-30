const Apify = require('apify');
const cheerio = require('cheerio');
const moment = require('moment');
const { ID_REGEX, SEARCH_QUERY_REGEX } = require('../constants');

const {
    callForReview,
    buildHotelUrl,
    buildRestaurantUrl,
    buildAttractionsUrl,
    getReviewTagsForLocation,
    callForSearch,
} = require('./api');
const { getConfig } = require('./data-limits');

const { log, sleep, requestAsBrowser } = Apify.utils;

/** @type {any} */
let state = {};

/**
 *
 * @param {string | {[x: string]: any}} newState
 */
const setState = (newState) => {
    state = newState;
};

const getState = () => state;

function randomDelay(minimum = 200, maximum = 600) {
    const min = Math.ceil(minimum);
    const max = Math.floor(maximum);
    return Apify.utils.sleep(Math.floor(Math.random() * (max - min + 1)) + min);
}

/**
 *
 * @param {cheerio.CheerioAPI} $
 * @returns {string?}
 */
function getSecurityToken($) {
    let securityToken = null;
    $('head script').each((_index, element) => {
        // @ts-expect-error
        if ($(element).get()[0].children[0] && $(element).get()[0].children[0].data.includes("define('page-model', [], function() { return ")) {
            // @ts-expect-error
            let scriptText = $(element).get()[0].children[0].data;

            scriptText = scriptText.replace("define('page-model', [], function() { return ", '');
            scriptText = scriptText.replace('; });', '');
            const scriptObject = JSON.parse(scriptText);
            securityToken = scriptObject.JS_SECURITY_TOKEN;
        }
    });
    return securityToken;
}

function getCookies(/** @type {{headers: any } | null} */ response) {
    return (response?.headers?.['set-cookie'] ?? []).map((/** @type {string} */ d) => {
        const cookie = d.split(';');

        if (cookie.includes('TASession') || cookie.includes('TAUD')) {
            return cookie[0];
        }
    }).filter((/** @type {string[]} */ s) => s).join('; ');
}

/**
 *
 * @param {string} query
 */
async function getLocationId(query) {
    return callForSearch({
        query,
        client: await getClient(),
    });
}

/**
 * @param {Array<() => Promise<any> | Promise<any>>} promiseArray
 * @param {number} [batchLength]
 */
async function resolveInBatches(promiseArray, batchLength = 10) {
    const results = [];

    while (true) {
        const promises = promiseArray.splice(0, batchLength).map((promise) => {
            if (typeof promise === 'function') {
                return promise();
            }

            return promise;
        });

        if (!promises.length) break;

        results.push(...await Promise.all(promises));

        if (promises.length < batchLength) break;
    }

    return results;
}

// const processReview = (review, remoteId) => {
//     const { text, title, rating, tripInfo, publishedDate, userProfile, photos } = review;
//     const stayDate = tripInfo ? tripInfo.stayDate : null;
//     let userLocation = null;
//     let userContributions = null;
//     let userName = null;
//     const imageUrls = [];

//     log.debug(`Processing review: ${title}`);
//     if (userProfile) {
//         const { hometown, contributionCounts = {}, username } = userProfile;
//         userContributions = contributionCounts?.sumReview;
//         userLocation = hometown.fallbackString;
//         userName = username;

//         if (hometown.location) {
//             userLocation = hometown.location.additionalNames.long;
//         }
//     }

//     if (photos && photos.length > 0) {
//         for (const photo of photos) {
//             const { photoSizes } = photo;
//             const photoUrl = photoSizes[photoSizes.length - 1].url;
//             imageUrls.push(photoUrl);
//         }
//     }

//     return {
//         text,
//         title,
//         rating,
//         stayDate,
//         publishedDate,
//         userLocation,
//         userContributions,
//         remoteId,
//         userName,
//         imageUrls,
//     };
// };

/**
 * @param {{
 *   reviews: any[],
 *   dateKey: string
 * }} params
 */
function findLastReviewIndexByDate({ reviews, dateKey }) {
    return reviews.findIndex((r) => {
        let rDate;
        if (dateKey) {
            rDate = moment(r[dateKey]);
        } else {
            rDate = moment(r.publishedDate);
        }
        // @ts-expect-error
        const userMaxDate = moment(global.LAST_REVIEW_DATE);
        return rDate.isBefore(userMaxDate);
    });
}

/**
 *
 * @param {{
 *   placeId: string,
 *   client: Client,
 *   session: Apify.Session
 * }} params
 */
async function getReviews({ placeId, client, session }) {
    let offset = 0;
    const limit = 20;
    const { maxReviews } = getConfig();
    let reachedLimit = false;

    let reviews = state[`reviews-${placeId}`] || [];

    while (!reachedLimit) {
        const resp = await callForReview({ placeId, session, client, offset, limit });
        const { statusCode, body: { data, paging } } = resp ?? {};

        if (statusCode !== 200 || !data) {
            throw new Error('Failed to get reviews');
        }

        reviews = [...reviews, ...data];
        const { total_results: totalCount } = paging;

        const lastIndexByDate = findLastReviewIndexByDate({ reviews, dateKey: 'publishedDate' });
        if (lastIndexByDate >= 0) {
            log.info('Getting the last review by date');
            reviews = reviews.slice(0, lastIndexByDate);
        }

        if (reviews.length > maxReviews) {
            log.info('Getting the last review by maxReviews limit');
            const sliceIndex = reviews.length - maxReviews;
            reviews = reviews.splice(0, sliceIndex);
        }

        log.info(`Processing ${reviews.length} of ${totalCount} reviews for placeId ${placeId}`);

        offset += limit;

        const newState = { ...state, [`reviews-${placeId}`]: reviews };
        setState(newState);

        if (reviews.length < limit) {
            log.info('No more reviews to be returned');
            reachedLimit = true;
        }
        if (maxReviews > 0 && reviews.length >= maxReviews) {
            log.debug('', { maxReviews, reviewsCount: reviews.length });
            log.warning('Reached limit of reviews, further reviews will be discarded');
            reachedLimit = true;
        }
    }
    delete state[`reviews-${placeId}`];
    return reviews;
}

/**
 *
 * @param {any} input
 * @returns
 */
async function buildStartRequests(input) {
    /** @type {Apify.RequestOptions[]} */
    const requests = [];

    for (const { url } of input.startUrls) {
        const lowercaseUrl = url.toLowerCase();

        if (lowercaseUrl.includes('search?q=')) {
            const searchRequests = await buildSearchRequestsFromUrl(url, input);
            requests.push(...searchRequests);
        } else {
            const detailRequests = buildDetailRequestsFromUrl(url);
            requests.push(...detailRequests);
        }
    }

    return requests;
}

/**
 *
 * @param {string} url
 * @returns
 */
function buildDetailRequestsFromUrl(url) {
    const requests = [];

    const idMatches = new RegExp(ID_REGEX).exec(url);
    if (idMatches) {
        const placeId = idMatches[1];
        const lowercaseUrl = url.toLowerCase();

        if (lowercaseUrl.includes('restaurant_review')) {
            requests.push({
                url,
                userData: { placeId, restaurantDetail: true },
            });
        } else if (lowercaseUrl.includes('hotel_review')) {
            requests.push({
                url,
                userData: { placeId, hotelDetail: true },
            });
        }
    }

    return requests;
}

/**
 *
 * @param {string} searchUrl
 * @param {any} input
 * @returns
 */
async function buildSearchRequestsFromUrl(searchUrl, input) {
    const requests = [];

    const searchQueryMatches = new RegExp(SEARCH_QUERY_REGEX).exec(searchUrl);
    if (searchQueryMatches) {
        const locationFullName = decodeURIComponent(searchQueryMatches[1]);
        const searchRequests = await buildSearchRequestsFromLocationName(locationFullName, input);
        requests.push(...searchRequests);
    }

    return requests;
}

/**
 *
 * @param {string} locationFullName
 * @param {any} input
 * @returns
 */
async function buildSearchRequestsFromLocationName(locationFullName, input) {
    const requests = [];

    log.debug(`Fetching locationId for location: ${locationFullName}`);
    const locationId = await getLocationId(locationFullName);
    log.info(`Fetched locationId: ${locationId} for location: ${locationFullName}`);

    requests.push(...getRequestListSources({ ...input, locationId }));

    return requests;
}

/**
 * @param {any} param0
 */
function getRequestListSources({ locationId, includeHotels = true, includeRestaurants = true, includeAttractions = false }) {
    const sources = [];

    if (includeHotels) {
        sources.push({
            url: buildHotelUrl(locationId),
            userData: { locationId, initialHotel: true },
        });
    }
    if (includeRestaurants) {
        sources.push({
            url: buildRestaurantUrl(locationId),
            userData: { locationId, initialRestaurant: true },
        });
    }
    if (includeAttractions) {
        sources.push({
            url: buildAttractionsUrl(locationId),
            userData: { locationId, initialAttraction: true },
        });
    }

    return sources;
}

/**
 * @template {(...args: any) => any} T
 * @typedef {ReturnType<T> extends Promise<infer U> ? U : never} UnwrappedPromiseFn
 */

/**
 * @typedef {UnwrappedPromiseFn<typeof getClient>} Client
 */

/**
 * @param {Apify.Session} [session]
 */
async function getClient(session) {
    let securityToken;
    let cookies;

    /** @type {any} */
    let proxyUrl;

    const updateData = async (id = session?.id) => {
        // @ts-expect-error
        proxyUrl = global.PROXY?.newUrl(id ?? `${Math.round(Math.random() * 100000)}`);

        const response = await requestAsBrowser({
            url: 'https://www.tripadvisor.com/Hotels-g28953-New_York-Hotels.html',
            proxyUrl,
            // retries: 15,
        });

        const $ = cheerio.load(response.body);
        securityToken = getSecurityToken($);
        cookies = getCookies(response);
    };

    await updateData();

    if (!securityToken) {
        throw new Error('Missing securityToken. Retrying...');
    }

    log.debug('Security token and cookies', { securityToken, cookies });

    /**
     * * @param {{
     *  url: string,
     *  method?: 'POST' | 'GET',
     *  body?: Record<string, any>
     *  retries?: number
     * }} params
     */
    return async function req({ url, method = 'POST', body, retries = 0 }) {
        const res = await requestAsBrowser({
            url: `https://www.tripadvisor.com/data/graphql${url}`,
            method,
            headers: {
                'Content-Type': 'application/json',
                // only the presence of x-requested-by is checked, value is irrelevant
                'x-requested-by': '',
                referer: 'https://www.tripadvisor.com/',
                // works well without cookies
                // Cookie: cookies,
            },
            responseType: 'json',
            // eslint-disable-next-line no-nested-ternary
            body: (typeof body === 'string'
                ? body
                : body ? JSON.stringify(body) : undefined),
            proxyUrl,
            // retries: 15,
        });

        if (res.statusCode !== 200) {
            if ((res.statusCode === 403 && retries < 10) || retries < 5) {
                await sleep(1000);
                if (!session?.id) {
                    await updateData();
                }
                log.debug('Retrying', { status: res.statusCode, url });
                return req({
                    url,
                    method,
                    body,
                    // retries: retries + 1,
                });
            }
            session?.retire();
            throw new Error(`Status code ${res.statusCode}`);
        }

        return res.body;
    };
}

/**
 * @param {Record<string, any>} input
 */
function validateInput(input) {
    const {
        locationFullName,
        hotelId,
        restaurantId,
        includeRestaurants,
        includeHotels,
        includeReviews,
        lastReviewDate,
        includeAttractions,
        checkInDate,
        locationId,
    } = input;
    const getError = (/** @type {any} */ property, type = 'string') => new Error(`${property} should be a ${type}`);
    const checkStringProperty = (/** @type {any} */ property, /** @type {any} */ propertyName) => {
        if (property && typeof property !== 'string') {
            throw getError(propertyName);
        }
    };
    const checkBooleanProperty = (/** @type {any} */ property, /** @type {any} */ propertyName) => {
        if (property && typeof property !== 'boolean') {
            throw getError(propertyName, 'boolean');
        }
    };

    const checkDateFormat = (/** @type {moment.MomentInput | null} */ date, format = 'YYYY-MM-DD') => {
        if (moment(date, format).format(format) !== date) {
            throw new Error(`Date: ${date} should be in format ${format}`);
        }
    };

    // Check types
    // strings
    checkStringProperty(locationFullName, 'locationFullName');
    checkStringProperty(hotelId, 'hotelId');
    checkStringProperty(locationId, 'locationId');
    checkStringProperty(restaurantId, 'restaurantId');
    checkStringProperty(lastReviewDate, 'lasReviewData');

    // boleans
    checkBooleanProperty(includeRestaurants, 'includeRestaurants');
    checkBooleanProperty(includeHotels, 'includeHotels');
    checkBooleanProperty(includeReviews, 'includeReviews');
    checkBooleanProperty(includeAttractions, 'includeAttractions');

    // dates
    if (lastReviewDate) {
        checkDateFormat(lastReviewDate);
    }
    if (checkInDate) {
        checkDateFormat(checkInDate);
    }

    // Should have all required fields
    if (!locationFullName && !hotelId && !restaurantId && !locationId && !input.startUrls) {
        throw new Error('At least one of properties: locationFullName, hotelId, restaurantId, locationId should be set');
    }
    if (!includeHotels && !includeRestaurants && !includeAttractions && !input.startUrls) {
        throw new Error('At least one of properties: includeHotels or includeRestaurants should be true');
    }
    log.info('Input validation OK');
}

/**
 * @param {{
 *   locationId: string,
 *   session: Apify.Session
 * }} params
 */
async function getReviewTags({ locationId, session }) {
    /** @type {any[]} */
    const tags = [];
    let offset = 0;
    const limit = 20;
    while (true) {
        const data = await getReviewTagsForLocation({ locationId, session, limit, offset });
        offset += limit;
        tags.push(...data);
        if (data.length < limit) break;
    }

    return tags.filter((s) => s);
}

/**
 * Do a generic check when using Apify Proxy
 *
 * @typedef params
 * @property {any} [params.proxyConfig] Provided apify proxy configuration
 * @property {boolean} [params.required] Make the proxy usage required when running on the platform
 * @property {string[]} [params.blacklist] Blacklist of proxy groups, by default it's ['GOOGLE_SERP']
 * @property {boolean} [params.force] By default, it only do the checks on the platform. Force checking regardless where it's running
 * @property {string[]} [params.hint] Hint specific proxy groups that should be used, like SHADER or RESIDENTIAL
 *
 * @example
 *    const proxy = await proxyConfiguration({
 *       proxyConfig: input.proxy,
 *       blacklist: ['SHADER'],
 *       hint: ['RESIDENTIAL']
 *    });
 *
 * @param {params} params
 * @returns {Promise<Apify.ProxyConfiguration | undefined>}
 */
const proxyConfiguration = async ({
    proxyConfig,
    required = true,
    force = Apify.isAtHome(),
    blacklist = ['GOOGLESERP'],
}) => {
    const configuration = await Apify.createProxyConfiguration(proxyConfig);

    // this works for custom proxyUrls
    if (Apify.isAtHome() && required) {
        if (!configuration || (!configuration.usesApifyProxy && (!configuration.proxyUrls || !configuration.proxyUrls.length)) || !configuration.newUrl()) {
            throw new Error('\n=======\nYou must use Apify proxy or custom proxy URLs\n\n=======');
        }
    }

    // check when running on the platform by default
    if (force) {
        // only when actually using Apify proxy it needs to be checked for the groups
        if (configuration?.usesApifyProxy) {
            if (blacklist.some((blacklisted) => (configuration.groups || []).includes(blacklisted))) {
                throw new Error(`\n=======\nThese proxy groups cannot be used in this actor. Choose other group or contact support@apify.com to give you proxy trial:\n\n*  ${blacklist.join('\n*  ')}\n\n=======`);
            }
        }
    }

    return configuration;
};

module.exports = {
    resolveInBatches,
    getRequestListSources,
    buildStartRequests,
    buildSearchRequestsFromLocationName,
    getClient,
    randomDelay,
    validateInput,
    getReviewTags,
    getReviews,
    setState,
    getState,
    findLastReviewIndex: findLastReviewIndexByDate,
    proxyConfiguration,
    getLocationId,
};
