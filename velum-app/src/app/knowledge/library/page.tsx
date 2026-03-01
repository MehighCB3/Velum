import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Library, BookOpen, RefreshCw, ExternalLink } from 'lucide-react';

export default function LibraryPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/knowledge"
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <h1 className="text-xl font-bold text-slate-800">Library from Alexandria</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Sync Status */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="bg-amber-100 p-3 rounded-xl">
              <RefreshCw className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-amber-900">Notion Sync</h2>
              <p className="text-amber-700 text-sm mt-1">
                Your book notes are synced from Notion. Spanish vocabulary is 
                automatically extracted and added to your flashcards.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <button className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Sync Now
                </button>
                <span className="text-xs text-amber-600">
                  Last sync: Never
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Setup Instructions */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Setup Instructions</h2>
          <ol className="space-y-3 text-slate-600">
            <li className="flex items-start gap-3">
              <span className="bg-slate-100 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">1</span>
              <span>Create a Notion integration at <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-1">notion.so/my-integrations <ExternalLink className="w-3 h-3" /></a></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="bg-slate-100 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">2</span>
              <span>Share your book notes database with the integration</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="bg-slate-100 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">3</span>
              <span>Add your Notion API key to environment variables</span>
            </li>
          </ol>
        </div>

        {/* Connected Books (placeholder) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Connected Books</h2>
          <p className="text-slate-500 text-center py-8">
            No books connected yet. Sync with Notion to see your reading notes here.
          </p>
        </div>
      </main>
    </div>
  );
}
