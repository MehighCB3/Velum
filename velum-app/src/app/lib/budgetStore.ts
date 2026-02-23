/**
 * Shared budget storage module.
 * Used by both /api/budget (route handler) and /api/budget/webhook
 * to avoid self-referencing fetch() calls that cause Vercel timeouts.
 */

import { sql } from '@vercel/postgres'
import { getWeekKey } from './weekUtils'

export { getWeekKey }

// Storage mode detection
export const usePostgres = !!process.env.POSTGRES_URL

// Budget configuration
export const WEEKLY_BUDGET = 70

export const CATEGORIES = {
  Food: 0,
  Fun: 0,
  Transport: 0,
  Subscriptions: 0,
  Other: 0,
} as const

export type Category = keyof typeof CATEGORIES

export interface BudgetEntry {
  id: string
  amount: number
  category: Category
  description: string
  date: string
  timestamp: string
  reason?: string
}

export interface WeekData {
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

export async function initializePostgresTables(): Promise<void> {
  if (tablesInitialized) return

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
    await sql`CREATE INDEX IF NOT EXISTS idx_budget_entries_date ON budget_entries(date)`
    tablesInitialized = true
  } catch (error) {
    console.error('Failed to initialize budget tables:', error)
    throw error
  }
}

export async function readFromPostgres(week: string): Promise<WeekData | null> {
  const entriesResult = await sql`
    SELECT
      entry_id as id, amount, category, description,
      date::text as date, created_at::text as timestamp, reason
    FROM budget_entries
    WHERE week = ${week}
    ORDER BY date, created_at
  `

  const entries = (entriesResult.rows as Array<{
    id: string; amount: string | number; category: Category;
    description: string; date: string; timestamp: string; reason?: string | null;
  }>).map((row) => ({
    id: row.id,
    amount: Number(row.amount),
    category: row.category,
    description: row.description,
    date: row.date,
    timestamp: row.timestamp,
    reason: row.reason ?? undefined,
  }))

  if (entries.length === 0) return null

  const totalSpent = entries.reduce((sum, e) => sum + e.amount, 0)
  const categories = entries.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount
    return acc
  }, { Food: 0, Fun: 0, Transport: 0, Subscriptions: 0, Other: 0 } as Record<Category, number>)

  return { week, entries, totalSpent, remaining: WEEKLY_BUDGET - totalSpent, categories }
}

export async function writeToPostgres(week: string, entry: BudgetEntry) {
  await initializePostgresTables()

  await sql`
    INSERT INTO budget_entries (entry_id, week, date, amount, category, description, reason)
    VALUES (${entry.id}, ${week}, ${entry.date}, ${entry.amount}, ${entry.category}, ${entry.description}, ${entry.reason || null})
    ON CONFLICT (entry_id) DO UPDATE SET
      date = EXCLUDED.date, amount = EXCLUDED.amount,
      category = EXCLUDED.category, description = EXCLUDED.description,
      reason = EXCLUDED.reason
  `
}

export async function deleteFromPostgres(week: string, entryId?: string) {
  await initializePostgresTables()

  if (entryId) {
    await sql`DELETE FROM budget_entries WHERE week = ${week} AND entry_id = ${entryId}`
  } else {
    await sql`DELETE FROM budget_entries WHERE week = ${week}`
  }
}

// ==================== FALLBACK STORAGE ====================

export function readFromFallback(week: string): WeekData {
  return fallbackStorage[week] || {
    week,
    entries: [],
    totalSpent: 0,
    remaining: WEEKLY_BUDGET,
    categories: { Food: 0, Fun: 0, Transport: 0, Subscriptions: 0, Other: 0 }
  }
}

export function writeToFallback(week: string, data: WeekData): void {
  fallbackStorage[week] = data
}

// Calculate week data from entries
export function calculateWeekData(week: string, entries: BudgetEntry[]): WeekData {
  const totalSpent = entries.reduce((sum, e) => sum + Number(e.amount), 0)
  const categories = entries.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount)
    return acc
  }, { Food: 0, Fun: 0, Transport: 0, Subscriptions: 0, Other: 0 } as Record<Category, number>)

  return { week, entries, totalSpent, remaining: WEEKLY_BUDGET - totalSpent, categories }
}

// ==================== HIGH-LEVEL OPERATIONS ====================

/** Load a week's budget data from Postgres or fallback. */
export async function loadWeek(weekKey: string): Promise<WeekData> {
  if (usePostgres) {
    try {
      await initializePostgresTables()
      const data = await readFromPostgres(weekKey)
      if (data) return data
    } catch (error) {
      console.error('Postgres read error, falling back:', error)
    }
  }
  return readFromFallback(weekKey)
}

/**
 * Add a budget entry directly to storage.
 * Returns the updated week data. No HTTP fetch involved.
 */
export async function addBudgetEntry(
  weekKey: string,
  entry: BudgetEntry,
): Promise<WeekData & { storage: string }> {
  const existingData = await loadWeek(weekKey)

  const updatedEntries = [...existingData.entries, entry]
  const updatedData = calculateWeekData(weekKey, updatedEntries)

  let storage = 'fallback'
  if (usePostgres) {
    try {
      await writeToPostgres(weekKey, entry)
      storage = 'postgres'
    } catch (error) {
      console.error('Postgres write error:', error)
    }
  }
  writeToFallback(weekKey, updatedData)

  return { ...updatedData, storage }
}
