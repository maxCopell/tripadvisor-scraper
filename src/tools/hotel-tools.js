const Apify = require('apify');

const { utils: { log } } = Apify;
const { getReviews, getReviewTags, randomDelay } = require('./general');
const { getPlacePrices } = require('./api');

async function processHotel(placeInfo, client, dataset) {
    const { location_id: id } = placeInfo;
    let reviews = [];
    let placePrices;

    try {
      //  placePrices = await getPlacePrices(id, randomDelay);
    } catch (e) {
        log.warning('Hotels: Could not get place prices', { errorMessage: e });
    }

    if (global.INCLUDE_REVIEWS) {
        try {
            reviews = await getReviews(id, client);
        } catch (e) {
            log.error('Could not get reviews', e);
        }
    }

    if (!placeInfo) {
        return;
    }
    const prices = placePrices ? placePrices.offers.map(offer => ({
        provider: offer.provider_display_name,
        price: offer.display_price_int ? offer.display_price_int : 'NOT_PROVIDED',
        isBookable: offer.is_bookable,
        link: offer.link,
    })) : [];

    const place = {
        id: placeInfo.location_id,
        type: 'HOTEL',
        name: placeInfo.name,
        awards: placeInfo.awards && placeInfo.awards.map(award => ({ year: award.year, name: award.display_name })),
        rankingPosition: placeInfo.ranking_position,
        priceLevel: placeInfo.price_level,
        category: placeInfo.ranking_category,
        rating: placeInfo.rating,
        hotelClass: placeInfo.hotel_class,
        hotelClassAttribution: placeInfo.hotel_class_attribution,
        phone: placeInfo.phone,
        address: placeInfo.address,
        email: placeInfo.email,
        amenities: placeInfo.amenities && placeInfo.amenities.map(amenity => amenity.name),
        prices,
        latitude: placeInfo.latitude,
        longitude: placeInfo.longitude,
        webUrl: placeInfo.web_url,
        website: placeInfo.website,
        rankingString: placeInfo.ranking,
        numberOfReviews: placeInfo.num_reviews,
        rankingDenominator: placeInfo.ranking_denominator,
        reviews,
    };
    if (global.INCLUDE_REVIEW_TAGS) {
        const tags = await getReviewTags(id);
        place.reviewTags = tags;
    }
    log.debug('Data for hotel: ', place);
    if (dataset) {
        await dataset.pushData(place);
    } else {
        await Apify.setValue('OUTPUT', JSON.stringify(place), { contentType: 'application/json' });
    }
}

module.exports = {
    processHotel,
};
