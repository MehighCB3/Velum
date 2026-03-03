'use client';

import React, { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { Card, EmptyState, CardSkeleton } from '@/components/flashcards/Card';
import { QualityRating } from '@/lib/flashcards/sm2';
import { useDueCards, useSubmitReview } from '@/hooks/useFlashcards';

export default function ReviewPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0 });
  const reviewStartTime = useRef(Date.now());

  const { data, isLoading } = useDueCards(20);
  const reviewMutation = useSubmitReview();

  const cards = data?.cards ?? [];
  const currentCard = cards[currentIndex];
  const remainingCount = Math.max(0, cards.length - currentIndex);
  const isComplete = !isLoading && cards.length > 0 && currentIndex >= cards.length;

  const handleReview = useCallback(
    (quality: QualityRating) => {
      const card = cards[currentIndex];
      if (!card) return;

      // Optimistic: advance to next card IMMEDIATELY
      setSessionStats(prev => ({
        reviewed: prev.reviewed + 1,
        correct: quality >= 3 ? prev.correct + 1 : prev.correct,
      }));
      setCurrentIndex(prev => prev + 1);
      reviewStartTime.current = Date.now();

      // Fire-and-forget: submit review in background
      reviewMutation.mutate({ cardId: card.id, quality });
    },
    [cards, currentIndex, reviewMutation]
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/knowledge"
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Link>
              <div>
                <h1 className="text-lg font-bold text-slate-800">Review Session</h1>
                <p className="text-sm text-slate-500">
                  {isLoading ? 'Loading...' : `${remainingCount} cards remaining`}
                </p>
              </div>
            </div>

            {!isLoading && !isComplete && (
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-800">
                    {sessionStats.reviewed} reviewed
                  </div>
                  <div className="text-xs text-slate-500">
                    {sessionStats.correct} correct
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Progress bar */}
      {!isLoading && cards.length > 0 && (
        <div className="h-1 bg-slate-200">
          <div
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${(currentIndex / cards.length) * 100}%` }}
          />
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-8">
        {isLoading ? (
          <CardSkeleton />
        ) : isComplete ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Session complete!</h2>
            <p className="text-slate-600 mb-2">
              You reviewed {sessionStats.reviewed} cards
            </p>
            <p className="text-slate-500 mb-8">
              Accuracy: {sessionStats.reviewed > 0
                ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100)
                : 0}%
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/knowledge"
                className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-colors"
              >
                Back to Knowledge
              </Link>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                More Reviews
              </button>
            </div>
          </div>
        ) : cards.length === 0 ? (
          <EmptyState />
        ) : currentCard ? (
          <Card
            card={currentCard}
            onReview={handleReview}
            isNew={currentCard.repetitions === 0}
          />
        ) : null}
      </main>
    </div>
  );
}
