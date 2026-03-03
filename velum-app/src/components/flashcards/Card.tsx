'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { RotateCw, Volume2, Flag, MoreHorizontal } from 'lucide-react';
import { 
  QualityRating, 
  QUALITY_LABELS, 
  QUALITY_COLORS,
  getPreviewInterval,
  formatInterval 
} from '@/lib/flashcards/sm2';

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
  
  // SM-2 state
  interval: number;
  repetitions: number;
  easeFactor: number;
}

interface CardProps {
  card: FlashcardData;
  onReview: (quality: QualityRating) => void;
  isNew: boolean;
}

export function Card({ card, onReview, isNew }: CardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleFlip = () => {
    if (!isFlipped) {
      setIsFlipped(true);
    }
  };

  const handleReview = (quality: QualityRating) => {
    setIsAnimating(true);
    setTimeout(() => {
      onReview(quality);
      setIsFlipped(false);
      setIsAnimating(false);
    }, 200);
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Card */}
      <div
        onClick={handleFlip}
        className={`
          relative bg-white rounded-2xl shadow-xl min-h-[300px] cursor-pointer
          transition-all duration-300 transform
          ${isAnimating ? 'scale-95 opacity-50' : 'scale-100 opacity-100'}
          ${isFlipped ? 'ring-2 ring-indigo-500' : ''}
        `}
      >
        {/* Front */}
        <div className={`absolute inset-0 p-8 flex flex-col items-center justify-center ${isFlipped ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <span className="text-sm text-slate-400 uppercase tracking-wide mb-4">
            {isNew ? 'New Card' : 'Review'}
          </span>
          
          <h2 className="text-4xl font-bold text-slate-800 text-center mb-4">
            {card.front}
          </h2>
          
          {card.pronunciation && (
            <p className="text-slate-500 italic mb-4">{card.pronunciation}</p>
          )}
          
          <button
            onClick={(e) => { e.stopPropagation(); speak(card.front); }}
            className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
          >
            <Volume2 className="w-6 h-6" />
          </button>
          
          <p className="text-sm text-slate-400 mt-8">
            Click to reveal answer
          </p>
        </div>

        {/* Back */}
        <div className={`absolute inset-0 p-8 flex flex-col items-center justify-center ${isFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <h3 className="text-3xl font-bold text-indigo-600 text-center mb-2">
            {card.back}
          </h3>
          
          {card.exampleSentence && (
            <div className="mt-6 p-4 bg-slate-50 rounded-xl w-full">
              <p className="text-slate-700 italic mb-2">&ldquo;{card.exampleSentence}&rdquo;</p>
              <p className="text-slate-500 text-sm">{card.exampleTranslation}</p>
            </div>
          )}
          
          <div className="flex items-center gap-2 mt-4">
            {card.tags.map(tag => (
              <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>
          
          {card.source === 'notion_book' && card.sourceRef && (
            <p className="text-xs text-slate-400 mt-4">
              From: {card.sourceRef}
            </p>
          )}
        </div>
      </div>

      {/* Review Buttons */}
      {isFlipped && (
        <div className="mt-6 grid grid-cols-4 gap-2">
          {[0, 2, 3, 4].map((quality) => {
            const interval = getPreviewInterval(
              card.interval,
              card.repetitions,
              card.easeFactor,
              quality as QualityRating
            );
            
            return (
              <button
                key={quality}
                onClick={() => handleReview(quality as QualityRating)}
                className={`
                  flex flex-col items-center py-3 px-2 rounded-xl text-white font-semibold
                  transition-all hover:scale-105 active:scale-95
                  ${QUALITY_COLORS[quality as QualityRating]}
                `}
              >
                <span className="text-sm">{QUALITY_LABELS[quality as QualityRating]}</span>
                <span className="text-xs opacity-80 mt-1">{interval}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Empty state when no cards due
export function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="text-6xl mb-4">🎉</div>
      <h3 className="text-2xl font-bold text-slate-800 mb-2">All caught up!</h3>
      <p className="text-slate-600 mb-6">No cards are due for review right now.</p>
      <p className="text-sm text-slate-400">
        Come back tomorrow for more reviews, or add new cards to your deck.
      </p>
    </div>
  );
}

// Loading state
export function CardSkeleton() {
  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-white rounded-2xl shadow-xl min-h-[300px] animate-pulse">
        <div className="p-8 flex flex-col items-center justify-center h-full">
          <div className="w-24 h-4 bg-slate-200 rounded mb-4" />
          <div className="w-48 h-12 bg-slate-200 rounded mb-4" />
          <div className="w-32 h-4 bg-slate-200 rounded" />
        </div>
      </div>
    </div>
  );
}
