/**
 * Flashcard TypeScript Types
 */

export type QualityRating = 0 | 1 | 2 | 3 | 4 | 5;

export type CardSource = 'notion_book' | 'online_curated';

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type CardCategory = 'vocabulary' | 'phrase' | 'expression' | 'grammar' | 'idiom';

export interface ReviewLog {
  date: string;
  quality: QualityRating;
  timeSpentMs?: number;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  pronunciation?: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  
  // Categorization
  source: CardSource;
  sourceRef?: string;
  cefrLevel: CEFRLevel;
  category: CardCategory;
  tags: string[];
  
  // Spaced Repetition (SM-2)
  interval: number;
  repetitions: number;
  easeFactor: number;
  dueDate: string | null;
  
  // Metadata
  createdAt: string;
  lastReviewed?: string;
  reviewHistory: ReviewLog[];
}

export interface Deck {
  id: string;
  name: string;
  description: string;
  source: 'notion' | 'online' | 'mixed';
  cefrLevel: CEFRLevel;
  cardCount: number;
  newCardsPerDay: number;
  reviewOrder: 'due' | 'random' | 'mixed';
  createdAt: string;
  version: string;
}

export interface DailyStats {
  date: string;
  newCardsStudied: number;
  reviewsCompleted: number;
  correctRate: number;
  timeSpentMinutes: number;
}

export interface WeeklyStats {
  weekStart: string;
  totalCardsStudied: number;
  newCardsAdded: number;
  averageRetention: number;
  studyDays: number;
}

export interface StudySession {
  date: string;
  cardsReviewed: string[];
  startTime: string;
  endTime?: string;
}

// Notion extraction types
export interface NotionExtractionConfig {
  integrationToken: string;
  databaseId?: string;
  pageIds?: string[];
  recursive?: boolean;
}

export interface ExtractedCardCandidate {
  spanish: string;
  english: string;
  context?: string;
  type: CardCategory;
  confidence: number;  // 0-1, extraction confidence
  sourceLocation: string;  // Page ID or URL
}

// API Response types
export interface ReviewRequest {
  cardId: string;
  quality: QualityRating;
  timeSpentMs?: number;
}

export interface ReviewResponse {
  success: boolean;
  card: Flashcard;
  nextDue: string;
}

export interface StatsResponse {
  totalCards: number;
  newCards: number;
  dueCards: number;
  studiedToday: number;
  streakDays: number;
  weeklyProgress: WeeklyStats;
}
