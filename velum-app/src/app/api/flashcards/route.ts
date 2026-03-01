import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { Flashcard, ReviewLog } from '@/lib/flashcards/types';
import { calculateNextReview, QualityRating } from '@/lib/flashcards/sm2';

const DATA_PATH = join(process.cwd(), 'data', 'spanish', 'cards.json');
const STATS_PATH = join(process.cwd(), 'data', 'spanish', 'stats-daily.json');

async function loadCards(): Promise<Flashcard[]> {
  try {
    const data = await readFile(DATA_PATH, 'utf-8');
    const json = JSON.parse(data);
    return json.cards || [];
  } catch {
    return [];
  }
}

async function saveCards(cards: Flashcard[]) {
  const data = await readFile(DATA_PATH, 'utf-8');
  const json = JSON.parse(data);
  json.cards = cards;
  await writeFile(DATA_PATH, JSON.stringify(json, null, 2));
}

async function loadStats(): Promise<Array<{ date: string; cardsStudied: number; correctAnswers: number }>> {
  try {
    const data = await readFile(STATS_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveStats(stats: Array<{ date: string; cardsStudied: number; correctAnswers: number }>) {
  await writeFile(STATS_PATH, JSON.stringify(stats, null, 2));
}

// GET /api/flashcards - Get cards due for review
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter') || 'all'; // all, due, new
  const limit = parseInt(searchParams.get('limit') || '50');

  try {
    const cards = await loadCards();
    const today = new Date().toISOString().split('T')[0];

    let filteredCards = cards;

    if (filter === 'due') {
      filteredCards = cards.filter(c => {
        if (!c.dueDate) return true; // New cards
        return c.dueDate <= today;
      });
    } else if (filter === 'new') {
      filteredCards = cards.filter(c => c.repetitions === 0);
    }

    // Sort: due cards first, then by due date
    filteredCards.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return -1;
      if (!b.dueDate) return 1;
      return a.dueDate.localeCompare(b.dueDate);
    });

    return NextResponse.json({
      cards: filteredCards.slice(0, limit),
      total: cards.length,
      dueCount: cards.filter(c => !c.dueDate || c.dueDate <= today).length,
      newCount: cards.filter(c => c.repetitions === 0).length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load cards' },
      { status: 500 }
    );
  }
}

// POST /api/flashcards/review - Submit a review
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cardId, quality, timeSpentMs } = body;

    if (!cardId || typeof quality !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const cards = await loadCards();
    const cardIndex = cards.findIndex(c => c.id === cardId);

    if (cardIndex === -1) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      );
    }

    const card = cards[cardIndex];

    // Calculate next review using SM-2
    const result = calculateNextReview(
      card.interval || 0,
      card.repetitions || 0,
      card.easeFactor || 2.5,
      quality as QualityRating
    );

    // Update card
    card.interval = result.interval;
    card.repetitions = result.repetitions;
    card.easeFactor = result.easeFactor;
    card.dueDate = result.dueDate.toISOString().split('T')[0];
    card.lastReviewed = new Date().toISOString();

    // Add to review history
    const reviewLog: ReviewLog = {
      date: new Date().toISOString(),
      quality: quality as QualityRating,
      timeSpentMs,
    };
    card.reviewHistory = [...(card.reviewHistory || []), reviewLog];

    // Save updated cards
    cards[cardIndex] = card;
    await saveCards(cards);

    // Update daily stats
    const today = new Date().toISOString().split('T')[0];
    const stats = await loadStats();
    const todayStats = stats.find(s => s.date === today);

    if (todayStats) {
      todayStats.cardsStudied += 1;
      if (quality >= 3) {
        todayStats.correctAnswers += 1;
      }
    } else {
      stats.push({
        date: today,
        cardsStudied: 1,
        correctAnswers: quality >= 3 ? 1 : 0,
      });
    }
    await saveStats(stats);

    return NextResponse.json({
      success: true,
      card,
      nextDue: card.dueDate,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process review' },
      { status: 500 }
    );
  }
}
