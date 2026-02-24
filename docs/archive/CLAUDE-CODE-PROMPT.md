# Claude Code Prompt — Paste This First

Copy everything below and paste it as your first message in Claude Code:

---

I'm redesigning my Velum wellness app. I have two reference files:

1. `VELUM-V2-SPEC.md` — Complete implementation spec with every screen detailed, data structures, interactions, API notes, and design tokens
2. `velum-redesign.jsx` — Working React reference implementation of all screens with exact layout, colors, state management, and mock data

Please start by:
1. Reading both files completely
2. Scanning my existing codebase to understand the current tech stack, file structure, component patterns, and API setup
3. Then tell me what you found and propose a plan for implementing the redesign screen by screen

Do NOT start coding yet. First give me the plan so I can confirm.

---

# After Claude Code gives you the plan, reply with:

---

Looks good. Start with the shared components (DarkCard, Card, ProgressRing, BarMini, SectionTitle, WeekNav, Pill, SmallBtn, BottomNav) following the design tokens in the spec. Then move to Screen 1: Home.

After each screen, show me what changed and verify it renders before moving to the next.

---

# If you want Claude Code to do it all in one shot instead, paste this:

---

I'm redesigning my Velum wellness app. Read these two files:
1. `VELUM-V2-SPEC.md` — Full implementation spec
2. `velum-redesign.jsx` — Working React reference

Scan my codebase to understand the stack, then implement the full redesign following the spec exactly. Work through it in this order:
1. Shared components using the design tokens
2. Home screen (with clickable year events)
3. Nutrition Today (with meal detail sub-view)
4. Nutrition 30 Days (calendar circle grid)
5. Fitness (unified dark card with health data)
6. Budget (with month comparison chart)
7. Goals (with progress update + edit buttons)
8. Feed (new screen — X posts + MyMind items)
9. Profile (formatted dates, clean layout)
10. Remove Spanish tab, remove flight widget, update bottom nav

Use the JSX file as your visual/structural reference. Adapt it to match my existing tech stack. Connect to existing API endpoints where applicable, use mock data where endpoints don't exist yet.
