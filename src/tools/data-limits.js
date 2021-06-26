/**
 * @typedef Config
 * @type {object}
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

const checkMaxItemsLimit = () => {
    if (config.maxItems !== 0 && savedItems >= config.maxItems) {
        log.warning('Reached maxItems limit!');
    }
};

const incrementSavedItems = () => {
    savedItems += 1;
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
