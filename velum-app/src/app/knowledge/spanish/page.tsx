import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Brain, BookOpen, Library, Settings, BarChart3, Play } from 'lucide-react';
import { ProgressWidgetMini } from '@/components/flashcards/ProgressWidget';

export default function SpanishPage() {
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
              <h1 className="text-xl font-bold text-slate-800">Spanish</h1>
            </div>
            <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <Settings className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Quick Stats */}
        <section className="mb-8">
          <ProgressWidgetMini />
        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-2 gap-4 mb-8">
          <Link
            href="/knowledge/spanish/review"
            className="col-span-2 bg-indigo-600 text-white rounded-2xl p-6 hover:bg-indigo-700 transition-colors flex items-center justify-between"
          >
            <div>
              <h2 className="text-lg font-semibold">Start Review</h2>
              <p className="text-indigo-200 text-sm">12 cards due today</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <Play className="w-6 h-6" />
            </div>
          </Link>

          <Link
            href="/knowledge/spanish/stats"
            className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-indigo-300 transition-colors"
          >
            <div className="bg-blue-100 w-10 h-10 rounded-xl flex items-center justify-center mb-3">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Statistics</h3>
            <p className="text-sm text-slate-500">Track your progress</p>
          </Link>

          <Link
            href="/knowledge/spanish/browse"
            className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-indigo-300 transition-colors"
          >
            <div className="bg-purple-100 w-10 h-10 rounded-xl flex items-center justify-center mb-3">
              <BookOpen className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Browse</h3>
            <p className="text-sm text-slate-500">View all cards</p>
          </Link>
        </section>

        {/* Sources */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Your Sources</h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-2 rounded-lg">
                  <Library className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-800">Book Notes (Notion)</h3>
                  <p className="text-sm text-slate-500">Auto-extracted vocabulary</p>
                </div>
              </div>
              <span className="text-sm text-slate-400">0 cards</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <Brain className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-800">A2.1 Starter Deck</h3>
                  <p className="text-sm text-slate-500">Curated vocabulary</p>
                </div>
              </div>
              <span className="text-sm text-slate-400">500 cards</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
