const API_RESULTS_PER_PAGE = 50;

/**
 * Matches placeId from the following url format:
 * https://www.tripadvisor.com/Hotel_Review-g295424-d21321279-Reviews-Sofitel_Dubai_the_Obelisk-Dubai_Emirate_of_Dubai.html
 * The example hotel id: 21321279
 */
const ID_REGEX = /-d([\d]+)/gi;

/**
 * Matches search query from the following url format:
 * https://www.tripadvisor.com/Search?q=new%20york&searchSessionId=...
 * The example search query: new%20york
 */
const SEARCH_QUERY_REGEX = /\?q=([^&]+)&/gi;

const FREE_ACTOR_LIMITS = {
    MAX_ITEMS: 100,
    MAX_REVIEWS: 20,
};

const REVIEWS_LIMIT = 20;

module.exports = {
    API_RESULTS_PER_PAGE,
    ID_REGEX,
    SEARCH_QUERY_REGEX,
    FREE_ACTOR_LIMITS,
    REVIEWS_LIMIT,
};
