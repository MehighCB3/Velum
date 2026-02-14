# Velum — Claude Code Project Config

## Git Workflow

- **Always develop on `claude/*` branches** and merge via PR.
- Set `GH_TOKEN` env var for autonomous PR creation/merge.
- After pushing a branch, create and merge the PR:
  ```bash
  gh pr create --title "..." --body "..." --base main
  gh pr merge --merge --delete-branch
  ```

## Project Structure

- `velum-app/` — Next.js 14 web app (Vercel deployment)
- `velum-mobile/` — Expo/React Native mobile app
- `config/` — OpenClaw gateway config
- `skills/` — OpenClaw skill definitions
- `scripts/` — Automation scripts (Pi insights, logging)

## Shared Libraries (velum-app)

- `src/app/lib/redis.ts` — Shared Redis client (import instead of creating new instances)
- `src/app/lib/weekUtils.ts` — ISO week utilities (getWeekKey, getISOWeek, parseWeekKey, getWeekDates)
- `src/app/lib/insightsStore.ts` — Agent insights persistence

## Mobile APK Builds

One-command build from `velum-mobile/`:
```bash
./scripts/build-apk.sh          # uses version from app.json
./scripts/build-apk.sh 1.2.0    # override version
```

## Environment

- Web deploys to: https://velum-five.vercel.app
- Mobile API base (prod): https://velum-five.vercel.app
- All secrets in Vercel dashboard + `.env` (never commit real values)
