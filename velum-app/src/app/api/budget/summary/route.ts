import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'

// Redis client setup
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null

const useRedis = !!redis

// Budget configuration
const WEEKLY_BUDGET = 70

interface BudgetEntry {
  id: string
  amount: number
  category: 'Food' | 'Fun'
  description: string
  date: string
  timestamp: string
}

interface WeekData {
  week: string
  entries: BudgetEntry[]
  totalSpent: number
  remaining: number
  categories: { Food: number; Fun: number }
}

// Helper to get ISO week number
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

// Helper to generate week key
function getWeekKey(date: Date): string {
  const year = date.getFullYear()
  const week = getISOWeek(date)
  return `${year}-W${String(week).padStart(2, '0')}`
}

// Get date range for the last 4 weeks
function getWeekRange(endWeek?: string): string[] {
  const weeks: string[] = []
  let currentDate: Date

  if (endWeek) {
    const match = endWeek.match(/^(\d{4})-W(\d{2})$/)
    if (match) {
      const [, year, week] = match
      // Approximate date from week number
      const startOfYear = new Date(Number(year), 0, 1)
      currentDate = new Date(startOfYear.getTime() + (Number(week) - 1) * 7 * 24 * 60 * 60 * 1000)
    } else {
      currentDate = new Date()
    }
  } else {
    currentDate = new Date()
  }

  for (let i = 3; i >= 0; i--) {
    const d = new Date(currentDate)
    d.setDate(d.getDate() - i * 7)
    weeks.push(getWeekKey(d))
  }

  return weeks
}

// Redis operations
async function readFromRedis(week: string): Promise<WeekData | null> {
  if (!redis) return null
  try {
    return await redis.get<WeekData>(`budget:${week}`)
  } catch (error) {
    console.error('Redis read error:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const endWeek = searchParams.get('week') || getWeekKey(new Date())
    const weeks = getWeekRange(endWeek)

    // Fetch data for all weeks
    const weeklyData: (WeekData & { budgetUsed?: number; budgetUsedPercent?: number })[] = []

    for (const week of weeks) {
      let data: WeekData | null = null

      if (useRedis) {
        data = await readFromRedis(week)
      }

      if (!data) {
        // Return empty week data
        data = {
          week,
          entries: [],
          totalSpent: 0,
          remaining: WEEKLY_BUDGET,
          categories: { Food: 0, Fun: 0 }
        }
      }

      // Add calculated fields
      weeklyData.push({
        ...data,
        budgetUsed: data.totalSpent,
        budgetUsedPercent: Math.round((data.totalSpent / WEEKLY_BUDGET) * 100)
      })
    }

    // Calculate summary stats
    const summary = weeklyData.reduce(
      (acc, week) => ({
        totalSpent: acc.totalSpent + week.totalSpent,
        totalRemaining: acc.totalRemaining + week.remaining,
        foodTotal: acc.foodTotal + week.categories.Food,
        funTotal: acc.funTotal + week.categories.Fun,
        entryCount: acc.entryCount + week.entries.length
      }),
      { totalSpent: 0, totalRemaining: 0, foodTotal: 0, funTotal: 0, entryCount: 0 }
    )

    return NextResponse.json({
      weeks: weeklyData,
      summary,
      budgetConfig: {
        weeklyBudget: WEEKLY_BUDGET,
        categories: ['Food', 'Fun']
      }
    })

  } catch (error) {
    console.error('GET week summary error:', error)
    return NextResponse.json({ error: 'Failed to load budget summary' }, { status: 500 })
  }
}
