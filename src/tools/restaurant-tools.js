const Apify = require('apify');
const { incrementSavedItems, checkMaxItemsLimit } = require('./data-limits');

const { utils: { log } } = Apify;
const general = require('./general');

const { getReviews, getReviewTags } = general;

/**
 * @param {any} placeInfo
 */
function getHours(placeInfo) {
    /**
     * @type {any[]}
     */
    const placeHolder = [];

    if (!placeInfo.hours) {
        return placeHolder;
    }

    if (!placeInfo.hours.week_ranges) {
        return placeHolder;
    }

    return placeInfo?.hours?.week_ranges?.map((wR) => wR.map((day) => ({ open: day.open_time, close: day.close_time }))) ?? placeHolder;
}

/**
 *
 * @param {{
 *   placeInfo: unknown,
 *   client: general.Client,
 *   dataset?: Apify.Dataset
 *   session: Apify.Session
 * }} params
 */
async function processRestaurant({ placeInfo, client, dataset, session }) {
    const { location_id: id } = placeInfo;
    let reviews = [];

    if (!placeInfo) {
        return;
    }

    if (global.INCLUDE_REVIEWS) {
        reviews = await getReviews({ placeId: id, client, session });
    }

    const place = {
        id: placeInfo.location_id,
        type: 'RESTAURANT',
        name: placeInfo.name,
        awards: placeInfo.awards?.map((award) => ({ year: award.year, name: award.display_name })) ?? [],
        rankingPosition: placeInfo.ranking_position,
        priceLevel: placeInfo.price_level,
        category: placeInfo.ranking_category,
        rating: placeInfo.rating,
        isClosed: placeInfo.is_closed,
        isLongClosed: placeInfo.is_long_closed,
        phone: placeInfo.phone,
        address: placeInfo.address,
        email: placeInfo.email,
        cuisine: placeInfo.cuisine?.map((cuisine) => cuisine.name) ?? [],
        mealTypes: placeInfo.mealTypes?.map((m) => m.name) ?? [],
        hours: getHours(placeInfo),
        latitude: placeInfo.latitude,
        longitude: placeInfo.longitude,
        webUrl: placeInfo.web_url,
        website: placeInfo.website,
        rankingDenominator: placeInfo.ranking_denominator,
        rankingString: placeInfo.ranking,
        numberOfReviews: placeInfo.num_reviews,
        reviewsCount: reviews.length,
        reviews,
    };
    if (global.INCLUDE_REVIEW_TAGS) {
        place.reviewTags = await getReviewTags({ locationId: id, session });
    }
    log.debug(`Saved data restaurant: ${place.name}`);

    if (dataset) {
        if (!checkMaxItemsLimit()) {
            await dataset.pushData(place);
            incrementSavedItems();
        }
    } else {
        await Apify.setValue('OUTPUT', JSON.stringify(place), { contentType: 'application/json' });
    }
}

module.exports = {
    processRestaurant,
};
