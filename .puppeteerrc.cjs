const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
    // Allow Puppeteer to download Chrome during build
    skipDownload: false,

    // Cache directory for Puppeteer's Chrome
    cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};

