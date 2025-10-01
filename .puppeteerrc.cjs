const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
    // Skip Chromium download on npm install
    skipDownload: true,

    // Use system Chrome/Chromium from environment variable or default path
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',

    // Cache directory (not used since we skip download)
    cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};

