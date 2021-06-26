const Apify = require('apify');
const cheerio = require('cheerio');
const moment = require('moment');

const {
    callForReview,
    buildHotelUrl,
    buildRestaurantUrl,
    buildAttractionsUrl,
    getReviewTagsForLocation,
} = require('./api');
const { getConfig } = require('./data-limits');

const { log, requestAsBrowser } = Apify.utils;

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
    let sessionCookie = null;
    let taudCookie = null;
    response.headers['set-cookie'].forEach((d) => {
        if (d.includes('TASession')) {
            [sessionCookie] = d.split(';');
        }
        if (d.includes('TAUD')) {
            [taudCookie] = d.split(';');
        }
    });
    return `${sessionCookie}; ${taudCookie}`;
}

async function resolveInBatches(promiseArray, batchLength = 10) {
    const promises = [];
    for (const promise of promiseArray) {
        if (typeof promise === 'function') {
            promises.push(promise());
        } else {
            promises.push(promise);
        }
        if (promises.length % batchLength === 0) await Promise.all(promises);
    }
    return Promise.all(promises);
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

function findLastReviewIndexByDate(reviews, dateKey) {
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

async function getReviews(id, client, expected) {
    const result = [];
    let offset = 0;
    const limit = 20;
    let numberOfFetches = 0;
    const { maxReviews } = getConfig();
    {
        const resp = await callForReview(id, client, offset, limit);
        const { errors } = resp ?? {};

        if (errors) {
            log.error('Graphql error', { errors });
        }

        if (!resp?.data?.locations?.length) {
            throw new Error('Missing locations');
        }

        const reviewData = resp?.data?.locations[0]?.reviewListPage || {};
        const { totalCount } = reviewData;
        let { reviews = [] } = reviewData;
        const lastIndexByDate = findLastReviewIndexByDate(reviews);
        const lastIndexByReviewsLimit = maxReviews > 0 ? maxReviews : -1;
        const smallestIndex = getSmallestIndexGreaterThanEqualZero(lastIndexByDate, lastIndexByReviewsLimit);
        const shouldSlice = smallestIndex >= 0;
        if (shouldSlice) {
            reviews = reviews.slice(0, smallestIndex);
        }

        const numberOfReviews = (smallestIndex === -1 || totalCount < smallestIndex) ? totalCount : smallestIndex;

        log.info(`Going to process ${numberOfReviews} reviews`);

        numberOfFetches = Math.ceil(numberOfReviews / limit);

        log.debug('params', { smallestIndex, numberOfFetches, totalCount });

        if (reviews.length >= 1) {
            reviews.forEach((review) => result.push(processReview(review)));
        }

        if (shouldSlice) return result;
    }

    let response;

    try {
        for (let i = 1; i < numberOfFetches; i++) {
            offset += limit;
            response = await callForReview(id, client, offset, limit);

            if (!response?.data?.locations?.length) {
                throw new Error(`Empty locations`);
            }

            const reviewData = response.data?.locations?.[0]?.reviewListPage ?? {};
            let { reviews = [] } = reviewData;
            const lastIndexByDate = findLastReviewIndexByDate(reviews);
            const lastIndexByReviewsLimit = maxReviews > 0 ? maxReviews - offset : -1;
            const smallestIndex = getSmallestIndexGreaterThanEqualZero(lastIndexByDate, lastIndexByReviewsLimit);
            const shouldSlice = smallestIndex >= 0;
            if (shouldSlice) {
                reviews = reviews.slice(0, smallestIndex);
            }
            reviews.forEach((review) => result.push(processReview(review)));
            if (shouldSlice) break;
            await Apify.utils.sleep(300);
        }
    } catch (e) {
        log.exception(e, 'Could not make additional requests');
    }
    return result;
}

function getSmallestIndexGreaterThanEqualZero(indexA, indexB) {
    if (indexA >= 0 && indexB < 0) {
        return indexA;
    }
    if (indexB >= 0 && indexA < 0) {
        return indexB;
    }
    if (indexA >= 0 && indexB >= 0) {
        return indexB > indexA ? indexB : indexA;
    }
    return -1;
}

function getRequestListSources(locationId, includeHotels, includeRestaurants, includeAttractions) {
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

async function getClient(session) {
    const proxyUrl = global.PROXY?.newUrl(session.id);
    const response = await requestAsBrowser({
        url: 'https://www.tripadvisor.com/Hotels-g28953-New_York-Hotels.html',
        proxyUrl,
    });

    const $ = cheerio.load(response.body);
    const securityToken = getSecurityToken($);
    const cookies = getCookies(response);

    // console.log({ securityToken, cookies });

    return async ({ url, method = 'POST', payload }) => {
        const res = await requestAsBrowser({
            url: `https://www.tripadvisor.com/data/graphql${url}`,
            method,
            headers: {
                'Content-Type': 'application/json',
                'x-requested-by': securityToken,
                Cookie: cookies,
            },
            json: true,
            payload,
            abortFunction: () => false,
            proxyUrl,
        });

        if (res.statusCode !== 200) {
            session?.retire();
            throw new Error(`Status code ${res.statusCode}`);
        }

        return res.body;
    };
}

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

async function getReviewTags(locationId) {
    let tags = [];
    let offset = 0;
    const limit = 20;
    const data = await getReviewTagsForLocation(locationId, limit);
    tags = tags.concat(data);
    if (data.paging && data.paging.next) {
        const totalResults = data.paging.total_results;
        const numberOfRuns = Math.ceil(totalResults / limit);
        log.info(`Going to process ${numberOfRuns} pages of ReviewTags, ${data.paging}`);
        for (let i = 0; i <= numberOfRuns; i++) {
            offset += limit;
            const data2 = await getReviewTagsForLocation(locationId, limit, offset);
            tags = tags.concat(data2);
        }
    }
    return tags;
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
};
