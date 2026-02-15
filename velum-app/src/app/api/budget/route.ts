import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { getWeekKey } from '../../lib/weekUtils'

export const dynamic = 'force-dynamic'

// Storage mode detection
const usePostgres = !!process.env.POSTGRES_URL

// Budget configuration
const WEEKLY_BUDGET = 70 // €70 per week
const CATEGORIES = {
  Food: 0,
  Fun: 0,
  Transport: 0,
  Subscriptions: 0,
  Other: 0,
} as const

type Category = keyof typeof CATEGORIES

interface BudgetEntry {
  id: string
  amount: number
  category: Category
  description: string
  date: string
  timestamp: string
  reason?: string
}

interface WeekData {
  week: string
  entries: BudgetEntry[]
  totalSpent: number
  remaining: number
  categories: Record<Category, number>
}

// In-memory fallback storage
const fallbackStorage: Record<string, WeekData> = {}

// ==================== POSTGRES FUNCTIONS ====================

let tablesInitialized = false

async function initializePostgresTables(): Promise<void> {
  if (tablesInitialized) return
  
  try {
    // Create budget_entries table
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
    await sql`CREATE INDEX IF NOT EXISTS idx_budget_entries_date ON budget_entries(date)`

    tablesInitialized = true
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
      created_at::text as timestamp,
      reason
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
  }, { Food: 0, Fun: 0, Transport: 0, Subscriptions: 0, Other: 0 } as Record<Category, number>)
  
  return {
    week,
    entries,
    totalSpent,
    remaining: WEEKLY_BUDGET - totalSpent,
    categories
  }
}

async function writeToPostgres(week: string, entry: BudgetEntry) {
  await initializePostgresTables()
  
  await sql`
    INSERT INTO budget_entries (entry_id, week, date, amount, category, description, reason)
    VALUES (${entry.id}, ${week}, ${entry.date}, ${entry.amount}, ${entry.category}, ${entry.description}, ${entry.reason || null})
    ON CONFLICT (entry_id) DO UPDATE SET
      date = EXCLUDED.date,
      amount = EXCLUDED.amount,
      category = EXCLUDED.category,
      description = EXCLUDED.description,
      reason = EXCLUDED.reason
  `
}

async function deleteFromPostgres(week: string, entryId?: string) {
  await initializePostgresTables()
  
  if (entryId) {
    await sql`DELETE FROM budget_entries WHERE week = ${week} AND entry_id = ${entryId}`
  } else {
    await sql`DELETE FROM budget_entries WHERE week = ${week}`
  }
}

// Fallback storage operations
function readFromFallback(week: string): WeekData {
  return fallbackStorage[week] || {
    week,
    entries: [],
    totalSpent: 0,
    remaining: WEEKLY_BUDGET,
    categories: { Food: 0, Fun: 0, Transport: 0, Subscriptions: 0, Other: 0 }
  }
}

function writeToFallback(week: string, data: WeekData): void {
  fallbackStorage[week] = data
}

// Calculate week data from entries
function calculateWeekData(week: string, entries: BudgetEntry[]): WeekData {
  const totalSpent = entries.reduce((sum, e) => sum + Number(e.amount), 0)
  const categories = entries.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount)
    return acc
  }, { Food: 0, Fun: 0, Transport: 0, Subscriptions: 0, Other: 0 } as Record<Category, number>)

  return {
    week,
    entries,
    totalSpent,
    remaining: WEEKLY_BUDGET - totalSpent,
    categories
  }
}

// ==================== API HANDLERS ====================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const weekParam = searchParams.get('week')

    // If date is provided, resolve it to the containing week
    const week = dateParam
      ? getWeekKey(new Date(dateParam + 'T00:00:00Z'))
      : weekParam || getWeekKey(new Date())

    // Try Postgres first
    if (usePostgres) {
      try {
        await initializePostgresTables()
        const data = await readFromPostgres(week)
        if (data) {
          return NextResponse.json({
            ...data,
            totals: {
              spent: data.totalSpent,
              budget: WEEKLY_BUDGET,
              remaining: data.remaining,
              by_category: data.categories,
            },
            storage: 'postgres'
          })
        }
      } catch (error) {
        console.error('Postgres read error, falling back:', error)
      }
    }

    // Fallback to in-memory storage
    const fallbackData = readFromFallback(week)
    return NextResponse.json({
      ...fallbackData,
      totals: {
        spent: fallbackData.totalSpent,
        budget: WEEKLY_BUDGET,
        remaining: fallbackData.remaining,
        by_category: fallbackData.categories,
      },
      storage: 'fallback'
    })

  } catch (error) {
    console.error('GET error:', error)
    return NextResponse.json({ error: 'Failed to load budget data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { week, entry } = body

    if (!entry || !entry.amount || !entry.category) {
      return NextResponse.json(
        { error: 'Entry with amount and category required' },
        { status: 400 }
      )
    }

    // Validate category
    if (!['Food', 'Fun', 'Transport', 'Subscriptions', 'Other'].includes(entry.category)) {
      return NextResponse.json(
        { error: 'Category must be Food, Fun, Transport, Subscriptions, or Other' },
        { status: 400 }
      )
    }

    const weekKey = week || getWeekKey(new Date())

    // Create new entry
    const newEntry: BudgetEntry = {
      id: entry.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      amount: Number(entry.amount),
      category: entry.category,
      description: entry.description || '',
      date: entry.date || new Date().toISOString().split('T')[0],
      timestamp: entry.timestamp || new Date().toISOString(),
      reason: entry.reason
    }

    // Get existing data
    let existingData: WeekData | null = null
    if (usePostgres) {
      try {
        await initializePostgresTables()
        existingData = await readFromPostgres(weekKey)
      } catch (error) {
        console.error('Postgres read error:', error)
      }
    }
    if (!existingData) {
      existingData = readFromFallback(weekKey)
    }

    // Add new entry and recalculate
    const updatedEntries = [...existingData.entries, newEntry]
    const updatedData = calculateWeekData(weekKey, updatedEntries)

    // Save to storage
    let storage = 'fallback'
    if (usePostgres) {
      try {
        await writeToPostgres(weekKey, newEntry)
        storage = 'postgres'
      } catch (error) {
        console.error('Postgres write error:', error)
      }
    }
    writeToFallback(weekKey, updatedData)

    return NextResponse.json({ ...updatedData, storage })

  } catch (error) {
    console.error('POST error:', error)
    return NextResponse.json({ error: 'Failed to save budget entry' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const week = searchParams.get('week') || getWeekKey(new Date())
    const entryId = searchParams.get('entryId') || searchParams.get('id')

    if (!entryId) {
      return NextResponse.json({ error: 'entryId or id required' }, { status: 400 })
    }

    // Get existing data
    let existingData: WeekData | null = null
    if (usePostgres) {
      try {
        await initializePostgresTables()
        existingData = await readFromPostgres(week)
      } catch (error) {
        console.error('Postgres read error:', error)
      }
    }
    if (!existingData) {
      existingData = readFromFallback(week)
    }

    // Remove entry and recalculate
    const updatedEntries = existingData.entries.filter(e => e.id !== entryId)
    const updatedData = calculateWeekData(week, updatedEntries)

    // Save to storage
    let storage = 'fallback'
    if (usePostgres) {
      try {
        await deleteFromPostgres(week, entryId)
        storage = 'postgres'
      } catch (error) {
        console.error('Postgres delete error:', error)
      }
    }
    writeToFallback(week, updatedData)

    return NextResponse.json({ ...updatedData, storage })

  } catch (error) {
    console.error('DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete budget entry' }, { status: 500 })
  }
}
