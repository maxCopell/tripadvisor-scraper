const Apify = require('apify');
const { incrementSavedItems, checkMaxItemsLimit } = require('./data-limits');

const { utils: { log } } = Apify;
const { callForAttractionList, callForAttractionReview } = require('./api');
const { findLastReviewIndex } = require('./general');

/**
 * @param {{
 *   locationId: string,
 *   session: Apify.Session,
 * }} params
 */
async function getAttractions({ locationId, session }) {
    /** @type {any[]} */
    const attractions = [];
    let offset = 0;
    const limit = 20;

    while (true) {
        log.debug(`Going to process offset ${offset} for attractions ${locationId}`);
        const data = await callForAttractionList({ locationId, session, limit, offset });
        offset += limit;
        attractions.push(...data);

        if (data.length < limit) break;
    }
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

        if (!revs.length || revs < limit || shouldSlice) break;
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
    return attraction;
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
