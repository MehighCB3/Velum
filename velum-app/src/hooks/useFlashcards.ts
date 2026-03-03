'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ── Query keys ──────────────────────────────────────────────────
export const flashcardKeys = {
  all: ['flashcards'] as const,
  due: (limit?: number) => ['flashcards', 'due', limit ?? 20] as const,
  stats: ['flashcards', 'stats'] as const,
};

// ── Types ───────────────────────────────────────────────────────
interface FlashcardData {
  id: string;
  front: string;
  back: string;
  pronunciation?: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  source: 'notion_book' | 'online_curated';
  sourceRef?: string;
  tags: string[];
  interval: number;
  repetitions: number;
  easeFactor: number;
}

interface CardsResponse {
  cards: FlashcardData[];
  total: number;
  dueCount: number;
  newCount: number;
}

interface StatsResponse {
  totalCards: number;
  newCards: number;
  dueCards: number;
  studiedToday: number;
  streakDays: number;
  weeklyTotal: number;
  todayStats: { date: string; cardsStudied: number; correctAnswers: number } | null;
  recentStats: Array<{ date: string; cardsStudied: number; correctAnswers: number }>;
}

// ── Hooks ───────────────────────────────────────────────────────

/** Fetch due cards with stale-while-revalidate caching */
export function useDueCards(limit = 20) {
  return useQuery<CardsResponse>({
    queryKey: flashcardKeys.due(limit),
    queryFn: async () => {
      const res = await fetch(`/api/flashcards?filter=due&limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch cards');
      return res.json();
    },
    staleTime: 60_000, // Cards stay fresh 1 min
  });
}

/** Fetch stats with aggressive caching */
export function useFlashcardStats() {
  return useQuery<StatsResponse>({
    queryKey: flashcardKeys.stats,
    queryFn: async () => {
      const res = await fetch('/api/flashcards/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    staleTime: 30_000, // Stats stay fresh 30s
  });
}

/** Submit a review with optimistic cache updates */
export function useSubmitReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cardId, quality }: { cardId: string; quality: number }) => {
      const res = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId, quality }),
      });
      if (!res.ok) throw new Error('Failed to submit review');
      return res.json();
    },
    // Optimistically update stats count
    onMutate: async ({ quality }) => {
      // Cancel outgoing stats refetches
      await queryClient.cancelQueries({ queryKey: flashcardKeys.stats });

      const previousStats = queryClient.getQueryData<StatsResponse>(flashcardKeys.stats);

      if (previousStats) {
        queryClient.setQueryData<StatsResponse>(flashcardKeys.stats, {
          ...previousStats,
          dueCards: Math.max(0, previousStats.dueCards - 1),
          studiedToday: previousStats.studiedToday + 1,
        });
      }

      return { previousStats };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousStats) {
        queryClient.setQueryData(flashcardKeys.stats, context.previousStats);
      }
    },
    onSettled: () => {
      // Refetch in background to ensure consistency
      queryClient.invalidateQueries({ queryKey: flashcardKeys.stats });
    },
  });
}
