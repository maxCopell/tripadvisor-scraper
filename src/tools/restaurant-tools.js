/**
 * @typedef RestaurantPlaceInfo
 * @type {object}
 * @property {string} location_id
 * @property {string} name
 * @property {{ year: string, display_name: string }[] | null} awards
 * @property {string} ranking_position
 * @property {string} price_level
 * @property {string} price_range
 * @property {string} category
 * @property {string} rating
 * @property {string} price
 * @property {string} ranking_category
 * @property {string} phone
 * @property {string} address
 * @property {string} email
 * @property {string} latitude
 * @property {string} longitude
 * @property {string} web_url
 * @property {string} website
 * @property {string} ranking
 * @property {string} ranking_denominator
 * @property {string} num_reviews
 * @property {boolean} is_closed
 * @property {boolean} is_long_closed
 * @property {{ name: string }[] | null} cuisine
 * @property {{ name: string }[] | null} mealTypes
 */

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

    return placeInfo?.hours?.week_ranges?.map(
        (/** @type {any[]} */ weekRange) => weekRange.map(
            (day) => ({ open: day.open_time, close: day.close_time }),
        ),
    ) ?? placeHolder;
}

/**
 *
 * @param {{
 *   placeInfo: RestaurantPlaceInfo,
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

    // @ts-expect-error
    if (global.INCLUDE_REVIEWS) {
        reviews = await getReviews({ placeId: id, client, session });
    }

    // @ts-expect-error
    const reviewTagsWrapper = global.INCLUDE_REVIEW_TAGS
        ? { reviewTags: await getReviewTags({ locationId: id, session }) }
        : {};

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
        ...reviewTagsWrapper,
    };

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
