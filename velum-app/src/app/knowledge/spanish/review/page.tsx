'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings, BookOpen, RotateCcw } from 'lucide-react';
import { Card, EmptyState, CardSkeleton } from '@/components/flashcards/Card';
import { QualityRating } from '@/lib/flashcards/sm2';

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

export default function ReviewPage() {
  const [cards, setCards] = useState<FlashcardData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState({
    reviewed: 0,
    correct: 0,
  });

  // Load cards due for review
  useEffect(() => {
    async function loadCards() {
      try {
        const response = await fetch('/api/flashcards?filter=due&limit=20');
        const data = await response.json();
        setCards(data.cards || []);
      } catch (error) {
        console.error('Failed to load cards:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadCards();
  }, []);

  // Handle review
  const handleReview = useCallback(async (quality: QualityRating) => {
    const currentCard = cards[currentIndex];
    if (!currentCard) return;

    try {
      // Submit review to API
      await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: currentCard.id,
          quality,
        }),
      });

      // Update session stats
      setSessionStats(prev => ({
        reviewed: prev.reviewed + 1,
        correct: quality >= 3 ? prev.correct + 1 : prev.correct,
      }));

      // Move to next card
      setCurrentIndex(prev => prev + 1);
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  }, [cards, currentIndex]);

  // Current card
  const currentCard = cards[currentIndex];
  const remainingCount = cards.length - currentIndex;
  const isComplete = !isLoading && cards.length > 0 && currentIndex >= cards.length;

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
