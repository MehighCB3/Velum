'use client';

import React from 'react';
import Link from 'next/link';
import { Brain, Library, ArrowLeft, Sparkles } from 'lucide-react';
import { ProgressWidgetLive } from '@/components/flashcards/ProgressWidget';
import { useFlashcardStats } from '@/hooks/useFlashcards';

export default function KnowledgePage() {
  const { data: stats } = useFlashcardStats();

  const dueCount = stats?.dueCards ?? 0;
  const newCount = stats?.newCards ?? 0;
  const streakDays = stats?.streakDays ?? 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <h1 className="text-xl font-bold text-slate-800">Knowledge</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress Widget — live data from API */}
        <section className="mb-8">
          <ProgressWidgetLive />
        </section>

        {/* Sections Grid */}
        <div className="grid gap-4">
          {/* Spanish Section */}
          <Link
            href="/knowledge/spanish"
            className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-slate-200"
          >
            <div className="flex items-start gap-4">
              <div className="bg-indigo-100 p-3 rounded-xl">
                <Brain className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                    Spanish
                  </h2>
                  <span className="text-sm bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">
                    A2.1+
                  </span>
                </div>
                <p className="text-slate-600 mt-1">
                  Flashcards with spaced repetition. Auto-extracted from your book notes + curated vocabulary.
                </p>
                <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
                  <span>{dueCount} due today</span>
                  <span>·</span>
                  <span>{newCount} new cards</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-orange-400" />
                    {streakDays} day streak
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* Library from Alexandria */}
          <Link
            href="/knowledge/library"
            className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-slate-200"
          >
            <div className="flex items-start gap-4">
              <div className="bg-amber-100 p-3 rounded-xl">
                <Library className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-slate-800 group-hover:text-amber-600 transition-colors">
                  Library from Alexandria
                </h2>
                <p className="text-slate-600 mt-1">
                  Book notes, highlights, and vocabulary extracted from your reading.
                </p>
                <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
                  <span>Connected to Notion</span>
                  <span>·</span>
                  <span>Auto-sync enabled</span>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Tips */}
        <section className="mt-8 bg-blue-50 rounded-2xl p-6 border border-blue-100">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-800">How it works</h3>
              <p className="text-blue-700 text-sm mt-1">
                Your Spanish flashcards come from two sources: (1) vocabulary automatically extracted
                from your book notes in Notion, and (2) a curated A2.1+ vocabulary deck. The spaced
                repetition system shows you cards at optimal intervals to maximize retention.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
