/**
 * SM-2 Spaced Repetition Algorithm
 * Based on the SuperMemo-2 algorithm used by Anki
 */

export interface ReviewResult {
  interval: number;
  repetitions: number;
  easeFactor: number;
  dueDate: Date;
}

export type QualityRating = 0 | 1 | 2 | 3 | 4 | 5;

export const QUALITY_LABELS: Record<QualityRating, string> = {
  0: 'Again',    // Complete blackout
  1: 'Again',    // Incorrect response
  2: 'Hard',     // Correct with difficulty
  3: 'Good',     // Correct with hesitation
  4: 'Easy',     // Correct, perfect response
  5: 'Easy',     // Correct, response before shown
};

export const QUALITY_COLORS: Record<QualityRating, string> = {
  0: 'bg-red-500 hover:bg-red-600',
  1: 'bg-red-500 hover:bg-red-600',
  2: 'bg-orange-500 hover:bg-orange-600',
  3: 'bg-blue-500 hover:bg-blue-600',
  4: 'bg-green-500 hover:bg-green-600',
  5: 'bg-green-500 hover:bg-green-600',
};

/**
 * Calculate the next review date using SM-2 algorithm
 * 
 * @param interval - Current interval in days
 * @param repetitions - Number of successful reviews
 * @param easeFactor - Current ease factor (starts at 2.5)
 * @param quality - Quality of response (0-5)
 * @returns Updated review parameters
 */
export function calculateNextReview(
  interval: number,
  repetitions: number,
  easeFactor: number,
  quality: QualityRating
): ReviewResult {
  // Minimum ease factor is 1.3
  const MIN_EASE_FACTOR = 1.3;
  
  let newInterval: number;
  let newRepetitions: number;
  let newEaseFactor: number;

  if (quality < 3) {
    // Failed - reset repetitions and use a short interval
    newRepetitions = 0;
    newInterval = 1;
  } else {
    // Success - increase repetitions and interval
    newRepetitions = repetitions + 1;
    
    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
  }

  // Update ease factor
  // Formula: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  
  // Ensure ease factor doesn't drop below minimum
  newEaseFactor = Math.max(MIN_EASE_FACTOR, newEaseFactor);

  // Calculate due date
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + newInterval);

  return {
    interval: newInterval,
    repetitions: newRepetitions,
    easeFactor: newEaseFactor,
    dueDate,
  };
}

/**
 * Get the interval that would result from a given quality rating
 * Useful for showing "4 days" or "1 week" on the review buttons
 */
export function getPreviewInterval(
  currentInterval: number,
  repetitions: number,
  easeFactor: number,
  quality: QualityRating
): string {
  const result = calculateNextReview(currentInterval, repetitions, easeFactor, quality);
  return formatInterval(result.interval);
}

/**
 * Format an interval in days to a human-readable string
 */
export function formatInterval(days: number): string {
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  if (days === 7) return '1 week';
  if (days < 30) return `${Math.round(days / 7)} weeks`;
  if (days < 365) return `${Math.round(days / 30)} months`;
  return `${Math.round(days / 365)} years`;
}

/**
 * Check if a card is due for review
 */
export function isCardDue(dueDate: string | Date | null): boolean {
  if (!dueDate) return true; // New cards are always due
  
  const due = new Date(dueDate);
  const now = new Date();
  
  // Set both to midnight for date comparison
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  
  return due <= now;
}

/**
 * Calculate study statistics
 */
export interface StudyStats {
  totalCards: number;
  newCards: number;
  dueCards: number;
  studiedToday: number;
  correctToday: number;
  streakDays: number;
}

export function calculateStats(
  cards: Array<{
    dueDate: string | null;
    repetitions: number;
    reviewHistory: Array<{ date: string; quality: QualityRating }>;
  }>,
  dailyHistory: Array<{ date: string; cardsStudied: number; correctAnswers: number }>
): StudyStats {
  const today = new Date().toISOString().split('T')[0];
  
  const newCards = cards.filter(c => c.repetitions === 0).length;
  const dueCards = cards.filter(c => isCardDue(c.dueDate)).length;
  
  const todayStats = dailyHistory.find(h => h.date === today);
  const studiedToday = todayStats?.cardsStudied || 0;
  const correctToday = todayStats?.correctAnswers || 0;
  
  // Calculate streak
  let streakDays = 0;
  const sortedHistory = [...dailyHistory].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  for (const day of sortedHistory) {
    if (day.cardsStudied > 0) {
      streakDays++;
    } else {
      break;
    }
  }

  return {
    totalCards: cards.length,
    newCards,
    dueCards,
    studiedToday,
    correctToday,
    streakDays,
  };
}
