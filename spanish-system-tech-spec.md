# Spanish Learning System - Technical Specification

## 1. DATABASE SCHEMA

### Decks table (unified Spanish deck)
```sql
create table decks (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null,
  description text,
  level varchar(10), -- A2.1, B1, etc.
  source_tags text[], -- ['top5000', 'conjugacion', 'refold']
  created_at timestamp default now()
);
```

### Flashcards (Anki-style)
```sql
create table flashcards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid references decks(id),
  spanish_word varchar(255) not null,
  english_translation text not null,
  example_sentence_spanish text,
  example_sentence_english text,
  pronunciation_ipa varchar(255),
  word_type varchar(50), -- verb, noun, adjective, etc.
  tags text[], -- grammar concepts
  source varchar(100), -- which original deck
  is_duplicate boolean default false,
  unique(spanish_word, deck_id),
  created_at timestamp default now()
);
```

### User card progress (spaced repetition)
```sql
create table user_card_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  card_id uuid references flashcards(id),
  ease_factor float default 2.5,
  interval integer default 0, -- days until next review
  repetitions integer default 0,
  last_reviewed timestamp,
  next_review timestamp,
  status varchar(20) default 'new', -- new, learning, review, relearning
  unique(user_id, card_id)
);
```

### Daily exercise sessions
```sql
create table exercise_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_date date not null,
  flashcards_completed integer default 0,
  flashcards_target integer default 20,
  exercises_completed jsonb default '{}', -- {verb_drill: 5, cloze: 3, ...}
  total_duration_minutes integer,
  created_at timestamp default now()
);
```

### Exercise types
```sql
create table exercises (
  id uuid primary key default gen_random_uuid(),
  type varchar(50) not null, -- verb_conjugation, cloze, listening, writing, translation, grammar, shadowing
  difficulty varchar(10), -- A2.1, B1, etc.
  content jsonb not null, -- exercise-specific data
  answer_key jsonb,
  tags text[],
  created_at timestamp default now()
);
```

### reMarkable notes integration
```sql
create table remarkable_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  remarkable_id varchar(255) not null,
  raw_text text,
  processed_text text,
  extracted_cards jsonb default '[]',
  status varchar(20) default 'pending', -- pending, processed, converted_to_cards
  created_at timestamp default now(),
  week_number integer -- for weekly review scheduling
);
```

### Weekly review schedule
```sql
create table weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  week_number integer not null,
  year integer not null,
  cards_from_remarkable uuid[] default '{}',
  is_completed boolean default false,
  review_date date,
  unique(user_id, week_number, year)
);
```

## 2. API ENDPOINTS

### Anki Deck Import
```
POST /api/spanish/decks/import
Body: {
  source: 'anki_file' | 'top5000' | 'conjugacion' | 'refold',
  file?: File,
  merge_strategy: 'skip_duplicates' | 'update_existing'
}
```

### Flashcard Operations
```
GET    /api/spanish/cards/due?date=today&limit=20
POST   /api/spanish/cards/:id/review
Body:  { result: 'again' | 'hard' | 'good' | 'easy' }
GET    /api/spanish/cards/progress?period=daily|weekly
```

### Exercise System
```
GET    /api/spanish/exercises/daily
Query:  { level: 'A2.1', mix: 'balanced'|'focused' }

POST   /api/spanish/exercises/:id/submit
GET    /api/spanish/exercises/progress
```

### reMarkable Integration
```
POST   /api/spanish/remarkable/sync
GET    /api/spanish/remarkable/notes?status=pending
POST   /api/spanish/remarkable/notes/:id/process
POST   /api/spanish/remarkable/notes/:id/convert-to-cards
```

## 3. FRONTEND COMPONENTS

### Progress Header Widget
```tsx
interface SpanishProgressWidgetProps {
  dailyProgress: { completed: number; target: number };
  weeklyProgress: { completed: number; target: number };
  streak: number;
}
```

### Daily Practice Page
```tsx
<DailyPracticePage>
  <FlashcardSection cards={dueCards} onReview={handleReview} />
  <ExercisePanel>
    <VerbDrill exercise={exercises.verb_drill} />
    <ClozeExercise exercise={exercises.cloze} />
    <ListeningExercise audioUrl={...} transcript={...} />
    <WritingExercise prompt={...} />
    <TranslationExercise pair={...} />
    <GrammarQuiz questions={...} />
    <ShadowingExercise audioUrl={...} />
  </ExercisePanel>
</DailyPracticePage>
```

### Knowledge Section Layout
```tsx
<KnowledgeLayout>
  <SpanishSection>
    <DeckManager />
    <CardBrowser />
    <RemarkableSyncStatus />
  </SpanishSection>
  <LibraryOfAlexandriaSection>
    <BookList />
    <NoteExtractor />
    <SpanishVocabFinder />
  </LibraryOfAlexandriaSection>
</KnowledgeLayout>
```

## 4. SERVICES

### AnkiImportService
```typescript
class AnkiImportService {
  async importTop5000(): Promise<Flashcard[]>
  async importConjugacion(): Promise<Flashcard[]>
  async importRefold(): Promise<Flashcard[]>
  
  // Merge strategy: spanish_word is unique key
  async mergeDecks(decks: Flashcard[][]): Promise<{
    added: number;
    duplicates: number;
    merged: Flashcard[];
  }>
}
```

### RemarkableService
```typescript
class RemarkableService {
  async authenticate(token: string): Promise<void>
  async listNotebooks(): Promise<Notebook[]>
  async extractText(notebookId: string): Promise<string>
  
  async processToCards(text: string): Promise<{
    spanish: string;
    english: string;
    context: string;
    weekNumber: number;
  }[]>
  
  async scheduleWeeklyReview(cards: Card[], weekOffset: number): Promise<void>
}
```

### SpacedRepetitionService (SM-2 Algorithm)
```typescript
class SpacedRepetitionService {
  calculateNextReview(
    card: UserCardProgress,
    result: 'again' | 'hard' | 'good' | 'easy'
  ): {
    nextReview: Date;
    interval: number;
    easeFactor: number;
  }
}
```

## 5. EXERCISE CONTENT STRUCTURES

### Verb Conjugation
```typescript
interface VerbDrillExercise {
  verb: string; // 'hablar'
  tenses: string[]; // ['present', 'preterite', 'imperfect']
  pronouns: string[]; // ['yo', 'tú', 'él/ella', 'nosotros', 'ellos']
  blanks: number;
  mixed: boolean;
}
```

### Cloze
```typescript
interface ClozeExercise {
  text: string; // 'María ____ (ir) al mercado ayer.'
  answer: string; // 'fue'
  hint: string;
  difficulty: string;
}
```

### Listening
```typescript
interface ListeningExercise {
  audioUrl: string;
  transcript: string;
  questions: Array<{
    question: string;
    options: string[];
    correct: number;
  }>;
  shadowingSegment: { start: number; end: number };
}
```

### Writing
```typescript
interface WritingExercise {
  prompt: string;
  minWords: number;
  suggestedVocabulary: string[];
  exampleAnswer: string;
}
```

### Translation
```typescript
interface TranslationExercise {
  direction: 'en-to-es' | 'es-to-en';
  sourceText: string;
  acceptableAnswers: string[];
  hint?: string;
}
```

### Grammar Quiz
```typescript
interface GrammarQuizExercise {
  topic: 'ser-vs-estar' | 'subjunctive' | 'por-vs-para';
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}
```

### Shadowing
```typescript
interface ShadowingExercise {
  audioUrl: string;
  segment: { start: number; end: number };
  repetitions: number;
  instructions: string;
}
```

## 6. DATA FLOWS

### Anki Import Flow
1. User uploads Anki .apkg files OR selects presets
2. Parse each deck → extract cards
3. Deduplicate by spanish_word (keep first, tag others)
4. Store in flashcards table
5. Initialize user_card_progress for each (status: 'new')

### Daily Practice Flow
1. Load cards due for today (next_review <= now)
2. Generate exercise mix based on user level
3. User completes flashcards → update SR algorithm
4. User completes exercises → track progress
5. Update daily widget stats

### reMarkable Flow
1. User writes notes in class (reMarkable)
2. Sync triggered → download notebook
3. OCR/handwriting recognition → extract text
4. LLM processes → identify Spanish vocabulary/grammar
5. Create flashcards with week_number = current_week + 1
6. Cards appear in review queue next week

## 7. ENVIRONMENT VARIABLES

```bash
# reMarkable Cloud Integration
REMARKABLE_TOKEN=xxx
REMARKABLE_SYNC_INTERVAL=3600 # seconds

# Anki Import
ANKI_IMPORT_BATCH_SIZE=100

# Spaced Repetition Defaults
SR_DEFAULT_EASE=2.5
SR_DEFAULT_INTERVAL=0
SR_LEARNING_STEPS=1,10 # minutes
```
