# 📚 Mihai's Book Knowledge System
## LLM Handoff Document — Complete Implementation Guide

---

## 🎯 Executive Summary

| **What** | **Details** |
|----------|-------------|
| **Total Books** | 217 (100 read + 97 reviewed + 20 essential) |
| **Knowledge Domains** | 10 core areas identified |
| **Approved Feature** | Daily Book Wisdom Widget |
| **Priority** | Raw Capture (screenshots/notes) |
| **Update Frequency** | Daily at 6:00 AM |

---

## 📂 File Structure

```
📁 /home/pablissimopie/clawd/second-brain/
│
├── 📄 LLM_HANDOFF.md              ← THIS DOCUMENT
├── 📄 books-knowledge-graph.md     ← Complete knowledge base (217 books)
├── 📄 DAILY_BOOK_WISDOM_SPEC.md    ← Technical specification
├── 📄 COMPLETE_BOOK_NOTES.md       ← Notion extraction (in progress)
│
└── 📁 visualizations/
    ├── 🖼️ knowledge-graph.png      ← Visual knowledge map
    ├── 🖼️ knowledge-graph.svg      ← Interactive version
    └── 📄 VISUALIZATIONS.md        ← ASCII diagrams
```

---

## 🔐 Notion API Access

### API Key
```
ntn_w9573074197aRr7zdbLtpEzzXuPKnEeag7YzN5hD7dY5QL
```

### Database IDs

| Database | ID | Book Count |
|----------|-----|------------|
| **Books Read** | `b4332e7b-8cf4-4fbd-b138-cf6aafd4191c` | 100 |
| **Books Reviewed** | `e44ac076-1cf6-41bd-9e90-fd14565cd8c5` | 97 |
| **Essential Books** | `35a07bf8-aa0f-46aa-af71-3742fba2a788` | 20 |

### Query Examples

**Get all books from a database:**
```bash
curl -X POST "https://api.notion.com/v1/databases/DATABASE_ID/query" \
  -H "Authorization: Bearer API_KEY" \
  -H "Notion-Version: 2022-06-28"
```

**Get page content (notes, images, highlights):**
```bash
curl -X GET "https://api.notion.com/v1/blocks/PAGE_ID/children" \
  -H "Authorization: Bearer API_KEY"
```

---

## 🗂️ The 10 Knowledge Domains

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   🎯 1. Deep Work & Focus       🏆 2. Mastery & Skills          │
│      → Attention management         → Deliberate practice        │
│                                                                 │
│   🌐 3. Systems Thinking        👑 4. Leadership                │
│      → Feedback loops               → Extreme ownership          │
│                                                                 │
│   🧠 5. Psychology              🧘 6. Mindfulness               │
│      → Self-awareness               → Power of now               │
│                                                                 │
│   💼 7. Business                🗣️ 8. Communication             │
│      → Zero to One                  → Tactical empathy           │
│                                                                 │
│   🎨 9. Creativity              ⚖️ 10. Decision Making          │
│      → Big Magic                    → Mental models              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Approved Feature: Daily Book Wisdom Widget

### Design Philosophy
- NOT another note-taking app (Mihai has Notion for storage)
- Focus on action, not storage
- Context-aware recommendations
- Clean, minimal UI

### Widget Structure (3 Cards)

```
┌──────────────────────────────────────────────┐
│  📚 DAILY BOOK WISDOM                        │
│                   [↻ Refresh]                │
├──────────────────────────────────────────────┤
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │  📅 WEEKLY PRINCIPLE                   │ │
│  │                                        │ │
│  │  Domain: Deep Work & Focus             │ │
│  │  Principle: "Attention Residue"        │ │
│  │                                        │ │
│  │  Core Idea: Task switching leaves      │ │
│  │  mental residue. Focus beats multi-    │ │
│  │  tasking.                              │ │
│  │                                        │ │
│  │  Applied today?  [✓ Yes] [✗ No] [~]   │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │  💡 AI-GENERATED INSIGHT               │ │
│  │                                        │ │
│  │  You have a stakeholder meeting at     │ │
│  │  2 PM. Apply "single-tasking" from     │ │
│  │  Deep Work: Prepare in a 30-minute     │ │
│  │  block beforehand. No email during     │ │
│  │  prep.                                 │ │
│  │                                        │ │
│  │  Based on: Deep Work + your calendar   │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │  📸 RAW CAPTURE ← PRIORITY             │ │
│  │                                        │ │
│  │  [IMAGE: Screenshot from your          │ │
│  │   Notion book notes]                   │ │
│  │                                        │ │
│  │  📖 Source: Extreme Ownership          │ │
│  │  📝 Your note: "There are no bad       │ │
│  │      teams, only bad leaders..."       │ │
│  └────────────────────────────────────────┘ │
│                                              │
└──────────────────────────────────────────────┘
```

### Weekly Rotation Schedule

| Week | Domain | Example Principle |
|------|--------|-------------------|
| 1 | Deep Work | Attention Residue |
| 2 | Mastery | Deliberate Practice |
| 3 | Systems | Feedback Loops |
| 4 | Leadership | Extreme Ownership |
| 5 | Psychology | Chimp Brain Model |
| 6 | Mindfulness | Power of Now |
| 7 | Business | Zero to One |
| 8 | Communication | Tactical Empathy |
| 9 | Creativity | Permission to Create |
| 10 | Decisions | Second-Order Thinking |

### Daily Refresh (6:00 AM)

**Insight Data Sources:**
1. Calendar — Today's meetings, focus time, deadlines
2. Active Goals — Iron Man (Oct 5), PM Role (started Feb 9), Content
3. Recent Context — Yesterday's applications, current challenges
4. Book Knowledge — Relevant principles from 217-book database

**Raw Capture Selection Priority:**
1. Screenshots/images from Notion book pages
2. Highlighted passages with user notes
3. Standout quotes from Essential Books
4. Fall back to text if no images available

---

## 👤 Mihai's Context

### Active Goals

```
Iron Man 2026        ████████████████████░░░░░  Oct 5, 2026
New PM Role          ████████████████████████░  Started Feb 9
Content Creation     ██████████████░░░░░░░░░░░  Ongoing
Spanish Learning     ████████████░░░░░░░░░░░░░  Ongoing
Weight <75kg         █████████░░░░░░░░░░░░░░░░  Current: ~83kg
```

### Personal Details

| **Attribute** | **Value** |
|---------------|-----------|
| Location | Barcelona, Spain |
| Wake Time | 7:00 AM |
| Best Focus Hours | 8:00 AM - 12:00 PM |
| Communication Style | Casual, direct with "ask first" |
| Core Value | Consistency over intensity |

---

## 🚀 Implementation Roadmap

### Phase 1: Data Layer
- [ ] Create `daily-book-wisdom.json`
- [ ] Define 10-week rotation
- [ ] Set up tracking structure

### Phase 2: Widget UI
- [ ] Build HTML/CSS component
- [ ] Make responsive (mobile/desktop)
- [ ] Fallback: show only Raw Capture if space limited

### Phase 3: AI Insight Generation
- [ ] Connect to calendar API
- [ ] Build contextual insight prompt
- [ ] Integrate with active goals

### Phase 4: Dashboard Integration
- [ ] Add to Daily Foundation dashboard
- [ ] Set up 6 AM cron job refresh
- [ ] Track user interactions

---

## 🎨 Style Guide

```css
/* Color Palette */
--background: #f7fafc;      /* Light gray */
--border: #e2e8f0;          /* Subtle gray */
--accent: #ed8936;          /* Orange */
--text: #4a5568;            /* Dark gray */
--priority: #e53e3e;        /* Red (Raw Capture) */

/* Typography */
Font: system-ui, -apple-system, sans-serif
Headings: 1.25rem, weight 600
Body: 0.875rem, weight 400
Badges: 0.75rem, uppercase
```

---

## 📊 Success Metrics

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Daily Views | >5x/week | Engagement with knowledge |
| Application Rate | >60% | Knowledge to action conversion |
| Insight Relevance | >4/5 rating | Context awareness quality |
| Captures Saved | >2/week | Value identification |

---

## ❓ Questions for Mihai

Before implementation:

1. **Dashboard location?** Sidebar widget or main panel?
2. **Mobile view?** Collapsible accordion or separate view?
3. **Notifications?** Daily ping or passive display?
4. **Images?** Proxy from Notion or direct links?

---

## 📥 Download This Document

### Option 1: SCP
```bash
scp pablissimopie@rasppi5.tail5b3227.ts.net:/home/pablissimopie/clawd/second-brain/LLM_HANDOFF.md ~/Downloads/
```

### Option 2: HTTP (from Raspberry Pi)
```
https://rasppi5.tail5b3227.ts.net:3001/LLM_HANDOFF.md
```

### Option 3: Copy on Pi
```bash
cp /home/pablissimopie/clawd/second-brain/LLM_HANDOFF.md ~/Desktop/
```

---

## 📚 Related Files

| File | Location | Purpose |
|------|----------|---------|
| Complete base | `books-knowledge-graph.md` | 217 books categorized |
| Technical spec | `DAILY_BOOK_WISDOM_SPEC.md` | Implementation details |
| Visual map | `visualizations/knowledge-graph.png` | Knowledge network |

---

## ✨ TL;DR for Claude/LLM

> **Mihai has 217 books in Notion. Approved widget: "Daily Book Wisdom" with 3 cards (Weekly Principle + AI Insight + Raw Capture). Priority: Raw Capture. 10-domain weekly rotation. Daily 6 AM refresh. Use Notion API for captures. Insights based on calendar + goals.**

---

*Self-contained document. Any Claude/LLM can continue implementation.*

**📍 Location:** `/home/pablissimopie/clawd/second-brain/LLM_HANDOFF.md`  
**📅 Last Updated:** 2026-02-05  
**✅ Status:** Ready for Implementation
