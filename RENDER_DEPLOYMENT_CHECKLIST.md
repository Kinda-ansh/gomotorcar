# Render.com Deployment Checklist for QR Code Feature

## ✅ Pre-Deployment Checklist

### Files to Commit:
- [x] `Aptfile` - Installs Chromium on Render
- [x] `.puppeteerrc.cjs` - Configures Puppeteer
- [x] `render.yaml` - Deployment configuration
- [x] `package.json` - Updated (removed postinstall)
- [x] `src/api/v1/QR-code/qrcode.controller.js` - Uses env var for Chrome path

### What to Push to GitHub:
```bash
git add Aptfile
git add .puppeteerrc.cjs
git add render.yaml
git add package.json
git add src/api/v1/QR-code/qrcode.controller.js
git add DEPLOYMENT.md
git commit -m "Fix: Configure Chromium for Render deployment (QR PDF generation)"
git push origin main
```

## 🚀 Deployment Steps

### Option 1: Automatic (If already connected to Render)
1. Push the changes to GitHub
2. Render will auto-deploy
3. Wait for build to complete (~3-5 minutes)
4. Test QR code PDF download

### Option 2: Manual Deploy (First Time)
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Create new Web Service or update existing
3. Connect your GitHub repository
4. Render will detect `render.yaml` automatically
5. Or manually configure:
   - **Build Command:** `npm ci && npm run build`
   - **Start Command:** `npm run serve`
   - **Environment Variables:**
     - `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` = `true`
     - `PUPPETEER_EXECUTABLE_PATH` = `/usr/bin/chromium-browser`
     - (Plus your other env vars: DB_URL, JWT_SECRET, etc.)

## 🔍 Verification

### During Build (Check Logs):
Look for these in the build logs:
```
✓ Detecting apt dependencies
✓ Installing chromium chromium-sandbox
✓ chromium installed successfully
```

### After Deployment:
1. Test PDF download from your app
2. Check server logs for:
   ```
   Using custom Chrome executable: /usr/bin/chromium-browser
   Browser launched, creating page...
   PDF generation completed successfully
   ```

## ❌ Troubleshooting

### If Build Fails:
1. **"Aptfile not found"**
   - Make sure `Aptfile` is in the root of your repo
   - Check it's committed to git

2. **"chromium-browser: not found"**
   - Build succeeded but Chromium not installed
   - Check Render build logs for apt installation
   - Try manual redeploy

3. **"Could not find Chrome"**
   - Environment variable not set correctly
   - Go to Render Dashboard → Environment
   - Add: `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`

### If PDF Download Fails (503):
1. Check server logs in Render dashboard
2. Look for Puppeteer errors
3. Verify Chromium installed: Check build logs
4. Test endpoint manually:
   ```
   GET https://your-app.onrender.com/api/v1/qr-codes/{seriesId}/download?format=pdf
   ```

## 📊 Expected Results

### Before Fix:
- ❌ 503 Service Unavailable
- ❌ "Could not find Chrome (ver. 140.0.7339.207)"
- ❌ PDF download fails

### After Fix:
- ✅ PDF generates successfully
- ✅ Downloads to user's browser
- ✅ Progress dialog shows on frontend
- ✅ QR codes marked as "printed" in database

## 💡 Tips

1. **First deployment** after this change will take ~3-5 minutes (Chromium installation)
2. **Subsequent deployments** will be faster (~2-3 minutes) - Chromium is cached
3. **Build size** reduced by ~100MB (not downloading Puppeteer's Chrome)
4. **Memory usage** optimized for Render's free tier

## 🔗 Resources

- [Render Aptfile Documentation](https://render.com/docs/native-environments#using-an-aptfile)
- [Puppeteer Render Guide](https://pptr.dev/guides/deployment#render)
- Your deployment guide: `DEPLOYMENT.md`

