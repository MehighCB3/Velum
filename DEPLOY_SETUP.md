# Velum Auto-Deploy Setup

## Option 1: GitHub Actions (RECOMMENDED) - Fully Automatic

### What it does:
- Every push to `main` automatically deploys to Vercel
- No manual redeploy button needed
- Takes ~2 minutes from push to live

### Setup:

1. **Get Vercel Token:**
   - Go to https://vercel.com/account/tokens
   - Click "Create Token"
   - Name: "GitHub Actions"
   - Copy the token

2. **Add GitHub Secrets:**
   - Go to https://github.com/MehighCB3/Velum/settings/secrets/actions
   - Click "New repository secret"
   - Add these 3 secrets:

| Secret Name | Value |
|-------------|-------|
| `VERCEL_TOKEN` | Your token from step 1 |
| `VERCEL_ORG_ID` | Your Vercel org ID (from project settings) |
| `VERCEL_PROJECT_ID` | Your Vercel project ID (from project settings) |

3. **Find Org ID and Project ID:**
   - Go to https://vercel.com/dashboard
   - Click Velum project → Settings → General
   - Scroll to "Project ID" and "Team ID" (if you have a team)
   - Or run: `vercel projects ls` in terminal

### Result:
✅ Push code → Auto-deploys → Site updates automatically

---

## Option 2: Vercel Git Integration (Already Connected)

Your Vercel project is already connected to GitHub. If auto-deploy isn't working:

### Fix it:

1. Go to https://vercel.com/dashboard → Velum → Settings → Git
2. Check that "Auto deploy on push" is ON
3. If not, toggle it ON
4. Make sure it's watching the `main` branch

### Result:
✅ Every git push triggers a Vercel deployment automatically

---

## Option 3: Browser Auto-Refresh

Install a browser extension to auto-refresh the page:

### Chrome/Edge:
- Install "Auto Refresh Plus" extension
- Set it to refresh https://velum-five.vercel.app every 30 seconds
- Or use this bookmarklet:

```javascript
javascript:(function(){setInterval(function(){location.reload();},30000);})();
```

### Result:
✅ Page auto-refreshes so you see changes immediately

---

## Option 4: One-Click Deploy Script (Pi)

SSH into your Pi and run:

```bash
cd ~/clawd/Velum
./deploy-and-refresh.sh
```

This will:
1. Push to GitHub
2. Trigger Vercel deploy
3. Wait 25 seconds
4. Open the site in browser

---

## 🎯 RECOMMENDED SETUP

**Do Option 1 (GitHub Actions) + Option 3 (Browser refresh)**

Result:
1. I push code → GitHub Actions deploys automatically
2. Your browser auto-refreshes → You see changes instantly
3. Zero manual work!

---

## Current Status

- ✅ GitHub Actions workflow created (`.github/workflows/deploy.yml`)
- ✅ Vercel Git integration connected
- ⏳ Waiting for you to add the 3 GitHub secrets

**Next step:** Add the secrets and push any commit to test!
