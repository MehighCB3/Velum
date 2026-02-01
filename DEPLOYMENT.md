# Velum Nutrition API Fix - Deployment Guide

## Summary

Fixed the critical issue where POSTing new nutrition data would **replace** existing entries instead of **appending** them.

### Changes Made

1. **Added Redis persistence** (`@upstash/redis`) for reliable storage across serverless instances
2. **Fixed append logic** in `POST /api/nutrition` to:
   - Read existing data first
   - Merge new entries with existing entries
   - Recalculate totals from all entries
   - Save merged result
3. **Added storage type indicator** in API response for debugging
4. **Maintained backward compatibility** with file/memory fallbacks for local dev

### Files Modified

- `src/app/api/nutrition/route.ts` (root project)
- `velum-app/src/app/api/nutrition/route.ts` (deployable app)
- `package.json` & `package-lock.json` (both projects)
- Added `vercel.json` for deployment config
- Added `test-api.js` for local testing

---

## Deployment Steps

### Step 1: Push Code to GitHub

```bash
cd /home/pablissimopie/clawd/Velum
git push origin main
```

**If git push requires authentication**, either:
- Use SSH: `git remote set-url origin git@github.com:MehighCB3/Velum.git`
- Or manually deploy via Vercel CLI (see Step 3)

### Step 2: Set Up Upstash Redis (Required for Production)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `velum-five` project
3. Go to **Storage** tab → **Connect Database**
4. Select **Upstash Redis** from the marketplace
5. Create a new Redis database (or use existing)
6. **Copy the environment variables**:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
7. Add these to your Vercel project:
   - Go to **Settings** → **Environment Variables**
   - Add both variables
   - **Redeploy** the project

### Step 3: Deploy (Alternative Methods)

#### Option A: Git Integration (Auto-deploy)
If your GitHub repo is connected to Vercel, pushing to main will auto-deploy.

#### Option B: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login (if not already)
vercel login

# Deploy
cd /home/pablissimopie/clawd/Velum/velum-app
vercel --prod
```

#### Option C: Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Set framework preset to **Next.js**
4. Set root directory to `velum-app`
5. Add environment variables from Step 2
6. Deploy

---

## Verification

### Test the Fix Locally

```bash
# Terminal 1: Start dev server
cd /home/pablissimopie/clawd/Velum/velum-app
npm run dev

# Terminal 2: Run test script
node test-api.js
```

### Test the Deployed Version

```bash
# Test with curl
DATE=$(date +%Y-%m-%d)
URL="https://velum-five.vercel.app/api/nutrition"

# Add first meal
curl -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d "{\"date\":\"$DATE\",\"name\":\"Oatmeal\",\"calories\":350,\"protein\":12,\"carbs\":60,\"fat\":6}"

# Add second meal
curl -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d "{\"date\":\"$DATE\",\"name\":\"Chicken Salad\",\"calories\":450,\"protein\":35,\"carbs\":15,\"fat\":20}"

# Verify both entries exist
curl "$URL?date=$DATE"
```

**Expected Result:**
- Response should show `entries` array with **2 items**
- `totals.calories` should be **800** (350 + 450)
- `storage` field should show **"redis"** (in production)

---

## API Behavior

### POST /api/nutrition

**Before Fix (BROKEN):**
```json
POST { "date": "2026-02-01", "entries": [{"name": "Meal 2"}] }
→ Storage: Only Meal 2 exists (Meal 1 LOST)
```

**After Fix (CORRECT):**
```json
POST { "date": "2026-02-01", "entries": [{"name": "Meal 2"}] }
→ Read existing: [Meal 1]
→ Merge: [Meal 1, Meal 2]
→ Storage: Both meals preserved with updated totals
```

### Response Format

```json
{
  "success": true,
  "date": "2026-02-01",
  "entries": [...],        // All entries for the date
  "totals": {              // Calculated from all entries
    "calories": 800,
    "protein": 47,
    "carbs": 75,
    "fat": 26
  },
  "goals": {...},
  "storage": "redis"       // "redis" | "memory" | "file"
}
```

---

## Troubleshooting

### "Entries still being replaced"
- Check that Redis is properly configured
- Verify environment variables are set in Vercel
- Check logs: `vercel logs --tail`

### "Storage shows 'memory' in production"
- Redis credentials are missing
- Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` env vars

### "Data lost after redeploy"
- This is expected with memory/file storage in serverless
- **Redis is required** for persistent storage

---

## Success Criteria Checklist

- [ ] Multiple POSTs to same date accumulate entries
- [ ] Dashboard shows ALL meals from the day
- [ ] Totals are correctly summed
- [ ] Works after deployment with Redis

---

## Need Help?

If deployment fails:
1. Check Vercel build logs
2. Verify all environment variables are set
3. Ensure `@upstash/redis` is in package.json dependencies
4. Test locally first with `npm run dev`
