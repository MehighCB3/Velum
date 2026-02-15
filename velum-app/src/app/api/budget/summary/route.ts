import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { getWeekKey } from '../../../lib/weekUtils'

export const dynamic = 'force-dynamic'

// Storage mode detection
const usePostgres = !!process.env.POSTGRES_URL

// Budget configuration
const WEEKLY_BUDGET = 70

interface BudgetEntry {
  id: string
  amount: number
  category: 'Food' | 'Fun' | 'Transport' | 'Subscriptions' | 'Other'
  description: string
  date: string
  timestamp: string
}

interface WeekData {
  week: string
  entries: BudgetEntry[]
  totalSpent: number
  remaining: number
  categories: { Food: number; Fun: number; Transport: number; Subscriptions: number; Other: number }
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

// Initialize Postgres tables
async function initializePostgresTables(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS budget_entries (
        id SERIAL PRIMARY KEY,
        entry_id VARCHAR(50) UNIQUE NOT NULL,
        week VARCHAR(10) NOT NULL,
        date DATE NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        category VARCHAR(50) NOT NULL,
        description TEXT,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    
    await sql`CREATE INDEX IF NOT EXISTS idx_budget_entries_week ON budget_entries(week)`
  } catch (error) {
    console.error('Failed to initialize budget tables:', error)
    throw error
  }
}

async function readFromPostgres(week: string): Promise<WeekData | null> {
  const entriesResult = await sql`
    SELECT 
      entry_id as id,
      amount,
      category,
      description,
      date::text as date,
      created_at::text as timestamp
    FROM budget_entries
    WHERE week = ${week}
    ORDER BY date, created_at
  `
  
  const entries = entriesResult.rows as BudgetEntry[]
  
  if (entries.length === 0) {
    return null
  }
  
  const totalSpent = entries.reduce((sum, e) => sum + Number(e.amount), 0)
  const categories = entries.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount)
    return acc
  }, { Food: 0, Fun: 0, Transport: 0, Subscriptions: 0, Other: 0 } as Record<BudgetEntry["category"], number>)
  
  return {
    week,
    entries,
    totalSpent,
    remaining: WEEKLY_BUDGET - totalSpent,
    categories
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

      if (usePostgres) {
        try {
          await initializePostgresTables()
          data = await readFromPostgres(week)
        } catch (error) {
          console.error('Postgres read error:', error)
        }
      }

      if (!data) {
        // Return empty week data
        data = {
          week,
          entries: [],
          totalSpent: 0,
          remaining: WEEKLY_BUDGET,
          categories: { Food: 0, Fun: 0, Transport: 0, Subscriptions: 0, Other: 0 }
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
        foodTotal: acc.foodTotal + (week.categories.Food || 0),
        funTotal: acc.funTotal + (week.categories.Fun || 0),
        transportTotal: acc.transportTotal + (week.categories.Transport || 0),
        subscriptionsTotal: acc.subscriptionsTotal + (week.categories.Subscriptions || 0),
        otherTotal: acc.otherTotal + (week.categories.Other || 0),
        entryCount: acc.entryCount + week.entries.length
      }),
      { totalSpent: 0, totalRemaining: 0, foodTotal: 0, funTotal: 0, transportTotal: 0, subscriptionsTotal: 0, otherTotal: 0, entryCount: 0 }
    )

    return NextResponse.json({
      weeks: weeklyData,
      summary,
      budgetConfig: {
        weeklyBudget: WEEKLY_BUDGET,
        categories: ['Food', 'Fun', 'Transport', 'Subscriptions', 'Other']
      }
    })

  } catch (error) {
    console.error('GET week summary error:', error)
    return NextResponse.json({ error: 'Failed to load budget summary' }, { status: 500 })
  }
}
