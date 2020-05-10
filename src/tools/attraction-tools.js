const Apify = require('apify');

const { utils: { log } } = Apify;
const { callForAttractionList, callForAttractionReview } = require('./api');
const { findLastReviewIndex } = require('./general');

async function getAttractions(locationId, session) {
    let attractions = [];
    let offset = 0;
    const limit = 20;
    const data = await callForAttractionList(locationId, session, limit);
    attractions = attractions.concat(data.data);
    if (data.paging && data.paging.next) {
        const totalResults = data.paging.total_results;
        const numberOfRuns = Math.ceil(totalResults / limit);
        log.info(`Going to process ${numberOfRuns} pages of attractions`);
        for (let i = 0; i <= numberOfRuns; i++) {
            offset += limit;
            const data2 = await callForAttractionList(locationId, session, limit, offset);
            attractions = attractions.concat(data2.data);
        }
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

async function getReviewsForAttraction(locationId) {
    const reviews = [];
    let offset = 0;
    const limit = 50;
    const data = await callForAttractionReview(locationId, limit);
    let { data: revs } = data;
    let lastIndex = findLastReviewIndex(revs, 'published_date');
    let shouldSlice = lastIndex >= 0;
    if (shouldSlice) {
        revs = revs.slice(0, lastIndex);
    }
    revs.forEach(review => reviews.push(processAttractionReview(review)));
    if (shouldSlice) return reviews;
    if (data.paging && data.paging.next) {
        const totalResults = data.paging.total_results;
        const numberOfRuns = Math.ceil(totalResults / limit);
        log.info(`Going to process ${numberOfRuns} pages of reviews`);
        for (let i = 0; i <= numberOfRuns; i++) {
            offset += limit;
            let { data: reviewsToPush } = await callForAttractionReview(locationId, limit, offset);
            lastIndex = findLastReviewIndex(reviewsToPush, 'published_date');
            shouldSlice = lastIndex >= 0;
            if (shouldSlice) {
                reviewsToPush = reviewsToPush.slice(0, lastIndex);
            }
            reviewsToPush.forEach(review => reviews.push(processAttractionReview(review)));
            if (shouldSlice) break;
        }
    }
    return reviews;
}

async function getAttractionDetail(attraction) {
    log.info(`Processing detail for ${attraction.name} attraction`);
    const locationId = attraction.location_id;
    let reviews = [];
    if (global.INCLUDE_REVIEWS) {
        try {
            reviews = await getReviewsForAttraction(locationId);
            log.info(`Got ${reviews.length} reviews for ${attraction.name}`);
        } catch (e) {
            log.error(`Could not get reviews for attraction ${attraction.name} due to ${e.message}`);
        }
    }

    attraction.reviews = reviews;
    return attraction;
}

async function processAttraction(attraction) {
    const attr = await getAttractionDetail(attraction);
    return Apify.pushData(attr);
}

module.exports = {
    processAttraction,
    getAttractions,
};
