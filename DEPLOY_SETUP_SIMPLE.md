# SIMPLE Auto-Deploy Fix

## The Real Problem

Your Vercel project IS connected to GitHub, but the webhook might be stuck.

## The 2-Minute Fix (NO IDs needed!)

### Option 1: Reconnect Git (Easiest)

1. Go to https://vercel.com/dashboard
2. Click **Velum** project
3. Go to **Settings** → **Git**
4. Click **"Disconnect"** 
5. Wait 5 seconds
6. Click **"Connect Git Repository"**
7. Select **MehighCB3/Velum**
8. Click **Connect**
9. ✅ Done! Now pushes will auto-deploy

### Option 2: Use Vercel CLI with Token Only (No Org/Project IDs)

**Step 1:** Get Token
- https://vercel.com/account/tokens → Create Token

**Step 2:** Add ONE secret to GitHub
- Go to https://github.com/MehighCB3/Velum/settings/secrets/actions
- Add: `VERCEL_TOKEN` = your token

**Step 3:** I'll update the workflow to use token-only auth

---

## Even Simpler: Browser Auto-Refresh (Immediate)

While we fix auto-deploy, install this to see changes instantly:

**Chrome Extension:** "Auto Refresh Plus"
- URL: `https://velum-five.vercel.app`
- Interval: `30 seconds`

Now when you manually redeploy, the page refreshes automatically and you see results!

---

## What I Recommend RIGHT NOW

1. **Install browser auto-refresh** (takes 30 seconds)
2. **Manually redeploy current commit** `35270d9`
3. **Test if 7-day view works**
4. **Later:** Fix auto-deploy with Option 1 or 2 above

Want to do Option 1 (reconnect Git) now? It takes 2 minutes.