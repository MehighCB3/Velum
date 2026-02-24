# Velum Deployment Guide

## How It Works

Velum deploys automatically via **Vercel Git Integration**. Every push to `main` triggers a production deployment.

- **Live site:** https://velum-five.vercel.app
- **Dashboard:** https://vercel.com (Velum project)
- **Root directory:** `velum-app` (configured in Vercel)
- **Framework:** Next.js 14

## Environment Variables (Vercel Dashboard → Settings → Environment Variables)

| Variable | Purpose |
|----------|---------|
| `UPSTASH_REDIS_REST_URL` | Redis persistence (Upstash) |
| `UPSTASH_REDIS_REST_TOKEN` | Redis auth token |
| `POSTGRES_URL` | Vercel Postgres connection |
| `FATSECRET_CLIENT_ID` | FatSecret API |
| `FATSECRET_CLIENT_SECRET` | FatSecret API |
| `TELEGRAM_BOT_TOKEN` | Webhook auth for budget/fitness |

## Manual Deploy (if needed)

```bash
# Option 1: Vercel CLI
cd velum-app
npx vercel --prod

# Option 2: Trigger via git
git commit --allow-empty -m "trigger deploy" && git push origin main
```

## Troubleshooting

- **Auto-deploy not working?** Go to Vercel → Settings → Git → Disconnect and reconnect the GitHub repo.
- **Storage shows "memory"?** Redis credentials are missing — add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Vercel env vars.
- **Check logs:** `vercel logs --tail` or view in Vercel Dashboard → Deployments → Functions tab.
