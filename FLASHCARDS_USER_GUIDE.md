# 🎴 Spanish Flashcard System - Ready for You!

## ✅ What I've Built

I've created a complete Anki-style flashcard system integrated into Velum with **two automatic content sources**:

### 1. Book Notes (Notion) - Auto-Extracted
- **Automatically extracts Spanish vocabulary** from your Notion book notes
- Detects patterns like:
  - `Spanish: English` format
  - **Bold terms** with definitions
  - Parenthetical translations: `palabra (meaning)`
  - Spanish phrases in quotes
- Deduplicates against existing cards
- Links back to source book notes

### 2. Online Curated - A2.1+ Starter Deck
- 10 sample cards ready to go (expandable to 500+)
- DELE A2.1 aligned vocabulary
- Example sentences and pronunciation
- Categorized by topic (travel, home, feelings, etc.)

---

## 🚀 How to Use

### Start Reviewing Right Now
1. Start the dev server:
   ```bash
   cd Velum/velum-app
   npm run dev
   ```

2. Open **Velum** and click **"Knowledge"** in the sidebar

3. Click **"Start Review"** on the progress widget

4. Study cards with the 4-button interface:
   - 🔴 **Again** - Failed, review again soon
   - 🟠 **Hard** - Got it, but was difficult
   - 🔵 **Good** - Normal difficulty (default)
   - 🟢 **Easy** - Too easy, increase interval

### Card Features
- **Click to flip** - Reveal translation
- **🔊 Speaker icon** - Hear pronunciation (browser TTS)
- **Example sentences** - Context for each word
- **Tags** - Filter and organize
- **Source badge** - Shows if from books or curated deck

---

## 📚 Setting Up Notion Integration

To auto-extract vocabulary from your book notes:

### Step 1: Create Notion Integration
1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Name it "Velum Spanish"
4. Copy the **Internal Integration Token**

### Step 2: Share Your Book Notes
1. Open your book notes database/page in Notion
2. Click **Share** → **Add connections**
3. Select "Velum Spanish"

### Step 3: Configure Environment
Create `.env.local` in `Velum/velum-app/`:
```bash
NOTION_API_KEY=secret_xxxxxxxx
NOTION_DATABASE_ID=optional_database_id
NOTION_PAGE_IDS=page_id_1,page_id_2
```

### Step 4: Install Notion SDK
```bash
cd Velum/velum-app
npm install @notionhq/client
```

### Step 5: Sync
Go to **Knowledge → Library from Alexandria** and click **"Sync Now"**

---

## 📖 Book Format (PDF vs EPUB)

You asked about PDF vs EPUB. Here's my recommendation:

| Format | Pros | Cons |
|--------|------|------|
| **EPUB** ✅ | Structured HTML, easy to parse, standard format | May lose some formatting |
| **PDF** | Preserves exact layout | Harder to extract text, often scrambled |

**Recommendation: Use EPUB** if available. It's essentially a ZIP file of HTML files that I can parse easily to extract vocabulary.

If you only have PDFs, I can still work with them, but extraction quality varies.

---

## 📁 File Structure

```
Velum/velum-app/
├── data/spanish/
│   ├── cards.json              # Your flashcards (10 sample)
│   ├── decks.json              # Deck metadata
│   └── stats-daily.json        # Your study stats
│
├── src/app/knowledge/
│   ├── page.tsx                # Knowledge hub
│   ├── spanish/
│   │   ├── page.tsx            # Spanish dashboard
│   │   └── review/
│   │       └── page.tsx        # Review session
│   └── library/
│       └── page.tsx            # Notion sync
│
└── src/components/flashcards/
    ├── Card.tsx                # Card component
    └── ProgressWidget.tsx      # Stats widget
```

---

## 🎯 Next Steps

### Immediate (This Week)
1. ✅ **Test the review session** - Try reviewing the 10 sample cards
2. ✅ **Set up Notion** (if you want book note extraction)
3. 🔄 **Expand to 500 cards** - I can generate the full A2.1 deck

### Soon (Next 2 Weeks)
4. 🎵 **Add audio** - Better pronunciation with ElevenLabs or Forvo API
5. 📱 **Mobile swipe** - Swipe gestures for reviewing on phone
6. 📊 **Better stats** - Retention graphs, study heatmaps

### For Devy (Technical)
The system is ready for Devy to:
- Wire up real-time stats API
- Add authentication for Notion
- Optimize for mobile
- Add import/export Anki deck feature

---

## 🧪 Testing the API

```bash
# Get cards due for review
curl http://localhost:3000/api/flashcards?filter=due

# Get study stats
curl http://localhost:3000/api/flashcards/stats

# Submit a review (quality: 0=again, 3=good, 4=easy)
curl -X POST http://localhost:3000/api/flashcards \
  -H "Content-Type: application/json" \
  -d '{"cardId":"es-a2-001","quality":4}'

# Sync with Notion (mock data until you add API key)
curl -X POST http://localhost:3000/api/notion/extract
```

---

## 📝 How the Auto-Extraction Works

When you sync with Notion, the system:

1. **Fetches your pages** from Notion API
2. **Scans for Spanish** using patterns:
   - `palabra: word` format
   - `**palabra** - definition`
   - `"Spanish phrase in quotes"`
3. **Assigns CEFR levels** (A1-C2) based on word frequency
4. **Creates flashcards** with source attribution
5. **Deduplicates** - Won't add if word already exists
6. **Saves to cards.json** - Ready for review

---

## ❓ Questions for You

1. **Want me to expand to 500 A2.1 cards now?** I can generate them with example sentences.

2. **Do you have Notion API access set up?** If yes, share the token and I'll configure it.

3. **Any specific book notes to test with?** Share a Notion page ID and I'll test the extraction.

4. **PDF or EPUB books?** If you upload them, I can extract vocabulary directly.

5. **Daily card limit?** Currently set to 10 new cards/day (Anki standard). Want to change this?

---

## 🎉 You're Ready to Go!

The flashcard system is live and functional. Click **Knowledge** in Velum to start learning Spanish with spaced repetition!

**Happy studying!** 🇪🇸
