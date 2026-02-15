# Changelog

All notable changes to Velum Mobile are documented here.

## [1.2.0] — 2026-02-15

### Changed
- Aligned version across `app.json` (was 1.1.0) and `package.json` (was 1.0.0) to single source of truth
- Deduplicated `API_BASE` constant — extracted to `src/api/config.ts`, removed 3 inline copies
- Exported `InsightBanner` from component barrel file
- Updated OpenClaw gateway config with full API endpoint map
- Updated nutrition skill with concrete API base URL and all available endpoints

### Removed
- Old v1.0.0 APK build artifact

### Infrastructure
- Postgres migration completed (nutrition_entries, nutrition_goals, agent_memories tables)
- Removed debug diagnostics from `/api/migrate` GET endpoint

## [1.1.0] — 2026-02-14

### Added
- Agent insights cards on all tabs (nutrition, fitness, budget, learn, home)
- App update checker with APK download from GitHub releases
- Quick Actions on profile screen (steps, expense, meal, weight one-tap logging)
- Computed insight banners (dynamic suggestions based on current data)

### Fixed
- App update flow for non-EAS builds (direct APK download via Linking)
- Error handling in sync engine for offline scenarios

## [1.0.0] — 2026-02-12

### Added
- 6-tab layout: Home, Nutrition, Fitness, Budget, Learn, Profile
- **Home**: Year progress (52-week grid), life-in-weeks visualization
- **Nutrition**: Daily meal logging with calorie/macro tracking, 30-day calendar view
- **Fitness**: Weekly workout tracking (steps, run, swim, cycle, BJJ, gym), advanced metrics (VO2max, HRV, recovery)
- **Budget**: Weekly spending tracker (€70 default), category breakdown (Food, Fun, Transport, Subscriptions, Other)
- **Learn**: Spanish vocabulary (SM-2 spaced repetition), exercises (conjugation, cloze, translation), pronunciation practice with audio
- **Profile**: Birth date, life expectancy, goals (5 horizons)
- Offline-first architecture with SQLite cache and sync queue
- Notion-inspired visual design (warm brown accent, clean typography)
- API client connecting to Velum web app (velum-five.vercel.app)
