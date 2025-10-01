# Render.com Deployment Checklist for QR Code Feature

## ✅ Pre-Deployment Checklist

### Files to Commit:
- [x] `.puppeteerrc.cjs` - Configures Puppeteer cache
- [x] `render.yaml` - Deployment configuration with Chrome installation
- [x] `package.json` - Updated (removed postinstall)
- [x] `src/api/v1/QR-code/qrcode.controller.js` - Smart Chrome path detection

### What to Push to GitHub:
```bash
git add .puppeteerrc.cjs
git add render.yaml
git add package.json
git add src/api/v1/QR-code/qrcode.controller.js
git add DEPLOYMENT.md
git add RENDER_DEPLOYMENT_CHECKLIST.md
git commit -m "Fix: Use Puppeteer Chrome for PDF generation on Render"
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
   - **Build Command:** `npm ci && npx puppeteer browsers install chrome && npm run build`
   - **Start Command:** `npm run serve`
   - **Environment Variables:** (your existing env vars: DB_URL, JWT_SECRET, etc.)
   - No additional Puppeteer env vars needed!

## 🔍 Verification

### During Build (Check Logs):
Look for these in the build logs:
```
> npx puppeteer browsers install chrome
Installing @puppeteer/browsers...
Chrome installed successfully
```

### After Deployment:
1. Test PDF download from your app
2. Check server logs for one of these:
   ```
   Found system Chrome/Chromium at: /usr/bin/chromium
   ```
   OR
   ```
   No system Chrome found, Puppeteer will use its own installed Chrome
   Browser launched, creating page...
   PDF generation completed successfully
   ```

## ❌ Troubleshooting

### If Build Fails:
1. **"Cannot find module @puppeteer/browsers"**
   - Make sure build command includes: `npx puppeteer browsers install chrome`
   - Check `render.yaml` is properly configured
   - Try manual redeploy

2. **"Failed to install Chrome"**
   - Network issue during build
   - Try manual redeploy
   - Check build logs for specific error

3. **Build succeeds but no Chrome installed**
   - Verify build command in Render dashboard
   - Should see "npx puppeteer browsers install chrome" in logs
   - Check for Chrome installation messages

### If PDF Download Fails (503):
1. Check server logs in Render dashboard
2. Look for specific error:
   - **"Tried to find the browser at..."** → Chrome path issue
   - **"Could not find Chrome"** → Chrome not installed
3. Verify Chrome was installed during build
4. Check server logs show "Puppeteer will use its own installed Chrome"
5. Test endpoint manually:
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

1. **First deployment** after this change will take ~3-5 minutes (Chrome download ~100MB)
2. **Subsequent deployments** may be faster if Render caches the Chrome installation
3. **Chrome size** is ~100MB - this is normal for Puppeteer Chrome
4. **Memory usage** optimized for Render's free tier with proper flags
5. **Cache directory** is `.cache/puppeteer` - this gets cleared on each build on Render

## 🔗 Resources

- [Render Aptfile Documentation](https://render.com/docs/native-environments#using-an-aptfile)
- [Puppeteer Render Guide](https://pptr.dev/guides/deployment#render)
- Your deployment guide: `DEPLOYMENT.md`

