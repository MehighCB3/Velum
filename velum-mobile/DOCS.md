# Velum Mobile — Documentation

## Overview

Velum is a personal life-tracking mobile app built with Expo/React Native. It covers nutrition, fitness, budget, Spanish learning, and goal setting — all backed by a Next.js API on Vercel with Postgres storage.

**Current version:** 1.2.0
**Platform:** Android (arm64 APK)
**Stack:** Expo 54, React Native 0.81, TypeScript, SQLite (local cache), Vercel Postgres (server)

## Architecture

```
┌─────────────────────────────┐
│       Velum Mobile          │
│   Expo Router (file-based)  │
│                             │
│  ┌─────────┐  ┌──────────┐ │
│  │ Screens │  │  Hooks   │ │
│  │ (tabs)  │──│ (state)  │ │
│  └─────────┘  └────┬─────┘ │
│                     │       │
│  ┌──────────────────┴─────┐ │
│  │   SQLite Cache         │ │
│  │   (offline-first)      │ │
│  └──────────────────┬─────┘ │
└──────────────────────┼──────┘
                       │ REST
┌──────────────────────┼──────┐
│  Velum Web API (Vercel)     │
│  Next.js 14 + Postgres      │
│  velum-five.vercel.app       │
└─────────────────────────────┘
```

### Data Flow
1. **Online**: Screens → Hooks → API client → Vercel API → Postgres
2. **Offline**: Screens → Hooks → SQLite cache (writes queued in `pending_changes`)
3. **Sync**: On reconnect, flush pending queue → refresh all caches from server

## Screens (6 Tabs)

| Tab | File | Purpose |
|-----|------|---------|
| Home | `app/(tabs)/index.tsx` | Year progress (52-week grid), life-in-weeks, agent insights |
| Nutrition | `app/(tabs)/nutrition.tsx` | Daily meal logging, macro tracking, 30-day calendar |
| Fitness | `app/(tabs)/fitness.tsx` | Weekly workouts (steps/run/swim/cycle/BJJ), advanced metrics |
| Budget | `app/(tabs)/budget.tsx` | Weekly spending (€70), category breakdown |
| Learn | `app/(tabs)/learn.tsx` | Spanish flashcards (SM-2), exercises, pronunciation |
| Profile | `app/(tabs)/profile.tsx` | User info, goals, quick actions, app updates |

## Project Structure

```
velum-mobile/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab group (6 screens + layout)
│   ├── _layout.tsx        # Root layout (splash screen)
│   └── +not-found.tsx     # 404 boundary
├── src/
│   ├── api/
│   │   ├── config.ts      # Shared API_BASE constant
│   │   └── client.ts      # REST client (all endpoints)
│   ├── components/        # Reusable UI (Card, ProgressRing, etc.)
│   ├── db/
│   │   ├── database.ts    # SQLite schema + CRUD
│   │   └── sync.ts        # Sync engine (flush, refresh, status)
│   ├── hooks/             # React hooks (useNutrition, useFitness, etc.)
│   ├── theme/colors.ts    # Notion-inspired color palette
│   └── types/index.ts     # TypeScript interfaces
├── assets/                # Icons, splash screen
├── scripts/build-apk.sh   # APK build script
├── app.json               # Expo config (version source of truth)
├── package.json           # Dependencies (version synced with app.json)
└── CHANGELOG.md           # Version history
```

## API Endpoints

Base URL: `https://velum-five.vercel.app` (prod) / `http://localhost:3000` (dev)

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/nutrition` | GET, POST, DELETE | Daily meal entries |
| `/api/nutrition/goals` | GET, POST | Daily nutrition targets |
| `/api/nutrition/week` | GET | 7-day summary |
| `/api/nutrition/lookup` | GET | Food search (FatSecret) |
| `/api/fitness` | GET, POST, DELETE | Weekly fitness entries |
| `/api/budget` | GET, POST, DELETE | Weekly budget entries |
| `/api/goals` | GET, POST, PATCH, DELETE | Personal goals |
| `/api/spanish` | GET, POST | Flashcards (SM-2) |
| `/api/spanish/exercises` | GET | Grammar/vocab exercises |
| `/api/spanish/pronounce` | POST | Pronunciation check |
| `/api/profile` | GET, POST | User profile |
| `/api/quick-log` | POST | Quick logging (steps, expense, meal, weight) |
| `/api/insights` | GET, POST | Agent insights |
| `/api/memory` | GET, POST, DELETE | Persistent agent memories |
| `/api/books` | GET | Knowledge/wisdom system |
| `/api/app-version` | GET | APK version + download URL |

## Offline-First Strategy

### SQLite Tables
- `nutrition_entries` — Cached meal data
- `nutrition_goals` — Cached daily targets
- `fitness_entries` — Cached workout data (JSON)
- `budget_entries` — Cached spending data
- `goals` — Cached goals
- `spanish_cards` — Vocabulary with SM-2 fields
- `user_profile` — Profile data
- `pending_changes` — Offline write queue
- `sync_meta` — Last sync timestamps

### Sync Behavior
- Auto-sync every 5 minutes (`useSync` hook)
- Sync on app foreground (AppState listener)
- Manual sync button on Profile tab
- Failed changes queued and retried on next sync
- 4xx errors dropped (bad request), 5xx retried

## Building the APK

### Prerequisites
- Node.js + npm (dependencies installed)
- Java 17+ (`JAVA_HOME` set)
- Android SDK (`ANDROID_HOME` set or at `/opt/android-sdk`)
- NDK 27.x installed

### Build Command
```bash
cd velum-mobile
npm install                    # if not done
./scripts/build-apk.sh        # uses version from app.json
./scripts/build-apk.sh 1.2.0  # override version
```

**Output:** `velum-v1.2.0-arm64.apk` (~40 MB)

### After Building
1. Update `velum-app/src/app/api/app-version/route.ts` with new version
2. Commit the APK to git (tracked for GitHub download links)
3. Push to main so the download URL resolves

## Version Management

Version is tracked in 3 places (keep them in sync):

| Location | Purpose |
|----------|---------|
| `velum-mobile/app.json` → `expo.version` | Primary source — Expo uses this |
| `velum-mobile/package.json` → `version` | NPM convention — must match |
| `velum-app/src/app/api/app-version/route.ts` | Server returns this for update checks |

## OpenClaw Agent Integration

The mobile app is one interface to Velum. The other is the OpenClaw AI agent (via Telegram).

**Config:** `config/openclaw.json`
- Model: Claude Sonnet 4.5
- 5 skills: assistant, coach, nutrition, books, spanish
- Sessions reset daily at 4 AM
- Per-sender memory (categories: preference, fact, goal, health, habit, context)

**Skills:** `skills/` directory
- Each skill has a `SKILL.md` with behavior rules and memory directives
- Agent reads/writes via the same Velum API the mobile app uses
- Memory stored in `agent_memories` Postgres table

## Dependencies (Key)

| Package | Version | Purpose |
|---------|---------|---------|
| expo | 54.0.33 | Framework |
| react-native | 0.81.5 | UI runtime |
| expo-router | 6.0.23 | File-based navigation |
| expo-sqlite | 16.0.10 | Local caching |
| expo-av | 16.0.8 | Audio (pronunciation) |
| expo-speech | 14.0.8 | TTS (Spanish) |
| expo-updates | 29.0.16 | OTA updates |
| date-fns | 3.6.0 | Date utilities |
