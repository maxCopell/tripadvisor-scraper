const Apify = require('apify');
const cheerio = require('cheerio');
const moment = require('moment');

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

function randomDelay(minimum = 200, maximum = 600) {
    const min = Math.ceil(minimum);
    const max = Math.floor(maximum);
    return Apify.utils.sleep(Math.floor(Math.random() * (max - min + 1)) + min);
}

function getSecurityToken($) {
    let securityToken = null;
    $('head script').each((index, element) => {
        if ($(element).get()[0].children[0] && $(element).get()[0].children[0].data.includes("define('page-model', [], function() { return ")) {
            let scriptText = $(element).get()[0].children[0].data;
            scriptText = scriptText.replace("define('page-model', [], function() { return ", '');
            scriptText = scriptText.replace('; });', '');
            const scriptObject = JSON.parse(scriptText);
            securityToken = scriptObject.JS_SECURITY_TOKEN;
        }
    });
    return securityToken;
}

function getCookies(response) {
    return (response?.headers?.['set-cookie'] ?? []).map((d) => {
        const cookie = d.split(';');

        if (cookie.includes('TASession') || cookie.includes('TAUD')) {
            return cookie[0];
        }
    }).filter((s) => s).join('; ');
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

const processReview = (review, remoteId) => {
    const { text, title, rating, tripInfo, publishedDate, userProfile, photos } = review;
    const stayDate = tripInfo ? tripInfo.stayDate : null;
    let userLocation = null;
    let userContributions = null;
    let userName = null;
    const imageUrls = [];

    log.debug(`Processing review: ${title}`);
    if (userProfile) {
        const { hometown, contributionCounts = {}, username } = userProfile;
        const { sumReview } = contributionCounts;
        userContributions = sumReview;
        userLocation = hometown.fallbackString;
        userName = username;

        if (hometown.location) {
            userLocation = hometown.location.additionalNames.long;
        }
    }

    if (photos && photos.length > 0) {
        for (const photo of photos) {
            const { photoSizes } = photo;
            const photoUrl = photoSizes[photoSizes.length - 1].url;
            imageUrls.push(photoUrl);
        }
    }

    return {
        text,
        title,
        rating,
        stayDate,
        publishedDate,
        userLocation,
        userContributions,
        remoteId,
        userName,
        imageUrls,
    };
};

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
        const userMaxDate = moment(global.LAST_REVIEW_DATE);
        return rDate.isBefore(userMaxDate);
    });
}

/**
 *
 * @param {{
 *   placeId: string,
 *   client: Client,
 * }} params
 */
async function getReviews({ placeId, client }) {
    /** @type {any[]} */
    const result = [];
    let offset = 0;
    const limit = 20;
    const { maxReviews } = getConfig();

    while (true) {
        const resp = await callForReview({ placeId, client, offset, limit });
        const { errors } = resp ?? {};

        if (errors) {
            log.error('Graphql error', { errors });
        }

        if (!resp?.data?.locations?.length) {
            throw new Error('Missing locations');
        }

        offset += limit;

        const reviewData = resp?.data?.locations[0]?.reviewListPage || {};

        const { totalCount } = reviewData;
        let { reviews = [] } = reviewData;
        const lastIndexByDate = findLastReviewIndexByDate({ reviews, dateKey: 'publishedDate' });
        const lastIndexByReviewsLimit = maxReviews > 0 ? maxReviews : -1;
        const smallestIndex = getSmallestIndexGreaterThanEqualZero(lastIndexByDate, lastIndexByReviewsLimit);
        const shouldSlice = smallestIndex >= 0;
        if (shouldSlice) {
            reviews = reviews.slice(0, smallestIndex);
        }

        const numberOfReviews = (smallestIndex === -1 || totalCount < smallestIndex) ? totalCount : smallestIndex;

        log.info(`Going to process ${numberOfReviews} reviews`);
        log.debug('params', { smallestIndex, offset, totalCount });

        if (reviews.length >= 1) {
            reviews.forEach((review) => result.push(processReview(review)));
        }

        if (reviews.length < limit || result.length >= maxReviews || shouldSlice) break;
    }

    return result;
}

/**
 * @param {number} indexA
 * @param {number} indexB
 */
function getSmallestIndexGreaterThanEqualZero(indexA, indexB) {
    if (+indexA >= 0 && +indexB < 0) {
        return +indexA;
    }
    if (+indexB >= 0 && +indexA < 0) {
        return +indexB;
    }
    if (+indexA >= 0 && +indexB >= 0) {
        return +indexB > +indexA ? +indexB : +indexA;
    }
    return -1;
}

/**
 * @param {any} param0
 */
function getRequestListSources({ locationId, includeHotels = true, includeRestaurants = true, includeAttractions = false }) {
    const sources = [];
    if (includeHotels) {
        sources.push({
            url: buildHotelUrl(locationId),
            userData: { initialHotel: true },
        });
    }
    if (includeRestaurants) {
        sources.push({
            url: buildRestaurantUrl(locationId),
            userData: { initialRestaurant: true },
        });
    }
    if (includeAttractions) {
        sources.push({
            url: buildAttractionsUrl(locationId),
            userData: {
                initialAttraction: true,
            },
        });
    }
    console.log(sources);
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
    let proxyUrl;

    const updateData = async (id = session?.id) => {
        proxyUrl = global.PROXY?.newUrl(id ?? `${Math.round(Math.random() * 100000)}`);

        const response = await requestAsBrowser({
            url: 'https://www.tripadvisor.com/Hotels-g28953-New_York-Hotels.html',
            proxyUrl,
            retries: 5,
        });

        const $ = cheerio.load(response.body);
        securityToken = getSecurityToken($);
        cookies = getCookies(response);
    };

    await updateData();

    if (!securityToken) {
        throw new Error('Missing securityToken');
    }

    // console.log({ securityToken, cookies });

    /**
     * @param {{
     *  url: string,
     *  method?: 'POST' | 'GET',
     *  payload?: Record<string, any>
     *  retries?: number
     * }} params
     */
    return async function req({ url, method = 'POST', payload, retries = 0 }) {
        const res = await requestAsBrowser({
            url: `https://www.tripadvisor.com/data/graphql${url}`,
            method,
            headers: {
                'Content-Type': 'application/json',
                'x-requested-by': securityToken,
                Cookie: cookies,
            },
            json: true,
            // eslint-disable-next-line no-nested-ternary
            payload: (typeof payload === 'string'
                ? payload
                : payload ? JSON.stringify(payload) : undefined),
            abortFunction: () => false,
            proxyUrl,
        });

        if (res.statusCode !== 200) {
            if ((res.statusCode === 403 && retries < 10) || retries < 3) {
                await sleep(1000);
                if (!session?.id) {
                    await updateData();
                }
                log.debug('Retrying', { status: res.statusCode, url });
                return req({ url, method, payload, retries: retries + 1 });
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
    const getError = (property, type = 'string') => new Error(`${property} should be a ${type}`);
    const checkStringProperty = (property, propertyName) => {
        if (property && typeof property !== 'string') {
            throw getError(propertyName);
        }
    };
    const checkBooleanProperty = (property, propertyName) => {
        if (property && typeof property !== 'boolean') {
            throw getError(propertyName, 'boolean');
        }
    };

    const checkDateFormat = (date, format = 'YYYY-MM-DD') => {
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
    if (!locationFullName && !hotelId && !restaurantId && !locationId) {
        throw new Error('At least one of properties: locationFullName, hotelId, restaurantId, locationId should be set');
    }
    if (!includeHotels && !includeRestaurants && !includeAttractions) {
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
 * @returns {Promise<Apify.ProxyConfiguration>}
 */
const proxyConfiguration = async ({
    proxyConfig,
    required = true,
    force = Apify.isAtHome(),
    blacklist = ['GOOGLESERP'],
    hint = [],
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

            // specific non-automatic proxy groups like RESIDENTIAL, not an error, just a hint
            if (hint.length && !hint.some((group) => (configuration.groups || []).includes(group))) {
                Apify.utils.log.info(`\n=======\nYou can pick specific proxy groups for better experience:\n\n*  ${hint.join('\n*  ')}\n\n=======`);
            }
        }
    }

    return configuration;
};

module.exports = {
    resolveInBatches,
    getRequestListSources,
    getClient,
    randomDelay,
    validateInput,
    getReviewTags,
    getReviews,
    findLastReviewIndex: findLastReviewIndexByDate,
    proxyConfiguration,
    getLocationId,
};
