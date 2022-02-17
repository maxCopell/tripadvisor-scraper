/**
 * @typedef Config
 * @type {Record<string, number>}
 * @property {number} maxItems
 * @property {number} maxReviews
 */

const Apify = require('apify');

const { log } = Apify.utils;

/**
 * @type {Config}
 */
const config = {
    maxItems: 0,
    maxReviews: 0,
};

let savedItems = 0;

const checkMaxItemsLimit = (increment = 0) => {
    if (config.maxItems !== 0 && savedItems + increment >= config.maxItems) {
        log.debug('Reached maxItems limit!', { savedItems, ...config });
        return true;
    }

    return false;
};

const incrementSavedItems = (count = 1) => {
    savedItems += count;
    log.debug('Saving:', { savedItems, maxItems: config.maxItems });
};

/**
 *
 * @param {Config} newConfig
 */
const setConfig = (newConfig) => {
    Object.keys(config).forEach((key) => {
        if (newConfig[key]) {
            config[key] = newConfig[key];
        }
    });
};

/**
 *
 * @returns {Config}
 */
const getConfig = () => {
    return config;
};

module.exports = {
    getConfig,
    setConfig,
    incrementSavedItems,
    checkMaxItemsLimit,
};
