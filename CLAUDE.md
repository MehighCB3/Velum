# Velum — Claude Code Project Config

## Git Workflow

- **Always develop on `claude/*` branches** and merge via PR.
- After pushing a branch, tell the user to merge via the **GitHub browser UI**:
  ```
  https://github.com/MehighCB3/Velum/compare/main...<branch-name>
  ```
  The user will create and merge the PR from the browser. Do NOT ask them to use `gh` CLI.

### Branch Naming Rules

- **One task = one branch.** Never reuse a branch that was already merged.
- Format: `claude/<short-topic>-<SESSION_ID_SUFFIX>`
  - Example: `claude/fix-budget-colors-qK3PY`
  - The session ID suffix (last 5 chars) guarantees uniqueness.
- The topic slug must reflect the *current* task — not the branch you happen to be on.
- After a PR is merged, the next task must start from a fresh branch off `main`.

### Mobile Version Bumps

Always use the bump script — never edit `app.json` or `package.json` by hand:
```bash
cd velum-mobile
./scripts/bump-version.sh patch        # 1.8.0 → 1.8.1
./scripts/bump-version.sh minor        # 1.8.0 → 1.9.0
./scripts/bump-version.sh 2.0.0        # explicit
```
This keeps `app.json` and `package.json` in sync atomically.

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
