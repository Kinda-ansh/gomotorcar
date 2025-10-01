# Deployment Guide for QR Code PDF Generation

## Chrome/Chromium Installation for Production

This application uses Puppeteer to generate QR code PDFs. It requires Chrome or Chromium browser to be installed on the server.

### For Render.com (Recommended):

**✅ All files are already configured!**

1. The `Aptfile` will automatically install Chromium
2. The `render.yaml` has the correct environment variables
3. The `.puppeteerrc.cjs` configures Puppeteer to use system Chromium

**Steps to Deploy:**
1. Push your code to GitHub
2. Connect your repo to Render
3. Render will automatically:
   - Install Chromium from `Aptfile`
   - Set `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`
   - Skip Puppeteer's Chrome download (saves build time)
   - Run `npm ci && npm run build`

**Environment Variables (already in render.yaml):**
```yaml
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### For Docker Deployment:

Use the provided `Dockerfile` which installs Chrome:
```bash
docker build -t gomotor-backend .
docker run -p 8080:8080 gomotor-backend
```

### For Ubuntu/Debian Servers:

**Option 1: Install Chromium (Lightweight - Recommended)**
```bash
# Install Chromium
sudo apt-get update
sudo apt-get install -y chromium-browser

# Set environment variable
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Install dependencies and run
npm ci
npm run build
npm run serve
```

**Option 2: Install Google Chrome (Heavier)**
```bash
# Install Chrome
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
sudo apt-get update
sudo apt-get install -y google-chrome-stable

# Set environment variable
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
```

### For Other Hosting Services (Heroku, Railway, etc.):

1. **Add Chromium buildpack** or install via package manager
2. **Set environment variables:**
   ```
   PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
   PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
   ```
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
   - Check that `Aptfile` exists in your repo
   - Verify build logs show "Installing chromium"
   - Environment variables are set in render.yaml

### Build Takes Too Long

✅ **Fixed!** We now skip Puppeteer's Chrome download, using system Chromium instead. This saves ~100MB and 1-2 minutes on each build.

### Memory Issues

If you see "Target closed" errors:
- Puppeteer is configured with proper timeouts (120s)
- Uses `--disable-dev-shm-usage` flag for low-memory environments
- If issues persist, consider limiting QR codes per PDF (already set to 100 for ranges)

## What Changed (Latest Update)

**New Configuration (Production-Ready):**
- ✅ Uses system Chromium (lightweight, faster builds)
- ✅ Skips Puppeteer Chrome download
- ✅ Auto-installs via `Aptfile` on Render
- ✅ Environment variable configuration
- ✅ Proper error handling with fallback to text format

**Files Added/Updated:**
- `Aptfile` - Auto-installs Chromium on Render
- `.puppeteerrc.cjs` - Configures Puppeteer to skip download
- `render.yaml` - Correct environment variables
- `qrcode.controller.js` - Uses env var for executable path
