# Deployment Guide for QR Code PDF Generation

## Chrome Installation for Production

### For Render.com:
1. Use the provided `render.yaml` configuration
2. Or add this build command in Render dashboard:
   ```bash
   npm ci && npx puppeteer browsers install chrome && npm run build
   ```

### For Docker Deployment:
1. Use the provided `Dockerfile`
2. Build and run:
   ```bash
   docker build -t gomotor-backend .
   docker run -p 8080:8080 gomotor-backend
   ```

### For Ubuntu/Debian Servers:
```bash
# Install Chrome
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
sudo apt-get update
sudo apt-get install google-chrome-stable

# Install Puppeteer Chrome
npm run install-chrome

# Set environment variable
export CHROME_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
```

### For Other Hosting Services:
1. Add Chrome installation to your build process
2. Set `CHROME_EXECUTABLE_PATH` environment variable
3. Run `npm run install-chrome` after npm install

## Troubleshooting

If PDF generation fails:
- Check server logs for Chrome installation errors
- Verify `CHROME_EXECUTABLE_PATH` environment variable
- Try running `npx puppeteer browsers install chrome` manually
- The system will return a helpful error message to users if Chrome is not available
