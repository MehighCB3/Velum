# VELUM Agent Insights Integration

## Context

Velum is a Next.js 14 personal dashboard app deployed on Vercel at velum-five.vercel.app.
Repo: https://github.com/MehighCB3/Velum
Stack: Next.js 14, Tailwind CSS, TypeScript, Lucide React icons.

The user (Mihai) runs OpenClaw (clawdbot) on a Raspberry Pi 5 with multiple AI agents connected via Telegram. Each agent specializes in a domain. We need to surface agent insights inside the Velum dashboard — small, non-intrusive cards that show each agent's latest observation or nudge.

## Agent-to-Section Mapping

| Velum Section | Agent Name | Agent ID         | Emoji | Example Insight |
|---------------|-----------|------------------|-------|-----------------|
| Nutrition     | Nutry     | nutrition-agent  | 🥗    | "Protein low 3 days running. Add eggs at breakfast." |
| Fitness       | Fity      | fitness-agent    | 🏋️    | "Rest day today. Tomorrow is your long run — hydrate." |
| Budget        | Budgy     | budget-agent     | 💰    | "You're 80% through Feb budget with 3 weeks left." |
| Tasks         | Cronny    | cron-agent       | ⏰    | "2 overdue reminders. Want me to reschedule?" |
| Knowledge     | Booky     | general-agent    | 📚    | "You're 60% through Thinking Fast and Slow." |

## What to Build

### Part 1: Reusable AgentInsight Component

Create `src/app/components/AgentInsight.tsx`

Requirements:
- Small card component, sits BELOW the main section data
- Shows: agent emoji, agent name (bold), insight text (1-2 sentences max)
- Subtle design: muted background (use Tailwind bg-slate-800/50 or similar to match existing dark theme), rounded corners, small text
- Optional "updated X ago" timestamp in muted text
- Optional dismiss button (X icon from lucide-react) that hides the card for the session (useState)
- Must match Velum's existing dark theme and design language
- No external dependencies beyond what's already installed

Props interface:
```typescript
interface AgentInsightProps {
  agent: string;       // "Nutry", "Fity", etc.
  emoji: string;       // "🥗", "🏋️", etc.
  insight: string;     // The actual text
  updatedAt?: string;  // ISO timestamp
  type?: "nudge" | "alert" | "celebration";  // subtle color hint
}
```

Type styling:
- nudge: default subtle style
- alert: subtle amber/orange left border
- celebration: subtle green left border

### Part 2: API Route for Insights

Create `src/app/api/insights/route.ts`

This is a Next.js API route that:
- GET: Returns all current insights as JSON
- POST: Accepts a new insight from the Pi (authenticated with a simple bearer token from env var INSIGHTS_API_KEY)

Data shape per insight:
```typescript
interface Insight {
  agent: string;
  agentId: string;
  emoji: string;
  insight: string;
  type: "nudge" | "alert" | "celebration";
  updatedAt: string;  // ISO
  section: "nutrition" | "fitness" | "budget" | "tasks" | "knowledge";
}
```

Storage: Use a simple in-memory Map for now (resets on cold start, which is fine). Later can migrate to Vercel KV.

POST body example:
```json
{
  "agent": "Nutry",
  "agentId": "nutrition-agent",
  "emoji": "🥗",
  "insight": "Protein low 3 days running. Add eggs at breakfast.",
  "type": "nudge",
  "section": "nutrition"
}
```

Auth: Check `Authorization: Bearer <INSIGHTS_API_KEY>` header on POST. Return 401 if missing/wrong.

GET response: Array of all insights, no auth needed (it's personal data on a personal app).

### Part 3: Hook for Fetching Insights

Create `src/app/hooks/useInsights.ts`

A custom React hook:
```typescript
function useInsights(section?: string): {
  insights: Insight[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}
```

- Fetches from /api/insights on mount
- Filters by section if provided
- Refreshes every 5 minutes (setInterval)
- Returns loading/error states

### Part 4: Integrate into Existing Dashboard

In the main page.tsx (or wherever each section renders):
- Import useInsights hook
- Import AgentInsight component
- For each dashboard section, render the matching insight card BELOW the existing content
- If no insight exists for a section, render nothing (not an empty card)

Example placement in the Nutrition section:
```tsx
{/* Existing nutrition dashboard content above */}

{nutritionInsight && (
  <AgentInsight
    agent={nutritionInsight.agent}
    emoji={nutritionInsight.emoji}
    insight={nutritionInsight.insight}
    updatedAt={nutritionInsight.updatedAt}
    type={nutritionInsight.type}
  />
)}
```

### Part 5: OpenClaw Cron Script (Pi-side)

Create a bash script at `~/clawd/scripts/push-insights.sh` that the cron agent can call.

The script:
1. Reads insight JSON files from ~/clawd/insights/*.json
2. POSTs each one to the Velum API endpoint
3. Uses the INSIGHTS_API_KEY for auth

```bash
#!/bin/bash
VELUM_URL="https://velum-five.vercel.app/api/insights"
API_KEY="${INSIGHTS_API_KEY:-your-key-here}"

for file in ~/clawd/insights/*.json; do
  [ -f "$file" ] || continue
  curl -s -X POST "$VELUM_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d @"$file"
done
```

Also create example insight files at ~/clawd/insights/ so agents know the format:
- ~/clawd/insights/nutrition.json
- ~/clawd/insights/fitness.json
- ~/clawd/insights/budget.json
- ~/clawd/insights/tasks.json
- ~/clawd/insights/knowledge.json

### Part 6: Environment Variables

Add to .env.example and document:
```
INSIGHTS_API_KEY=generate-a-random-key-here
```

On Vercel, set this same key in the project's environment variables.
On the Pi, export it so the push script can use it.

## Design Guidelines

- Match Velum's existing dark theme (look at globals.css and page.tsx for colors)
- Cards should feel like a "whisper" not a "shout" — subtle, glanceable
- Agent name in bold, insight text in normal weight
- Compact: entire card should be ~2-3 lines tall max
- Responsive: works on mobile (Velum already has mobile support per the version tag)
- No animations or transitions — keep it simple

## Implementation Order

1. AgentInsight component (with hardcoded test data first)
2. API route (GET + POST)
3. useInsights hook
4. Wire component to hook in dashboard sections
5. Push script for Pi
6. Test end-to-end

## Do NOT

- Add a database or external storage — in-memory Map is fine for now
- Change the existing dashboard layout structure
- Add new npm dependencies
- Create separate pages for insights — they live inline within existing sections
- Make the insight cards interactive beyond the dismiss button
