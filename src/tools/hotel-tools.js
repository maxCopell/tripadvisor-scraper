const Apify = require('apify');

const { utils: { log } } = Apify;
const general = require('./general');

const { getReviews, getReviewTags, randomDelay } = general;
const { getPlacePrices } = require('./api');
const { incrementSavedItems, checkMaxItemsLimit } = require('./data-limits');

/**
 *
 * @param {{
 *   placeInfo: unknown,
 *   client: general.Client,
 *   dataset?: Apify.Dataset,
 *   session: Apify.Session,
 * }} params
 */
async function processHotel({ placeInfo, client, dataset, session }) {
    const { location_id: id } = placeInfo;
    let reviews = [];
    const placePrices = {};

    try {
        // placePrices = await getPlacePrices({ placeId: id, delay: randomDelay, session });
    } catch (e) {
        log.warning('Hotels: Could not get place prices', { errorMessage: e });
    }

    if (global.INCLUDE_REVIEWS) {
        try {
            reviews = await getReviews({ placeId: id, client, session });
        } catch (e) {
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
    };
    if (global.INCLUDE_REVIEW_TAGS) {
        const tags = await getReviewTags({ locationId: id, session });
        place.reviewTags = tags;
    }
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
