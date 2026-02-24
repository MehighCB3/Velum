# Velum v2 — Full Redesign Implementation Spec

> **Instructions for Claude Code:** Read this entire document before starting. It contains the complete redesign spec for the Velum wellness app, screen by screen, plus a working React JSX reference file you should use as your visual/structural guide. Work through each screen sequentially. After each screen, verify it renders correctly before moving to the next.

---

## Project Context

Velum is a personal wellness mobile app built for a single user (Mihai). It tracks nutrition, fitness, budget, and life goals. The app currently has working screens but needs a full UI overhaul plus new features. The tech stack uses React (check the existing codebase for whether it's React Native, Next.js, or Expo — adapt accordingly).

---

## Global Design Tokens

Apply these consistently across ALL screens:

```
Colors:
  --bg-app:        #faf8f5    (main background)
  --bg-dark:       #1e1c19    (dark card backgrounds)
  --bg-dark-inner: #2a2825    (nested elements inside dark cards)
  --bg-card:       #ffffff    (white card backgrounds)
  --border-card:   #f0ece6    (card borders)
  --border-subtle: #f5f3ef    (dividers inside cards)
  --accent:        #c4956a    (primary brand accent — warm gold)
  --text-primary:  #2d2a26    (headings, key values)
  --text-secondary:#b5b0a8    (labels, supporting text)
  --text-muted:    #a09b93    (text on dark backgrounds)
  --text-dark-muted:#706b63   (secondary text on dark backgrounds)
  --success:       #6ec87a    (on track, good, remaining)
  --error:         #e85c5c    (over limit, warnings)
  --protein:       #6ba3d6    (blue — protein indicator)
  --carbs:         #6ec87a    (green — carbs indicator)
  --fat:           #e8a85c    (orange — fat indicator)
  --purple:        #9b8ed6    (used for fun category, sleep, events)

Typography:
  Font family: "DM Sans" (import from Google Fonts)
  Weights used: 400, 500, 600, 700
  Screen title: 18px / 700
  Section title: 14px / 600
  Card title: 13-14px / 600
  Body: 13px / 400-500
  Caption: 11px / 500
  Micro: 10px / 500
  Uppercase labels: 11px / 500-600, letter-spacing 0.04-0.06em

Spacing & Radii:
  Card border-radius: 16px
  Inner pill/tag radius: 4-8px
  Button radius: 8-10px
  Progress bar radius: 2px
  Card padding: 16-20px
  Section gap: 24px (margin-top on section titles)
  Card list gap: 8px between cards
```

---

## Shared Components to Build

### 1. DarkCard
Full-width dark background card (#1e1c19), 16px border-radius, 20px padding, white text by default.

### 2. Card
White background, 1px border #f0ece6, 16px border-radius, 20px padding.

### 3. ProgressRing
SVG circular progress indicator. Props: `size`, `strokeWidth`, `percentage`, `color`, `children` (center content). Track color: #eae6df. Rounded stroke cap.

### 4. BarMini
Thin horizontal progress bar. Props: `percentage`, `color`, `height` (default 4px). Track: #f0ece6.

### 5. SectionTitle
Flex row with left-aligned title (14px/600) and optional right-aligned action text in accent color.

### 6. WeekNav
Centered week label with left/right chevron arrows for week navigation.

### 7. Pill / SegmentedControl
Rounded toggle pills for switching views (e.g., Today | 30 Days). Active state: #2d2a26 bg, white text. Inactive: transparent, #b5b0a8 text.

### 8. SmallBtn
Two variants — `accent` (filled #c4956a bg, white text) and `default` (transparent, 1.5px #e0dcd5 border, #8a857d text).

### 9. BottomNav
6 tabs: Home, Nutrition, Fitness, Budget, Feed, Profile. Active tab uses accent color #c4956a.

---

## Screen 1: Home

### Layout
1. **Title:** "Velum" (18px/700)
2. **Hero DarkCard:**
   - Top-left: Date label (uppercase, muted), large number (48px/700), subtitle
   - Top-right: ProgressRing showing current week (W7 of 53)
   - Default state: shows "45 weeks left in 2026"
   - Event selected state: shows "X weeks to [Event Name]" with a "← Back to year view" link
3. **Year Grid** (Card):
   - 52 small squares (10x10px, 2px radius) in a flex-wrap grid with 3px gap
   - Colors: past weeks = #2d2a26, current week = #c4956a, future = #eae6df
   - **KEY FEATURE — Event markers:** Specific weeks get colored differently based on events (see data below). These are clickable — clicking one updates the hero card to show weeks remaining until that event.
   - Legend row below grid showing color keys
4. **Life in Weeks** (Card):
   - 3-column stat row: Age (32), Weeks Left (2,730), Years Left (53)
   - BarMini showing 38.2% progress
   - Caption: "38.2% of 85 yr expectancy"

### Data Structure: Year Events
```json
[
  { "week": 12, "label": "Barcelona Marathon", "color": "#e85c5c" },
  { "week": 24, "label": "Wedding Anniversary", "color": "#9b8ed6" },
  { "week": 30, "label": "Ironman Training Camp", "color": "#e8a85c" },
  { "week": 36, "label": "Product Hunt Launch", "color": "#6ba3d6" },
  { "week": 48, "label": "Christmas in Romania", "color": "#6ec87a" }
]
```

### Interactions
- Click colored event square → Hero number changes to `event.week - currentWeek`, subtitle changes to `weeks to ${event.label}`
- Click "← Back to year view" → Resets hero to default "weeks left in 2026"
- Clicked event square gets `outline: 2px solid ${color}` and `scale(1.4)` transform
- Legend items are also clickable to select that event

### API Integration Notes
- Events should be stored in the database and editable via Profile/Goals or a separate settings screen
- Current week is computed from today's date
- Life data (age, life expectancy) comes from user profile

---

## Screen 2: Nutrition (Today View)

### Layout
1. **Header row:** Title "Nutrition" left, segmented pills "Today | 30 Days" right
2. **Hero DarkCard (combined widget):**
   - Top section: Calories label, large calorie count, "X remaining" in green, ProgressRing on right showing percentage
   - Bottom section: Two inline progress bars for Protein and Carbs (NOT fat)
     - Each shows: label left, "Xg/Yg" right, colored progress bar below
     - Protein bar color: #6ba3d6, Carbs bar color: #6ec87a
     - Bar track on dark bg: #2a2825
3. **Meals section** with "+ Add" action:
   - Each meal is a Card with:
     - Left: 48x48px photo thumbnail (rounded 10px). If no photo, show gradient placeholder with food emoji
     - Middle: Meal name (13px/600), time + calories below (11px, muted)
     - Right: Compact macro readout — "Xg P" in protein blue, "Xg C" in carbs green
   - **Clicking a meal opens the Detail View** (see below)

### Meal Detail View (sub-screen, replaces main content)
- "← Back" link at top in accent color
- **Photo area:** Full-width, 180px tall, rounded 16px. If no photo, shows gradient placeholder with "📷 Tap to add photo" text. If photo exists, display it.
- **Title:** Meal name (20px/700)
- **Subtitle:** Time · Calories
- **Macro rings row:** 3 ProgressRings side by side (Protein, Carbs, Fat — all three shown in detail view). Each ring shows the gram value in center, label below.
- **Ingredients section:** Card with list of items, each with a small accent-colored dot bullet

### Mock Data for Meals
```json
[
  {
    "id": 1,
    "name": "Açaí Bowl",
    "time": "8:30 AM",
    "calories": 420,
    "protein": 12,
    "carbs": 68,
    "fat": 14,
    "photo": null,
    "ingredients": ["Açaí base (200g)", "Banana", "Granola (40g)", "Honey (1 tbsp)", "Blueberries"]
  },
  {
    "id": 2,
    "name": "Grilled Chicken Salad",
    "time": "1:15 PM",
    "calories": 580,
    "protein": 48,
    "carbs": 22,
    "fat": 32,
    "photo": null,
    "ingredients": ["Chicken breast (200g)", "Mixed greens", "Cherry tomatoes", "Feta (30g)", "Olive oil dressing"]
  },
  {
    "id": 3,
    "name": "Protein Shake",
    "time": "4:00 PM",
    "calories": 280,
    "protein": 35,
    "carbs": 18,
    "fat": 8,
    "photo": null,
    "ingredients": ["Whey protein (1 scoop)", "Banana", "Oat milk (250ml)", "Peanut butter (1 tbsp)"]
  }
]
```

### Interactions
- Tapping "+ Add" opens the meal logging flow (existing functionality)
- Tapping a meal card navigates to the detail view
- Tapping photo placeholder in detail should trigger camera/gallery picker
- Totals in hero card auto-calculate from all meals for the day

### API Integration Notes
- Calorie goal (2600), protein goal (160g), carbs goal (310g) come from user settings
- Meals are fetched per day from the existing API
- Photo upload should store image and associate with meal entry

---

## Screen 3: Nutrition (30 Days View)

### Layout
1. **Header row:** Same as Today but with "30 Days" pill active
2. **Summary DarkCard:**
   - Month label (uppercase, muted): "FEBRUARY 2026"
   - 3-column stats: "8 On Track" (green), "2 Over" (red), "20 No Data" (muted)
3. **Calendar Grid** (Card):
   - Day-of-week header row: M T W T F S S
   - Grid of circles (32x32px) in a 7-column CSS grid
   - Empty slots for day offset (Feb 2026 starts on Sunday → 6 empty Monday-Saturday slots)
   - Circle colors: green (#6ec87a) for on-track days, red (#e85c5c) for over-limit days, grey (#eae6df) for no-data days
   - Date number displayed inside each circle
   - White text on colored circles, muted text on grey
   - **Hover/tap a colored circle shows a tooltip** with calorie count (dark bg, white text, positioned above)
   - Legend row below: green=Good, red=Over, grey=No Data

### Interactions
- Hover (desktop) or long-press (mobile) on a colored day → tooltip with "X kcal"
- Colored circles scale up slightly on hover (transform: scale(1.15))
- Non-data days are not interactive

### API Integration Notes
- Fetch daily calorie summaries for the last 30 days
- Compare each day's total to that day's calorie goal
- A day is "good" if total ≤ goal, "over" if total > goal, "no data" if no entries

---

## Screen 4: Fitness (Unified Widget)

### Layout — Everything in ONE DarkCard
The previous design had separate boxes for activity and stats. This merges them into a single cohesive dark widget:

1. **Title:** "Fitness" + WeekNav
2. **DarkCard with three sections separated by thin dividers (#2d2a26):**

   **Section A — Activity Rings (top):**
   - 4 ProgressRings in a row: Steps (goal 10k), Runs (goal 3), Swims (goal 2), Cycles (no goal)
   - Each ring: 42px, accent color, value in center (white), label below (9px muted)

   **Section B — Key Stats (middle):**
   - 3-column grid: Distance (km), Calories Burned, BJJ Sessions
   - Large value (18px/700) with small unit suffix, label below (10px muted)

   **Section C — Health / Watch Data (bottom):**
   - Section label: "HEALTH DATA" (uppercase, muted, 11px)
   - 2-column grid of small tiles (background: #2a2825, rounded 10px, 10px 12px padding):
     - ❤️ Resting HR: "58 bpm" (red)
     - 🫁 VO₂ Max: "44 ml/kg" (blue)
     - 😴 Sleep: "7h 12m" (purple)
     - ⚡ Recovery: "Good" (green)
     - 🌡 HRV: "52 ms" (orange)
     - 🏋️ Training Load: "Moderate" (accent)
   - Each tile: emoji icon left, label (10px muted) + value (13px/600 colored) right

3. **Activities section** below the card with "+ Add" action:
   - Each activity: Card with name (13px/600), detail string (11px muted), time right-aligned

### Mock Activities
```json
[
  { "name": "Morning Run", "detail": "5.2 km · 28:14 · 5:26/km", "time": "Mon 6:30 AM" },
  { "name": "BJJ Open Mat", "detail": "1h 15m · 380 kcal", "time": "Wed 7:00 PM" },
  { "name": "Pool Swim", "detail": "1.5 km · 42 laps · 35:20", "time": "Fri 7:00 AM" }
]
```

### API Integration Notes
- Activity ring data should aggregate from logged activities for the week
- Health data (HR, VO₂ Max, Sleep, HRV) should pull from Apple Health / Google Fit / wearable API if available
- If no wearable data, show placeholder values or "—"
- Recovery and Training Load can be computed or manual

---

## Screen 5: Budget (with Month Comparison)

### Layout
1. **Title:** "Budget" + WeekNav
2. **Hero DarkCard:**
   - Left: "WEEKLY BUDGET" label, large spent amount (36px/700), "€X remaining" in green
   - Right: "of €70" label, ProgressRing showing spend percentage
3. **Month Comparison** (Card):
   - **Bar chart** showing 4 weeks (W05-W08) as vertical bars
   - Bar height proportional to amount spent
   - Dashed horizontal line at €70 showing budget limit, labeled "€70 limit"
   - Bar colors: over-budget = #e85c5c (red), current week = #c4956a (accent), past under-budget = #2d2a26, future = #eae6df at 40% opacity
   - Week label + amount below each bar
   - **Summary callout** below chart: warm beige bg (#fdf8f3), text describing which weeks were over/under
     Example: "W05 was €12 over budget. W06 was €25 under."
4. **By Category** (Card):
   - Inline row of categories with colored dots: Food (#e8a85c), Fun (#9b8ed6)
   - Each shows name + amount
5. **Spending Log** section with "+ Add":
   - Each entry: Card with name + "day · category" on left, amount on right (14px/600)

### Mock Spending Data
```json
{
  "weeklyBudget": 70,
  "currentWeekSpent": 23,
  "monthWeeks": [
    { "label": "W05", "spent": 82, "budget": 70 },
    { "label": "W06", "spent": 45, "budget": 70 },
    { "label": "W07", "spent": 23, "budget": 70, "current": true },
    { "label": "W08", "spent": 0, "budget": 70, "future": true }
  ],
  "entries": [
    { "name": "Mercadona", "amount": 12, "category": "Food", "day": "Mon" },
    { "name": "Coffee @ Satan's", "amount": 3.50, "category": "Fun", "day": "Tue" },
    { "name": "Bakery", "amount": 6, "category": "Food", "day": "Wed" }
  ]
}
```

### API Integration Notes
- Budget amount comes from user settings
- Weekly aggregation from spending entries
- Month comparison pulls all weeks in current month
- Over/under text should be dynamically generated

---

## Screen 6: Goals (with Edit & Progress Update)

### Layout
1. **Header:** "Profile" title + segmented pills "Profile | Goals" (Goals active)
2. **Time horizon pills:** "This Year" (active/dark), "3 Years", "5 Years", "10 Years"
3. **Summary line:** "3 goals · 0 completed"
4. **Goal Cards** — each Card contains:
   - Title (14px/600) left, tag chip right (colored text on 18% opacity colored bg)
   - Description (12px, muted)
   - Progress: "X / Y unit" left, "Z%" right
   - BarMini with tag color
   - **Two buttons below the progress bar:**
     - "Update Progress" (accent filled) — clicking this reveals an inline number input + Save/Cancel
     - "Edit Goal" (outlined) — navigates to edit form
5. **"+ Add Goal" button** at bottom — dashed border, full width

### Interactions — Progress Update Flow
1. User taps "Update Progress"
2. Button row is replaced by: `[number input] [Save button] [✕ button]`
3. Input is auto-focused, pre-filled with current value
4. User types new value, hits Save or presses Enter
5. Progress bar and percentage update immediately
6. Input row disappears, buttons return

### Goal Data Structure
```json
[
  {
    "id": 1,
    "title": "Strong Delivery & Ops Processes",
    "tag": "Career",
    "tagColor": "#6ba3d6",
    "description": "Best metric still unclear — will revise.",
    "current": 0,
    "target": 9,
    "unit": "Grade"
  },
  {
    "id": 2,
    "title": "Generate €20K Solo",
    "tag": "Career",
    "tagColor": "#6ba3d6",
    "description": "Prove I can build and sell simultaneously.",
    "current": 0,
    "target": 20000,
    "unit": "€"
  },
  {
    "id": 3,
    "title": "Ironman Finish",
    "tag": "Sports",
    "tagColor": "#e8a85c",
    "description": "Build a foundation for lifelong health & mental strength.",
    "current": 0,
    "target": 13,
    "unit": "Hours"
  }
]
```

### API Integration Notes
- Goals are CRUD — support create, read, update, delete
- Progress updates should persist immediately
- Time horizon filter should query goals by their assigned timeframe
- Percentage is computed: `Math.round((current / target) * 100)`

---

## Screen 7: Feed (NEW SCREEN)

### Purpose
A unified reading inbox that aggregates unread content from two sources:
1. **𝕏 (Twitter/X):** Posts from accounts the user follows that haven't been read
2. **MyMind:** Saved articles, images, and bookmarks from the MyMind app

### Layout
1. **Title:** "Feed" (18px/700)
2. **Subtitle:** "X unread items" (12px, muted)
3. **Filter pills:** "All | 𝕏 Posts | MyMind"
4. **Feed items** — each Card contains:
   - **Header row:** Source icon (22x22px, rounded 6px) + author/source name, timestamp right
     - 𝕏 icon: dark bg (#1a1a1a), white "𝕏" character
     - MyMind icon: gradient bg (#ff6b9d → #c44dff), white "m"
   - **Content:** Title/text (13px, primary color, 1.55 line height)
   - **Source note** (MyMind only): Italic, muted text showing where it was saved from
   - **Tags:** Small pills with grey bg (#f5f3ef), muted text
   - **Action bar:** Separated by top border. Three text actions:
     - "Read" (accent color, 11px/500) — marks as read, opens content
     - "Save" (muted) — saves/bookmarks for later
     - "Dismiss" (muted) — removes from feed

### Mock Feed Data
```json
[
  {
    "source": "x",
    "author": "@levelsio",
    "time": "2h ago",
    "title": "Built a $2M ARR product as a solo founder. Here's my stack in 2026...",
    "tags": ["Indie", "SaaS"]
  },
  {
    "source": "mymind",
    "type": "article",
    "time": "Yesterday",
    "title": "The Psychology of Habit Loops in Product Design",
    "tags": ["Product", "UX"],
    "note": "Saved from Pocket"
  },
  {
    "source": "x",
    "author": "@naval",
    "time": "5h ago",
    "title": "Specific knowledge is knowledge that you cannot be trained for.",
    "tags": ["Philosophy"]
  },
  {
    "source": "mymind",
    "type": "image",
    "time": "2 days ago",
    "title": "Minimal dashboard inspiration — dark mode wellness tracker",
    "tags": ["Design", "Inspo"],
    "note": "Saved from Dribbble"
  },
  {
    "source": "x",
    "author": "@paulg",
    "time": "8h ago",
    "title": "The best founders I know all share one trait: they're relentlessly resourceful.",
    "tags": ["Startups"]
  },
  {
    "source": "mymind",
    "type": "article",
    "time": "3 days ago",
    "title": "How Stripe Thinks About Developer Experience",
    "tags": ["Product", "DevEx"],
    "note": "Saved from blog.stripe.com"
  },
  {
    "source": "x",
    "author": "@andreasklinger",
    "time": "1d ago",
    "title": "Hot take: Most PMs should learn to code. Not to ship code, but to understand constraints.",
    "tags": ["Product", "Career"]
  }
]
```

### Interactions
- Filter pills toggle which items show (client-side filter)
- "Read" opens the content (URL for articles, expanded view for tweets)
- "Dismiss" removes item from feed (marks as read/dismissed in DB)
- "Save" bookmarks the item for future reference

### API Integration Notes
- **𝕏 integration:** Use X API v2 to fetch timeline/list posts. Track read status locally. If API access is limited, allow manual RSS or list-based fetching.
- **MyMind integration:** MyMind doesn't have a public API. Options:
  - Use MyMind's export/webhook if available
  - Build a simple bridge: user pastes MyMind share links or uses a bookmarklet
  - Or store MyMind items manually via the "+ Add" pattern
- Feed items should have a `read` boolean and `dismissed` boolean in the database
- Feed should sort by recency (newest first)

---

## Screen 8: Profile

### Layout
1. **Title:** "Profile" + segmented pills "Profile | Goals" (Profile active)
2. **Sync status** (right-aligned): green dot + "Synced just now"
3. **Details Card:**
   - Section label "Details" (13px/600)
   - Row items with label left (muted) and value right (primary):
     - Born: "Sep 23, 1993" (**NOT** raw ISO format — format all dates for humans)
     - Country: "Spain"
     - Life Expectancy: "85 years"
4. **About Velum Card:**
   - Version, database info, sync method — compact text block
5. **Two buttons side by side:**
   - "Force Sync" (accent outlined)
   - "Update App" (grey outlined)

### Important
- The birth date in the current app shows as `1993-09-23T00:00:00.000Z` — **this must be formatted** as "Sep 23, 1993" or equivalent human-readable format
- Profile is where user settings live — calorie goals, weekly budget, etc. could be added here later

---

## Bottom Navigation

6 tabs in this order:
1. Home (⌂)
2. Nutrition (◉)
3. Fitness (♡)
4. Budget (▤)
5. Feed (☰)
6. Profile (●)

Active state: accent color (#c4956a). Inactive: #b5b0a8.

Note: The old "Spanish" tab has been **removed entirely**.

---

## Removed Features
- **Spanish tab:** Remove this screen and its navigation entry completely
- **Flight widget:** Was mistakenly placed in Spanish tab. Remove it.
- **Cartoon emoji illustrations** in empty states (money bag, plate, runner): Replace with simple text empty states
- **Fat macro bar** from the Nutrition hero card (fat is only shown in the meal detail view)

---

## Implementation Order

Work through these in sequence:
1. Shared components (DarkCard, Card, ProgressRing, BarMini, SectionTitle, WeekNav, Pill, SmallBtn, BottomNav)
2. Home screen
3. Nutrition Today (including meal detail sub-view)
4. Nutrition 30 Days
5. Fitness
6. Budget
7. Goals
8. Feed
9. Profile
10. Remove Spanish tab and flight widget
11. Update bottom navigation

---

## Reference Implementation

The file `velum-redesign.jsx` in this directory contains a **fully working React implementation** of all screens. Use it as your structural and visual reference. It contains:
- Exact component hierarchy
- All color values applied in context
- Working state management for interactions (event selection, meal detail, goal progress updates, feed filters)
- Mock data already structured

Adapt the JSX to match the project's existing tech stack (React Native, Expo, Next.js, etc.) and connect to the existing API endpoints where applicable.
