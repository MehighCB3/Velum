# Velum Agent & Bot Connections

> Troubleshooting reference for every bot, webhook, script, and data path
> in the Velum platform. Last updated 2026-02-14.

---

## Architecture Overview

```
                          Vercel (velum-five.vercel.app)
 ___________________________________________________________________________
|                                                                           |
|  /api/chat ---------> OpenClaw Gateway (Pi) ------> Main Agent            |
|                       sessions_send / port 18789     Claude Sonnet 4.5    |
|                                                      Skills:              |
|  /api/fitness/webhook <--- Telegram "Fity" topic       assistant          |
|  /api/budget/webhook  <--- Telegram "Budgy" topic      coach              |
|                                                        nutrition           |
|  /api/insights  <---------- Pi cron (push-insights.sh) books              |
|        |                                               spanish             |
|        +---> Redis (Upstash) ---> Mobile useInsights()                    |
|                                                                           |
|  /api/quick-log <--- Tasker / iOS Shortcuts / curl                        |
|        |                                                                  |
|        +---> /api/fitness  (steps, weight)                                |
|        +---> /api/budget   (expense)                                      |
|        +---> /api/nutrition (meal)                                        |
|___________________________________________________________________________|
         ^                            ^                      ^
         |                            |                      |
    Telegram Bot              Mobile App (Expo)         Bash scripts
    (Fity / Budgy)            React Native              (Raspberry Pi)
```

---

## 1. OpenClaw Gateway (Main Agent)

The central AI brain. All 5 skills run under a single `main` agent.

| Field | Value |
|-------|-------|
| Config file | `config/openclaw.json` |
| Model | `anthropic/claude-sonnet-4-5-20250929` |
| Thinking | medium |
| Port | 18789 |
| Session scope | per-sender, daily reset @ 04:00 UTC |
| Reset triggers | `/new`, `/reset` |

### Skills loaded

| Skill | File | Purpose |
|-------|------|---------|
| assistant | `skills/assistant/SKILL.md` | Reminders, scheduling, research, decisions, life admin |
| coach | `skills/coach/SKILL.md` | Goal setting, habit building, accountability |
| nutrition | `skills/nutrition/SKILL.md` | Food logging, meal suggestions, macro tracking |
| books | `skills/books/SKILL.md` | 10-week domain rotation, daily wisdom, Notion integration |
| spanish | `skills/spanish/SKILL.md` | SM-2 flashcards, conjugation drills, exercises |

### Env vars required

| Var | Where set | Purpose |
|-----|-----------|---------|
| `GATEWAY_URL` | Vercel + root `.env` | Base URL of OpenClaw gateway (e.g. `http://rasppi5.tail...:18789`) |
| `OPENCLAW_GATEWAY_TOKEN` | Vercel + root `.env` | Bearer token for gateway auth |

### How chat reaches the agent

```
POST /api/chat  { message, context? }
       |
       v
POST ${GATEWAY_URL}/tools/invoke
  Headers:  Authorization: Bearer ${OPENCLAW_GATEWAY_TOKEN}
  Body:     { tool: "sessions_send",
              args: { sessionKey: "main",
                      message: "[Velum] Context: ...\n\nUser: ...",
                      timeoutSeconds: 25 } }
       |
       v
Agent responds  ->  { ok: true, result: { reply: "..." } }
```

**Fallback:** If `GATEWAY_URL` or token is missing, or the gateway returns an
error / times out, the chat route returns a hardcoded local response. The
`source` field in the response indicates `"gateway"`, `"local"`, or
`"local_fallback"`.

### Troubleshooting

| Symptom | Check |
|---------|-------|
| Chat always says "I can help you track..." | `GATEWAY_URL` or `OPENCLAW_GATEWAY_TOKEN` not set in Vercel env |
| Chat returns but says "No response received" | Gateway responded but reply field name changed; check `data.result` shape |
| Chat times out after 30s | Gateway is down or unreachable; verify Pi is online and port 18789 is open |
| Response has `source: "local_fallback"` | Gateway returned a non-200 status; check gateway logs |

---

## 2. Fity (Fitness Telegram Bot)

Receives natural-language fitness logs from a Telegram group topic and
saves them as structured entries.

| Field | Value |
|-------|-------|
| Route | `velum-app/src/app/api/fitness/webhook/route.ts` |
| Endpoint | `POST /api/fitness/webhook` |
| Telegram topic | "Fity" (or messages tagged `#fity`) |
| Auth header | `x-webhook-secret` (optional) |
| Env var | `TELEGRAM_WEBHOOK_SECRET` |

### Supported message formats

```
8000 steps              ->  type: steps, steps: 8000
5k run 30min            ->  type: run, distance: 5, duration: 30
swim 1000m 20min 300cal ->  type: swim, distance: 1, duration: 20, calories: 300
cycle 20km 52min        ->  type: cycle, distance: 20, duration: 52
vo2max 45               ->  type: vo2max, value: 45
stress 60               ->  type: stress, value: 60
recovery 85             ->  type: recovery, value: 85
hrv 58                  ->  type: hrv, value: 58
weight 78.5             ->  type: weight, value: 78.5
body fat 18.2           ->  type: body_fat, value: 18.2
bjj 90min               ->  type: jiujitsu, duration: 90
yesterday 10000 steps   ->  type: steps, date: yesterday
```

### Data flow

```
Telegram message
  -> parseFitnessMessage(text)
  -> POST /api/fitness  (save entry to Postgres)
  -> generateFitnessInsight()  (contextual insight text)
  -> classifyInsightType()     (nudge | alert | celebration)
  -> saveInsight({ agent: "Fity", agentId: "fitness-agent",
                   emoji: "...", section: "fitness", ... })
  -> Return success message to Telegram
```

### Insight classification rules

| Type | Trigger |
|------|---------|
| celebration | Daily step goal hit, weekly run/swim target reached |
| alert | Recovery < 50%, Stress > 70%, Training load > 400 |
| nudge | Everything else |

### Troubleshooting

| Symptom | Check |
|---------|-------|
| Webhook returns 401 | `TELEGRAM_WEBHOOK_SECRET` is set but doesn't match the `x-webhook-secret` header Telegram sends |
| Entry saved but no insight appears | `saveInsight()` failed silently; check Redis connection (`UPSTASH_REDIS_REST_URL` / `TOKEN`) |
| "Could not parse" response | Message didn't match any regex; check supported formats above |
| Wrong week | Check `yesterday`, `last week` keyword detection in `parseFitnessMessage` |

---

## 3. Budgy (Budget Telegram Bot)

Receives expense logs from a Telegram group topic.

| Field | Value |
|-------|-------|
| Route | `velum-app/src/app/api/budget/webhook/route.ts` |
| Endpoint | `POST /api/budget/webhook` |
| Telegram topic | "Budgy" |
| Auth header | `x-webhook-secret` (optional) |
| Env var | `TELEGRAM_WEBHOOK_SECRET` (same as Fity) |

### Supported message formats

```
15 lunch food           ->  amount: 15, desc: "lunch", cat: Food
20 drinks fun           ->  amount: 20, desc: "drinks", cat: Fun
25 dinner food w3       ->  amount: 25, desc: "dinner", cat: Food, week: W03
40 dinner food for team ->  amount: 40, desc: "dinner", cat: Food, reason: "team"
```

Euro sign (`€`) is optional. Category is auto-detected from keywords:

| Category | Keywords |
|----------|----------|
| Transport | uber, taxi, metro, bus, train, fuel, parking |
| Subscriptions | netflix, spotify, gym membership, monthly, annual |
| Food | restaurant, groceries, mercadona, lunch, dinner, breakfast |
| Fun | bar, movie, game, concert, party, drinks |
| Other | fallback |

### Data flow

```
Telegram message
  -> parseExpenseMessage(text)
  -> POST /api/budget  (save entry to Postgres)
  -> Return success + remaining budget + total spent
```

### Troubleshooting

| Symptom | Check |
|---------|-------|
| Webhook returns 401 | `TELEGRAM_WEBHOOK_SECRET` mismatch |
| Amount parsed as 0 | Message didn't start with a number; format is `<amount> <description> <category>` |
| Wrong category | Check keyword lists; add missing keywords to detection logic |
| Wrong week | Explicit `w3` or `week 3` overrides; otherwise uses current ISO week |

---

## 4. Insights System

One insight per section, keyed by section name. Overwritten on each update.

| Field | Value |
|-------|-------|
| API route | `velum-app/src/app/api/insights/route.ts` |
| Store | `velum-app/src/app/lib/insightsStore.ts` |
| Storage | Redis (`insights` key) + in-memory Map fallback |
| Mobile hook | `velum-mobile/src/hooks/useInsights.ts` (polls every 5 min) |

### Sections & their sources

| Section | Written by | Agent name | Agent ID |
|---------|-----------|------------|----------|
| fitness | Fitness webhook | Fity | fitness-agent |
| budget | (not yet auto-generated) | Budgy | budget-agent |
| nutrition | (not yet auto-generated) | — | — |
| tasks | (not yet auto-generated) | — | — |
| knowledge | (not yet auto-generated) | — | — |

### Insight shape

```typescript
{
  agent: string       // Display name ("Fity")
  agentId: string     // Machine ID ("fitness-agent")
  emoji: string       // "..."
  insight: string     // Human-readable text
  type: "nudge" | "alert" | "celebration"
  updatedAt: string   // ISO timestamp
  section: "nutrition" | "fitness" | "budget" | "tasks" | "knowledge"
}
```

### Who reads insights

| Consumer | How |
|----------|-----|
| Mobile: Home tab | `useInsights()` — all sections |
| Mobile: Fitness tab | `useInsights('fitness')` |
| Mobile: Nutrition tab | `useInsights('nutrition')` |
| Mobile: Budget tab | `useInsights('budget')` |
| Mobile: Learn tab | `useInsights('knowledge')` |
| Web dashboard | `GET /api/insights` |

### Who writes insights

| Producer | How |
|----------|-----|
| Fitness webhook | Direct call to `saveInsight()` (server-side) |
| Pi scripts | `POST /api/insights` with `Authorization: Bearer ${INSIGHTS_API_KEY}` |
| Any external caller | `POST /api/insights` (requires token if `INSIGHTS_API_KEY` is set) |

### Troubleshooting

| Symptom | Check |
|---------|-------|
| Insights not showing on mobile | Device offline? `isOnline()` check in hook. Also check `/api/insights` returns non-empty array |
| POST returns 401 | `INSIGHTS_API_KEY` is set but caller isn't sending matching Bearer token |
| Insights disappear on redeploy | Redis not configured; falling back to in-memory Map which resets on cold start |
| Only one insight per section | By design — `saveInsight()` overwrites the key for that section |

---

## 5. Quick-Log API

Simple POST endpoint for external automation (Tasker, iOS Shortcuts, curl).

| Field | Value |
|-------|-------|
| Route | `velum-app/src/app/api/quick-log/route.ts` |
| Endpoint | `POST /api/quick-log` |
| Auth | Optional Bearer token via `QUICK_LOG_TOKEN` |
| CORS | Fully open (`*`) |

### Request body

```json
{
  "type": "steps | expense | meal | weight",
  "value": 8000,
  "description": "Morning walk",
  "category": "Food"
}
```

### Routing

| Type | Upstream API | Value meaning |
|------|-------------|---------------|
| steps | `POST /api/fitness` | Step count |
| expense | `POST /api/budget` | Amount in EUR |
| meal | `POST /api/nutrition` | Calories (0 if unknown) |
| weight | `POST /api/fitness` | Weight in kg |

### Troubleshooting

| Symptom | Check |
|---------|-------|
| 401 Unauthorized | `QUICK_LOG_TOKEN` is set but caller isn't sending it |
| "Unknown type" error | Typo in `type` field; must be exactly `steps`, `expense`, `meal`, or `weight` |
| Upstream error | The internal fetch to `/api/fitness` or `/api/budget` failed; check those routes |

---

## 6. Pi Scripts (Raspberry Pi)

Shell scripts that push data from the Pi to Velum.

### push-insights.sh

```bash
# Reads ~/clawd/insights/*.json and POSTs to /api/insights
# REQUIRED: export INSIGHTS_API_KEY=...
# OPTIONAL: export VELUM_URL=https://...  (default: velum-five.vercel.app)
```

| Env var | Required | Default |
|---------|----------|---------|
| `INSIGHTS_API_KEY` | Yes (fails without it) | — |
| `VELUM_URL` | No | `https://velum-five.vercel.app` |

### log-activity.sh

```bash
bash log-activity.sh "Running" 45 6.5 420 "Easy pace" "07:30"
#                     type     dur dist cal  notes     time
# Types: Running, Swimming, Cycling, BJJ, Steps, Gym, Other
```

| Env var | Required | Default |
|---------|----------|---------|
| `VELUM_URL` | No | `https://velum-five.vercel.app` |

### log-expense.sh

```bash
bash log-expense.sh "Groceries at Mercadona" 23.50 "Food" "18:45"
#                    description              amount cat    time
# Categories: Food, Fun, Transport, Subscriptions, Other
```

| Env var | Required | Default |
|---------|----------|---------|
| `VELUM_URL` | No | `https://velum-five.vercel.app` |

---

## 7. Environment Variables — Complete Checklist

Use this to verify everything is configured. Check in Vercel dashboard
and/or the Pi's shell profile.

### Vercel (velum-app)

| Variable | Required for | Set? |
|----------|-------------|------|
| `POSTGRES_URL` | All data persistence | |
| `POSTGRES_PRISMA_URL` | Prisma client | |
| `POSTGRES_URL_NON_POOLING` | Migrations | |
| `POSTGRES_USER` | DB auth | |
| `POSTGRES_HOST` | DB connection | |
| `POSTGRES_PASSWORD` | DB auth | |
| `POSTGRES_DATABASE` | DB name | |
| `UPSTASH_REDIS_REST_URL` | Insights persistence | |
| `UPSTASH_REDIS_REST_TOKEN` | Redis auth | |
| `GATEWAY_URL` | Chat -> OpenClaw | |
| `OPENCLAW_GATEWAY_TOKEN` | Gateway auth | |
| `FATSECRET_CONSUMER_KEY` | Nutrition food lookup | |
| `FATSECRET_CONSUMER_SECRET` | FatSecret auth | |
| `NOTION_TOKEN` | Books/wisdom from Notion | |
| `NOTION_API_KEY` | Notion auth | |
| `NOTION_BOOKS_DB_ID` | Books database | |
| `NOTION_REVIEWS_DB_ID` | Reviews database | |
| `NOTION_ESSENTIAL_DB_ID` | Essential books database | |
| `INSIGHTS_API_KEY` | Secure insight writes | |
| `TELEGRAM_WEBHOOK_SECRET` | Secure Fity/Budgy webhooks | |
| `QUICK_LOG_TOKEN` | Secure quick-log endpoint | |

### Raspberry Pi

| Variable | Required for | Set? |
|----------|-------------|------|
| `INSIGHTS_API_KEY` | push-insights.sh | |
| `VELUM_URL` | All scripts (optional, has default) | |

### OpenClaw (Pi)

| Variable | Required for | Set? |
|----------|-------------|------|
| `ANTHROPIC_API_KEY` | Claude model access | |

---

## 8. Connectivity Test Playbook

Run these in order to verify the full chain.

### Step 1 — Vercel is alive

```bash
curl -s https://velum-five.vercel.app/api/app-version | jq .
# Expected: { "version": "..." }
```

### Step 2 — Database works

```bash
curl -s https://velum-five.vercel.app/api/fitness | jq .week
# Expected: "2026-W07" (current week)
```

### Step 3 — Redis works (insights)

```bash
curl -s https://velum-five.vercel.app/api/insights | jq length
# Expected: number >= 0  (not an error object)
```

### Step 4 — Insight write works

```bash
curl -s -X POST https://velum-five.vercel.app/api/insights \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${INSIGHTS_API_KEY}" \
  -d '{"agent":"Test","agentId":"test","emoji":"T","insight":"ping","type":"nudge","section":"tasks"}' \
  | jq .success
# Expected: true
```

### Step 5 — OpenClaw gateway reachable

```bash
curl -s -X POST ${GATEWAY_URL}/tools/invoke \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${OPENCLAW_GATEWAY_TOKEN}" \
  -d '{"tool":"sessions_send","args":{"sessionKey":"main","message":"ping","timeoutSeconds":10}}' \
  | jq .ok
# Expected: true
```

### Step 6 — Chat route uses gateway

```bash
curl -s -X POST https://velum-five.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"hello"}' \
  | jq .source
# Expected: "gateway"  (not "local" or "local_fallback")
```

### Step 7 — Fitness webhook works

```bash
curl -s -X POST https://velum-five.vercel.app/api/fitness/webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: ${TELEGRAM_WEBHOOK_SECRET}" \
  -d '{"message":{"text":"8000 steps","chat":{"id":1}}}' \
  | jq .success
# Expected: true
```

### Step 8 — Budget webhook works

```bash
curl -s -X POST https://velum-five.vercel.app/api/budget/webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: ${TELEGRAM_WEBHOOK_SECRET}" \
  -d '{"message":{"text":"5 test food"}}' \
  | jq .success
# Expected: true
```

### Step 9 — Quick-log works

```bash
curl -s -X POST https://velum-five.vercel.app/api/quick-log \
  -H "Content-Type: application/json" \
  -d '{"type":"steps","value":100}' \
  | jq .success
# Expected: true
```

### Step 10 — Mobile API base reachable

```bash
curl -s https://velum-five.vercel.app/api/profile | jq .
# Expected: { "profile": ... }
```

---

## 9. Key Files Reference

| File | What it does |
|------|-------------|
| `config/openclaw.json` | Gateway config: model, skills, sessions, channels |
| `skills/*/SKILL.md` | Skill behavior definitions (5 skills) |
| `velum-app/src/app/api/chat/route.ts` | Chat -> OpenClaw gateway orchestrator |
| `velum-app/src/app/api/fitness/webhook/route.ts` | Telegram Fity -> fitness entries + insights |
| `velum-app/src/app/api/budget/webhook/route.ts` | Telegram Budgy -> budget entries |
| `velum-app/src/app/api/insights/route.ts` | Insight read/write API |
| `velum-app/src/app/api/quick-log/route.ts` | External automation -> data APIs |
| `velum-app/src/app/lib/redis.ts` | Shared Upstash Redis client |
| `velum-app/src/app/lib/insightsStore.ts` | Insight persistence (Redis + fallback) |
| `velum-app/src/app/lib/weekUtils.ts` | ISO week key utilities |
| `velum-mobile/src/api/client.ts` | Mobile API client (all endpoints) |
| `velum-mobile/src/hooks/useInsights.ts` | Mobile insight polling hook (5-min interval) |
| `scripts/push-insights.sh` | Pi -> Velum insight push (cron) |
| `scripts/log-activity.sh` | CLI fitness logging |
| `scripts/log-expense.sh` | CLI expense logging |
| `.env.example` | Root env var template |
| `velum-app/.env.example` | Web app env var template |
