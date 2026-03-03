import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { isCardDue } from '@/lib/flashcards/sm2';

const CARDS_PATH = join(process.cwd(), 'data', 'spanish', 'cards.json');
const STATS_PATH = join(process.cwd(), 'data', 'spanish', 'stats-daily.json');

async function loadCards() {
  try {
    const data = await readFile(CARDS_PATH, 'utf-8');
    const json = JSON.parse(data);
    return json.cards || [];
  } catch {
    return [];
  }
}

async function loadStats() {
  try {
    const data = await readFile(STATS_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// GET /api/flashcards/stats - Get study statistics
export async function GET(request: NextRequest) {
  try {
    const cards = await loadCards();
    const stats = await loadStats();
    const today = new Date().toISOString().split('T')[0];

    // Calculate stats
    const totalCards = cards.length;
    const newCards = cards.filter((c: any) => c.repetitions === 0).length;
    const dueCards = cards.filter((c: any) => isCardDue(c.dueDate)).length;

    // Today's stats
    const todayStats = stats.find((s: any) => s.date === today);
    const studiedToday = todayStats?.cardsStudied || 0;

    // Calculate streak
    let streakDays = 0;
    const sortedStats = [...stats].sort((a: any, b: any) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    for (const day of sortedStats) {
      if (day.cardsStudied > 0) {
        streakDays++;
      } else {
        break;
      }
    }

    // Weekly stats
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weeklyStats = sortedStats.filter((s: any) =>
      new Date(s.date) >= oneWeekAgo
    );
    const weeklyTotal = weeklyStats.reduce((sum: number, s: any) => sum + s.cardsStudied, 0);

    return NextResponse.json({
      totalCards,
      newCards,
      dueCards,
      studiedToday,
      streakDays,
      weeklyTotal,
      todayStats,
      recentStats: sortedStats.slice(0, 7),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load stats' },
      { status: 500 }
    );
  }
}
