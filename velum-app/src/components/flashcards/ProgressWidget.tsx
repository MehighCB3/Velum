'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, Brain, TrendingUp, Calendar, Flame, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface ProgressWidgetProps {
  dueCount: number;
  newCount: number;
  studiedToday: number;
  streakDays: number;
  weeklyTotal: number;
}

export function ProgressWidget({
  dueCount,
  newCount,
  studiedToday,
  streakDays,
  weeklyTotal,
}: ProgressWidgetProps) {
  const totalDue = dueCount + Math.min(newCount, 10); // Cap new cards at 10/day
  const hasCardsToReview = totalDue > 0;

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6" />
          <h3 className="text-lg font-semibold">Spanish Flashcards</h3>
        </div>
        <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
          A2.1+
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/10 rounded-xl p-3">
          <div className="text-2xl font-bold">{totalDue}</div>
          <div className="text-xs text-white/80">Due today</div>
        </div>
        <div className="bg-white/10 rounded-xl p-3">
          <div className="flex items-center gap-1">
            <Flame className="w-5 h-5 text-orange-300" />
            <div className="text-2xl font-bold">{streakDays}</div>
          </div>
          <div className="text-xs text-white/80">Day streak</div>
        </div>
        <div className="bg-white/10 rounded-xl p-3">
          <div className="text-2xl font-bold">{studiedToday}</div>
          <div className="text-xs text-white/80">Studied today</div>
        </div>
        <div className="bg-white/10 rounded-xl p-3">
          <div className="text-2xl font-bold">{weeklyTotal}</div>
          <div className="text-xs text-white/80">This week</div>
        </div>
      </div>

      <Link
        href="/knowledge/spanish/review"
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${
          hasCardsToReview
            ? 'bg-white text-indigo-600 hover:bg-white/90'
            : 'bg-white/20 text-white cursor-not-allowed'
        }`}
      >
        {hasCardsToReview ? (
          <>
            Start Review Session
            <ChevronRight className="w-5 h-5" />
          </>
        ) : (
          'All caught up! 🎉'
        )}
      </Link>
    </div>
  );
}

// Mini widget for embedding in other pages
export function ProgressWidgetMini() {
  const [stats, setStats] = useState({
    dueCount: 0,
    streakDays: 0,
    loading: true,
  });

  useEffect(() => {
    // TODO: Fetch from API
    // For now, simulate loading then show data
    const timer = setTimeout(() => {
      setStats({
        dueCount: 12,
        streakDays: 7,
        loading: false,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (stats.loading) {
    return (
      <div className="animate-pulse bg-slate-200 h-24 rounded-xl" />
    );
  }

  return (
    <Link
      href="/knowledge/spanish"
      className="block bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 text-white hover:opacity-90 transition-opacity"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold">Spanish</div>
            <div className="text-sm text-white/80">
              {stats.dueCount} cards due · {stats.streakDays} day streak
            </div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5" />
      </div>
    </Link>
  );
}
