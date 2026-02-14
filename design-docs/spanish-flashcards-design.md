# Velum Spanish Flashcard System - Design Document

## Overview
Auto-generating Anki-style flashcards from two sources:
1. **Book Notes (Notion)** - Extract Spanish vocabulary from user's reading
2. **Online Sources** - Curated A2.1+ Spanish learning content

---

## 1. Content Structure

### Card Schema
```typescript
interface Flashcard {
  id: string;                    // UUID
  front: string;                 // Spanish word/phrase (question)
  back: string;                  // English translation (answer)
  pronunciation?: string;        // IPA or phonetic
  exampleSentence?: string;      // Usage in context
  exampleTranslation?: string;   // English translation of example
  
  // Categorization
  source: 'notion_book' | 'online_curated';
  sourceRef?: string;            // Book title / URL / Lesson name
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  category: 'vocabulary' | 'phrase' | 'expression' | 'grammar' | 'idiom';
  tags: string[];                // e.g., ["travel", "food", "past-tense"]
  
  // Spaced Repetition (SM-2 Algorithm)
  interval: number;              // Days until next review
  repetitions: number;           // Times successfully reviewed
  easeFactor: number;            // Default 2.5, adjusts based on performance
  dueDate: string;               // ISO date (YYYY-MM-DD)
  
  // Metadata
  createdAt: string;
  lastReviewed?: string;
  reviewHistory: ReviewLog[];
}

interface ReviewLog {
  date: string;
  quality: 0 | 1 | 2 | 3 | 4 | 5;  // 0=again, 5=easy
  timeSpentMs?: number;
}
```

### Deck Organization
```typescript
interface Deck {
  id: string;
  name: string;
  description: string;
  source: 'notion' | 'online' | 'mixed';
  cards: string[];               // Card IDs
  newCardsPerDay: number;        // Default: 10
  reviewOrder: 'due' | 'random' | 'mixed';
}
```

---

## 2. Source 1: Notion Book Notes Extraction

### Extraction Strategy

The Notion pages contain book notes. We need to:
1. **Fetch pages** via Notion API
2. **Identify Spanish content** using language detection
3. **Extract vocabulary** using patterns and NLP

### Spanish Detection Patterns
```javascript
// Pattern-based extraction (regex + heuristics)
const EXTRACTION_PATTERNS = {
  // "Spanish: English" format
  vocabularyPair: /^([a-záéíóúñü]+)\s*[:\-]\s*(.+)$/i,
  
  // Quotes in Spanish
  spanishQuote: /"([^"]*[áéíóúñ][^"]*)"/gi,
  
  // Highlighted terms (marked with ** or _)
  highlightedTerm: /\*\*([a-záéíóúñü ]+)\*\*|_([a-záéíóúñü ]+)_/gi,
  
  // "word (meaning)" pattern
  parenthetical: /([a-záéíóúñü]+)\s*\(([^)]+)\)/gi,
  
  // Common Spanish words to flag context
  spanishIndicators: ['el', 'la', 'los', 'las', 'un', 'una', 'es', 'son', 'está', 'hay']
};
```

### NLP-Enhanced Extraction (OpenAI/Claude API)
For more complex notes, use LLM to extract:
```
Input: Raw Notion page content (book notes)
Output: Array of {spanish, english, context, type}

System Prompt:
"Extract Spanish vocabulary and phrases from these book notes. 
Return JSON with: spanish (the word/phrase), english (translation), 
context (sentence from notes), type (word/phrase/expression)."
```

### Notion API Integration
```typescript
// Required: NOTION_API_KEY, NOTION_DATABASE_ID (or page IDs)

interface NotionConfig {
  integrationToken: string;
  databaseId?: string;        // If using a database of book notes
  pageIds?: string[];         // Specific pages to scan
  recursive?: boolean;        // Scan linked pages?
}

// Extraction Pipeline
1. Fetch pages from Notion API
2. Convert blocks to plain text
3. Run pattern matching for quick wins
4. Run LLM extraction for complex content
5. Deduplicate against existing cards
6. Assign CEFR levels (via external API or LLM)
7. Save to cards.json
```

---

## 3. Source 2: Online Curated Sources

### Recommended A2.1+ Sources

| Source | Type | API/Scrape | Content |
|--------|------|------------|---------|
| **SpanishDict** | Dictionary + Examples | Unofficial API | Words with audio/examples |
| **Reverso Context** | Bilingual examples | Scrape-friendly | Example sentences |
| **Cervantes Institute** | Official A2.1 content | Public resources | Structured vocabulary lists |
| **Dreaming Spanish** | Comprehensible input | N/A (reference) | Topic-based word lists |
| **News in Slow Spanish** | Current events | RSS/API | Topical vocabulary |
| **1001 Spanish Words** | Frequency list | Static import | Most common words |

### Implementation Priority
1. **Tier 1 (Immediate)**: Static A2.1 vocabulary lists (JSON import)
2. **Tier 2 (Week 1)**: SpanishDict API for word enrichment
3. **Tier 3 (Week 2)**: Reverso Context for example sentences

### Static A2.1 Starter Deck (500 words)
```json
{
  "source": "curated_a2_list",
  "description": "Core A2.1 Spanish vocabulary from DELE syllabus",
  "cards": [
    {
      "front": "acogedor",
      "back": "cozy, welcoming",
      "cefrLevel": "A2",
      "category": "vocabulary",
      "tags": ["adjectives", "home"]
    },
    // ... 499 more
  ]
}
```

---

## 4. Auto-Generation Pipeline

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Notion API    │────▶│  Text Extractor │────▶│  NLP Processor  │
│  (Book Notes)   │     │  (Pattern/LLM)  │     │ (CEFR/Tagging)  │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
┌─────────────────┐     ┌─────────────────┐              │
│  Online Sources │────▶│  Content Fetch  │──────────────┘
│ (APIs/Scrapers) │     │   & Normalize   │
└─────────────────┘     └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Deduplicator  │────▶ Skip if card exists
                    │   (Hash/Embed)  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   Card Creator  │────▶ cards.json
                    │   (SM-2 init)   │
                    └─────────────────┘
```

### Deduplication Strategy
- Use semantic similarity (embeddings) to catch duplicates
- Hash on normalized front+back text for exact matches
- Check against existing card database before adding

### CEFR Level Detection
- Option A: LLM classifier ("What CEFR level is this word?")
- Option B: Reference against known A2/B1 lists
- Option C: Manual tagging for curated content

---

## 5. Spaced Repetition Algorithm (SM-2)

```typescript
function calculateNextReview(card: Flashcard, quality: number): Flashcard {
  // quality: 0=again, 3=good, 4=easy, 5=very easy
  
  let { interval, repetitions, easeFactor } = card;
  
  if (quality < 3) {
    // Failed - reset
    repetitions = 0;
    interval = 1;
  } else {
    // Success - increase interval
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(interval * easeFactor);
  }
  
  // Update ease factor
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  easeFactor = Math.max(1.3, easeFactor);  // Minimum ease factor
  
  const dueDate = addDays(new Date(), interval);
  
  return { ...card, interval, repetitions, easeFactor, dueDate };
}
```

---

## 6. Progress Widget Design

```typescript
interface DailyStats {
  date: string;
  newCardsStudied: number;
  reviewsCompleted: number;
  correctRate: number;           // % correct (quality >= 3)
  timeSpentMinutes: number;
  streakDays: number;
}

interface WeeklyStats {
  weekStart: string;
  totalCardsStudied: number;
  newCardsAdded: number;
  averageRetention: number;
  studyDays: number;             // Days with activity
}
```

### Widget UI (in Knowledge section header)
```
┌─────────────────────────────────────────────┐
│  📚 Spanish Flashcards                       │
│  ─────────────────────────────────────────  │
│  📅 Today: 12 reviews due | 5 new cards     │
│  🔥 Streak: 7 days                          │
│  📊 This week: 45 cards studied             │
│  [     Start Review Session     ]           │
└─────────────────────────────────────────────┘
```

---

## 7. File Structure

```
velum-app/
├── src/
│   ├── app/
│   │   ├── (sections)/
│   │   │   └── knowledge/
│   │   │       ├── page.tsx              # Knowledge hub
│   │   │       ├── spanish/
│   │   │       │   ├── page.tsx          # Spanish section
│   │   │       │   ├── review/
│   │   │       │   │   └── page.tsx      # Active review session
│   │   │       │   └── stats/
│   │   │       │       └── page.tsx      # Progress & stats
│   │   │       └── library/
│   │   │           └── page.tsx          # Library from Alexandria
│   │   └── api/
│   │       ├── flashcards/
│   │       │   ├── route.ts              # CRUD for cards
│   │       │   ├── review/
│   │       │   │   └── route.ts          # Submit review
│   │       │   ├── stats/
│   │       │   │   └── route.ts          # Get stats
│   │       │   └── sync/
│   │       │       └── route.ts          # Trigger sync from sources
│   │       └── notion/
│   │           └── extract/
│   │               └── route.ts          # Extract Spanish from Notion
│   ├── components/
│   │   ├── flashcards/
│   │   │   ├── Card.tsx                  # Individual card component
│   │   │   ├── ReviewSession.tsx         # Full review UI
│   │   │   ├── ProgressWidget.tsx        # Stats widget
│   │   │   └── DeckBrowser.tsx           # Browse/filter cards
│   │   └── knowledge/
│   │       ├── KnowledgeNav.tsx          # Section navigation
│   │       └── SourceBadge.tsx           # Notion/Online indicator
│   └── lib/
│       ├── flashcards/
│       │   ├── sm2.ts                    # SM-2 algorithm
│       │   ├── extractor.ts              # Content extraction logic
│       │   └── dedup.ts                  # Deduplication
│       └── notion/
│           └── client.ts                 # Notion API client
│
├── data/
│   ├── spanish/
│   │   ├── cards.json                    # All flashcards
│   │   ├── decks.json                    # Deck definitions
│   │   ├── user-progress.json            # User's review data
│   │   ├── stats-daily.json              # Daily statistics
│   │   └── curated-a2-starter.json       # Pre-made A2.1 deck
│   └── notion/
│       └── extracted-cache.json          # Last extraction results
│
└── scripts/
    ├── sync-notion.js                    # Manual sync script
    ├── import-curated.js                 # Import static decks
    └── seed-a2-vocabulary.js             # Initial A2.1 seed
```

---

## 8. Environment Variables

```bash
# Notion Integration
NOTION_API_KEY=secret_xxx
NOTION_DATABASE_ID=xxx
NOTION_BOOK_PAGE_IDS=page1,page2,page3  # Optional: specific pages

# Optional: LLM for enhanced extraction
OPENAI_API_KEY=sk-xxx  # or ANTHROPIC_API_KEY

# Optional: External Spanish APIs
SPANISHDICT_API_KEY=xxx
```

---

## 9. MVP Implementation Phases

### Phase 1: Foundation (This week)
- [ ] Card schema & storage (JSON files)
- [ ] SM-2 algorithm implementation
- [ ] Basic review UI (flip cards + 4 buttons)
- [ ] Progress widget
- [ ] Import curated A2.1 starter deck (500 words)

### Phase 2: Notion Integration (Week 2)
- [ ] Notion API connection
- [ ] Pattern-based extraction
- [ ] Deduplication system
- [ ] Manual trigger for sync

### Phase 3: Automation (Week 3)
- [ ] Scheduled sync (daily/hourly)
- [ ] LLM-enhanced extraction
- [ ] CEFR auto-classification
- [ ] Online source integration

### Phase 4: Polish (Week 4)
- [ ] Audio pronunciation (TTS or API)
- [ ] Offline support (localStorage backup)
- [ ] Import/export Anki decks
- [ ] Mobile-optimized review UI

---

## 10. Open Questions for Devy

1. **Storage**: Start with JSON files or go straight to Vercel Postgres?
2. **Notion auth**: Does the user already have a Notion integration, or do we need to set one up?
3. **LLM usage**: Should we use OpenAI/Claude for extraction, or keep it pattern-based initially?
4. **Review UI**: Modal overlay (like current Velum patterns) or dedicated page?
5. **Sync frequency**: Real-time (webhook), scheduled (cron), or manual trigger?

---

*Document Version: 1.0*
*Ready for Devy review*
