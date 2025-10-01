# Deployment Guide for QR Code PDF Generation

## Chrome/Chromium Installation for Production

This application uses Puppeteer to generate QR code PDFs. It requires Chrome or Chromium browser to be installed on the server.

### For Render.com (Recommended):

**✅ All files are already configured!**

1. The `render.yaml` has the correct build command to install Chrome
2. The `.puppeteerrc.cjs` configures Puppeteer cache directory
3. The controller auto-detects Chrome location

**Steps to Deploy:**
1. Push your code to GitHub
2. Connect your repo to Render
3. Render will automatically:
   - Run `npm ci`
   - Install Chrome via `npx puppeteer browsers install chrome`
   - Build the application
   - Chrome will be available in Puppeteer's cache

**Build Command (already in render.yaml):**
```bash
npm ci
npx puppeteer browsers install chrome
npm run build
```

### For Docker Deployment:

Use the provided `Dockerfile` which installs Chrome:
```bash
docker build -t gomotor-backend .
docker run -p 8080:8080 gomotor-backend
```

### For Ubuntu/Debian Servers:

**Option 1: Use Puppeteer's Chrome (Recommended - Easiest)**
```bash
# Install dependencies and Chrome
npm ci
npx puppeteer browsers install chrome

# Build and run
npm run build
npm run serve
```

**Option 2: Install System Chromium**
```bash
# Install Chromium
sudo apt-get update
sudo apt-get install -y chromium-browser

# Set environment variable to use system Chromium
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install dependencies and run
npm ci
npm run build
npm run serve
```

**Option 3: Install Google Chrome**
```bash
# Install Chrome
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
sudo apt-get update
sudo apt-get install -y google-chrome-stable

# Set environment variable
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Install and run
npm ci
npm run build
npm run serve
```

### For Other Hosting Services (Heroku, Railway, etc.):

**Option 1: Use Puppeteer's Chrome (Recommended)**
1. Add to your build command:
   ```bash
   npm ci && npx puppeteer browsers install chrome && npm run build
   ```
2. No environment variables needed
3. Deploy your code

**Option 2: Use System Chrome**
1. Add Chromium buildpack or install via package manager
2. Set environment variable: `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`
3. Deploy your code

## Troubleshooting

### PDF Generation Fails (503 Error)

**Error:** "Could not find Chrome" or "Chrome browser not available"

**Solutions:**

1. **Verify Chromium is installed:**
   ```bash
   which chromium-browser
   # or
   which google-chrome-stable
   ```

2. **Check environment variable:**
   ```bash
   echo $PUPPETEER_EXECUTABLE_PATH
   ```

3. **Test Chromium manually:**
   ```bash
   chromium-browser --version
   ```

4. **Render.com specific:**
   - Check build logs show "Installing @puppeteer/browsers"
   - Verify Chrome was downloaded during build
   - Check for "Found Chrome/Chromium at:" or "Puppeteer will use its own installed Chrome" in logs

### Build Takes Too Long

The build includes Chrome installation (~100MB download). This is normal and takes 1-3 minutes. Subsequent builds on Render may be faster if cache is preserved.

### Memory Issues

If you see "Target closed" errors:
- Puppeteer is configured with proper timeouts (120s)
- Uses `--disable-dev-shm-usage` flag for low-memory environments
- If issues persist, consider limiting QR codes per PDF (already set to 100 for ranges)

## What Changed (Latest Update)

**New Configuration (Production-Ready):**
- ✅ Uses Puppeteer's own Chrome installation (most reliable)
- ✅ Auto-installs Chrome during build via `npx puppeteer browsers install chrome`
- ✅ Smart path detection (tries env var → system paths → Puppeteer's Chrome)
- ✅ Works on all platforms (Render, Docker, Ubuntu, etc.)
- ✅ Proper error handling with fallback to text format

**Files Added/Updated:**
- `.puppeteerrc.cjs` - Configures Puppeteer cache directory
- `render.yaml` - Includes Chrome installation in build command
- `qrcode.controller.js` - Smart Chrome path detection with fallbacks
- `DEPLOYMENT.md` - Complete deployment guide
