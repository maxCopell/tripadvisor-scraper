const Apify = require('apify');
const { incrementSavedItems, checkMaxItemsLimit, getConfig } = require('./data-limits');

const { utils: { log } } = Apify;
const { callForAttractionList, callForAttractionReview } = require('./api');
const { findLastReviewIndex, getState, setState } = require('./general');

/**
 * @param {{
 *   locationId: string,
 *   session: Apify.Session,
 * }} params
 */
async function getAttractions({ locationId, session }) {
    let offset = 0;
    const limit = 200;
    let attractionsCount = 0;

    const { paging: { total_results: totalResults } } = await callForAttractionList({ locationId, session, limit: 1, offset });
    log.info(`Found ${totalResults} attractions for the location id ${locationId}`);

    const state = getState();
    let attractions = state[`attractions-${locationId}`] || [];

    let hasReachedLimit = false;
    while (!hasReachedLimit) {
        log.debug(`Going to process offset ${offset} for attractions ${locationId}`);
        const { data, paging: { next } } = await callForAttractionList({ locationId, session, limit, offset });
        offset += limit;
        attractionsCount += data.length;

        attractions = [...attractions, ...data];
        setState({ ...getState(), [`attractions-${locationId}`]: attractions });
        if (!next || attractionsCount >= Number(totalResults) || checkMaxItemsLimit(attractionsCount)) {
            hasReachedLimit = true;
        }
    }

    setState({ ...getState(), [`attractions-${locationId}`]: undefined });
    return attractions;
}

function processAttractionReview(review) {
    const {
        lang,
        text,
        published_date: publishedDate,
        rating,
        travel_date: travelDate,
        user,
        title,
        machine_translated: machineTranslated,
        subratings,
    } = review;

    return {
        language: lang,
        title,
        text,
        publishedDate,
        rating,
        travelDate,
        user: {
            username: user.username,
            helpfulVotes: user.helpful_votes,

        },
        subratings,
        machineTranslated,
    };
}

/**
 * @param {{
 *   locationId: string,
 *   session: Apify.Session,
 * }} params
 */
async function getReviewsForAttraction({ locationId, session }) {
    /** @type {any[]} */
    const reviews = [];
    let offset = 0;
    const limit = 10;

    const { maxReviews } = getConfig();

    while (true) {
        log.debug(`Going to process offset ${offset} review for location ${locationId}`);
        let revs = await callForAttractionReview({ locationId, session, limit, offset });
        offset += limit;
        const lastIndex = findLastReviewIndex({ reviews: revs, dateKey: 'published_date' });
        const shouldSlice = lastIndex >= 0;

        if (shouldSlice) {
            revs = revs.slice(0, lastIndex);
        }

        revs.forEach((review) => reviews.push(processAttractionReview(review)));

        if (!revs.length || revs < limit || shouldSlice || reviews.length >= maxReviews) break;
    }

    if (reviews.length > maxReviews) {
        return reviews.slice(0, maxReviews);
    }

    return reviews;
}

/**
 * @param {{
 *   attraction: unknown,
 *   session: Apify.Session,
 * }} params
 */
async function getAttractionDetail({ attraction, session }) {
    log.info(`Processing detail for ${attraction.name} attraction`);
    const locationId = attraction.location_id;
    let reviews = [];
    if (global.INCLUDE_REVIEWS) {
        try {
            reviews = await getReviewsForAttraction({ locationId, session });
            log.info(`Got ${reviews.length} reviews for ${attraction.name}`);
        } catch (e) {
            log.exception(e, `Could not get reviews for attraction ${attraction.name}`);
        }
    }

    attraction.reviews = reviews;
    return { type: 'ATTRACTION', ...attraction };
}

/**
 * @param {{
 *   attraction: unknown,
 *   session: Apify.Session,
 * }} params
 */
async function processAttraction({ attraction, session }) {
    const attr = await getAttractionDetail({ attraction, session });
    if (!checkMaxItemsLimit() && attr) {
        await Apify.pushData(attr);
        incrementSavedItems();
    }
}

module.exports = {
    processAttraction,
    getAttractions,
};
