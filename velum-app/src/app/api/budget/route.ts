import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export const dynamic = 'force-dynamic'

// Storage mode detection
const usePostgres = !!process.env.POSTGRES_URL

// Budget configuration
const WEEKLY_BUDGET = 70 // €70 per week

type Category = 'Food' | 'Fun' | 'Transport' | 'Subscriptions' | 'Other'

interface BudgetEntry {
  id: string
  amount: number
  category: Category
  description: string
  date: string
  timestamp: string
}

interface WeekData {
  week: string
  entries: BudgetEntry[]
  totalSpent: number
  remaining: number
  categories: Record<Category, number>
  totals?: {
    spent: number
    budget: number
    remaining: number
    by_category: Record<Category, number>
  }
}

// In-memory fallback storage
const fallbackStorage: Record<string, WeekData> = {}

// Helper to get ISO week number
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

// Helper to generate week key (e.g., "2026-W05")
function getWeekKey(date: Date): string {
  const year = date.getFullYear()
  const week = getISOWeek(date)
  return `${year}-W${String(week).padStart(2, '0')}`
}

// ==================== POSTGRES FUNCTIONS ====================

let tablesInitialized = false

async function initializePostgresTables(): Promise<void> {
  if (tablesInitialized) return
  
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS budget_entries (
        id SERIAL PRIMARY KEY,
        entry_id VARCHAR(50) UNIQUE NOT NULL,
        week VARCHAR(10) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        category VARCHAR(50) NOT NULL,
        description TEXT,
        date DATE NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    
    await sql`CREATE INDEX IF NOT EXISTS idx_budget_week ON budget_entries(week)`
    await sql`CREATE INDEX IF NOT EXISTS idx_budget_date ON budget_entries(date)`
    
    tablesInitialized = true
  } catch (error) {
    console.error('Failed to initialize budget tables:', error)
    throw error
  }
}

async function readFromPostgres(week: string): Promise<WeekData> {
  try {
    await initializePostgresTables()
    
    const entriesResult = await sql`
      SELECT entry_id as id, amount, category, description, 
             date::text, timestamp::text
      FROM budget_entries
      WHERE week = ${week}
      ORDER BY timestamp ASC
    `
    
    const entries: BudgetEntry[] = entriesResult.rows.map((row: any) => ({
      id: row.id,
      amount: parseFloat(row.amount),
      category: row.category as Category,
      description: row.description || '',
      date: row.date,
      timestamp: row.timestamp
    }))
    
    return calculateWeekData(week, entries)
  } catch (error) {
    console.error('Postgres read error:', error)
    return readFromFallback(week)
  }
}

async function writeToPostgres(entry: BudgetEntry, week: string): Promise<boolean> {
  try {
    await initializePostgresTables()
    
    await sql`
      INSERT INTO budget_entries (entry_id, week, amount, category, description, date, timestamp)
      VALUES (
        ${entry.id},
        ${week},
        ${entry.amount},
        ${entry.category},
        ${entry.description},
        ${entry.date},
        ${entry.timestamp}
      )
      ON CONFLICT (entry_id) DO UPDATE SET
        amount = EXCLUDED.amount,
        category = EXCLUDED.category,
        description = EXCLUDED.description,
        date = EXCLUDED.date,
        timestamp = EXCLUDED.timestamp
    `
    
    return true
  } catch (error) {
    console.error('Postgres write error:', error)
    return false
  }
}

async function deleteFromPostgres(entryId: string): Promise<boolean> {
  try {
    await initializePostgresTables()
    
    await sql`
      DELETE FROM budget_entries
      WHERE entry_id = ${entryId}
    `
    
    return true
  } catch (error) {
    console.error('Postgres delete error:', error)
    return false
  }
}

// ==================== FALLBACK STORAGE FUNCTIONS ====================

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
  const totalSpent = entries.reduce((sum, e) => sum + e.amount, 0)
  const categories = entries.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount
    return acc
  }, { Food: 0, Fun: 0, Transport: 0, Subscriptions: 0, Other: 0 } as Record<Category, number>)

  return {
    week,
    entries,
    totalSpent,
    remaining: WEEKLY_BUDGET - totalSpent,
    categories,
    totals: {
      spent: totalSpent,
      budget: WEEKLY_BUDGET,
      remaining: WEEKLY_BUDGET - totalSpent,
      by_category: categories
    }
  }
}

// ==================== API HANDLERS ====================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const week = searchParams.get('week') || getWeekKey(new Date())

    // Try Postgres first
    if (usePostgres) {
      const data = await readFromPostgres(week)
      return NextResponse.json({ ...data, storage: 'postgres' })
    }

    // Fallback to in-memory storage
    const fallbackData = readFromFallback(week)
    return NextResponse.json({ ...fallbackData, storage: 'fallback' })

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
        { error: 'Invalid category' },
        { status: 400 }
      )
    }

    const weekKey = week || getWeekKey(new Date(entry.date || new Date()))

    // Create new entry
    const newEntry: BudgetEntry = {
      id: entry.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      amount: Number(entry.amount),
      category: entry.category,
      description: entry.description || '',
      date: entry.date || new Date().toISOString().split('T')[0],
      timestamp: entry.timestamp || new Date().toISOString()
    }

    // Save to storage
    let storage = 'fallback'
    if (usePostgres) {
      const saved = await writeToPostgres(newEntry, weekKey)
      if (saved) storage = 'postgres'
    }

    // Also save to fallback for consistency
    const existingData = storage === 'postgres' 
      ? await readFromPostgres(weekKey)
      : readFromFallback(weekKey)
    
    const updatedEntries = [...existingData.entries.filter(e => e.id !== newEntry.id), newEntry]
    const updatedData = calculateWeekData(weekKey, updatedEntries)
    writeToFallback(weekKey, updatedData)

    // Re-read from Postgres to get the canonical data
    const finalData = storage === 'postgres'
      ? await readFromPostgres(weekKey)
      : updatedData

    return NextResponse.json({ ...finalData, storage })

  } catch (error) {
    console.error('POST error:', error)
    return NextResponse.json({ error: 'Failed to save budget entry' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const week = searchParams.get('week') || getWeekKey(new Date())
    const entryId = searchParams.get('entryId')

    if (!entryId) {
      return NextResponse.json({ error: 'entryId required' }, { status: 400 })
    }

    // Delete from storage
    let storage = 'fallback'
    if (usePostgres) {
      const deleted = await deleteFromPostgres(entryId)
      if (deleted) storage = 'postgres'
    }

    // Get updated data
    const updatedData = storage === 'postgres'
      ? await readFromPostgres(week)
      : (() => {
          const existingData = readFromFallback(week)
          const updatedEntries = existingData.entries.filter(e => e.id !== entryId)
          const newData = calculateWeekData(week, updatedEntries)
          writeToFallback(week, newData)
          return newData
        })()

    return NextResponse.json({ ...updatedData, storage })

  } catch (error) {
    console.error('DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete budget entry' }, { status: 500 })
  }
}
