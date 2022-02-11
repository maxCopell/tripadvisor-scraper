/**
 * @typedef HotelPlaceInfo
 * @type {object}
 * @property {string} location_id
 * @property {string} name
 * @property {{ year: string, display_name: string }[] | null} awards
 * @property {string} ranking_position
 * @property {string} price_level
 * @property {string} price_range
 * @property {string} category
 * @property {string} rating
 * @property {string} hotel_class
 * @property {string} price
 * @property {string} ranking_category
 * @property {string} phone
 * @property {string} address
 * @property {string} email
 * @property {string} hotel_class_attribution
 * @property {string} latitude
 * @property {string} longitude
 * @property {string} web_url
 * @property {string} website
 * @property {string} ranking
 * @property {string} ranking_denominator
 * @property {string} num_reviews
 * @property {{ name: string }[] | null} amenities
 */

const Apify = require('apify');

const { utils: { log } } = Apify;
const general = require('./general');

const { getReviews, getReviewTags } = general;
const { incrementSavedItems, checkMaxItemsLimit } = require('./data-limits');

/**
 *
 * @param {{
 *   placeInfo: HotelPlaceInfo,
 *   client: general.Client,
 *   dataset?: Apify.Dataset,
 *   session: Apify.Session,
 * }} params
 * @returns
 */
async function processHotel({ placeInfo, client, dataset, session }) {
    const { location_id: id } = placeInfo;
    let reviews = [];

    /** @type {{ offers?: any[] }} */
    const placePrices = {};

    try {
        // placePrices = await getPlacePrices({ placeId: id, delay: randomDelay, session });
    } catch (e) {
        log.warning('Hotels: Could not get place prices', { errorMessage: e });
    }

    // @ts-expect-error
    if (global.INCLUDE_REVIEWS) {
        try {
            reviews = await getReviews({ placeId: id, client, session });
        } catch (/** @type {any} */ e) {
            log.exception(e, 'Could not get reviews');
            throw e;
        }
    }

    if (!placeInfo) {
        return;
    }

    const prices = placePrices?.offers?.map((offer) => ({
        provider: offer.provider_display_name,
        price: offer.display_price_int ? offer.display_price_int : 'NOT_PROVIDED',
        isBookable: offer.is_bookable,
        link: offer.link,
    })) ?? [];

    // @ts-expect-error
    const reviewTagsWrapper = global.INCLUDE_REVIEW_TAGS
        ? { reviewTags: await getReviewTags({ locationId: id, session }) }
        : {};

    const place = {
        id: placeInfo.location_id,
        type: 'HOTEL',
        name: placeInfo.name,
        awards: placeInfo.awards?.map((award) => ({ year: award.year, name: award.display_name })) ?? [],
        rankingPosition: placeInfo.ranking_position,
        priceLevel: placeInfo.price_level,
        priceRange: placeInfo.price,
        category: placeInfo.ranking_category,
        rating: placeInfo.rating,
        hotelClass: placeInfo.hotel_class,
        hotelClassAttribution: placeInfo.hotel_class_attribution,
        phone: placeInfo.phone,
        address: placeInfo.address,
        email: placeInfo.email,
        amenities: placeInfo.amenities?.map((amenity) => amenity.name) ?? [],
        prices,
        latitude: placeInfo.latitude,
        longitude: placeInfo.longitude,
        webUrl: placeInfo.web_url,
        website: placeInfo.website,
        rankingString: placeInfo.ranking,
        rankingDenominator: placeInfo.ranking_denominator,
        numberOfReviews: placeInfo.num_reviews,
        reviewsCount: reviews.length,
        reviews,
        ...reviewTagsWrapper,
    };

    log.debug(`Data for hotel: ${place.name}`);
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
    processHotel,
};
