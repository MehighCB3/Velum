import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

// Redis client setup
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null

const useRedis = !!redis

// Budget configuration
const WEEKLY_BUDGET = 70 // €70 per week
const CATEGORIES = {
  Food: 0,
  Fun: 0
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

// Helper to generate week key (e.g., "2026-W05")
function getWeekKey(date: Date): string {
  const year = date.getFullYear()
  // Calculate ISO week number
  const startOfYear = new Date(year, 0, 1)
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
  const weekNumber = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7)
  return `${year}-W${String(weekNumber).padStart(2, '0')}`
}

function parseWeekKey(weekKey: string): Date {
  const match = weekKey.match(/^(\d{4})-W(\d{2})$/)
  if (!match) return new Date()
  const [_, year, week] = match
  // Calculate the first day of the week
  const startOfYear = new Date(Number(year), 0, 1)
  const dayOffset = (Number(week) - 1) * 7 - startOfYear.getDay()
  startOfYear.setDate(startOfYear.getDate() + dayOffset + 1) // +1 for Monday
  return startOfYear
}

// Redis operations
async function readFromRedis(week: string): Promise<WeekData | null> {
  if (!redis) return null
  try {
    const data = await redis.get<WeekData>(`budget:${week}`)
    return data
  } catch (error) {
    console.error('Redis read error:', error)
    return null
  }
}

async function writeToRedis(week: string, data: WeekData): Promise<boolean> {
  if (!redis) return false
  try {
    await redis.set(`budget:${week}`, data)
    return true
  } catch (error) {
    console.error('Redis write error:', error)
    return false
  }
}

async function deleteFromRedis(week: string, entryId?: string): Promise<boolean> {
  if (!redis) return false
  try {
    if (entryId) {
      const data = await readFromRedis(week)
      if (data) {
        data.entries = data.entries.filter(e => e.id !== entryId)
        data.totalSpent = data.entries.reduce((sum, e) => sum + e.amount, 0)
        data.remaining = WEEKLY_BUDGET - data.totalSpent
        data.categories = data.entries.reduce((acc, e) => {
          acc[e.category] = (acc[e.category] || 0) + e.amount
          return acc
        }, { Food: 0, Fun: 0 } as Record<Category, number>)
        await writeToRedis(week, data)
      }
    } else {
      await redis.del(`budget:${week}`)
    }
    return true
  } catch (error) {
    console.error('Redis delete error:', error)
    return false
  }
}

// Fallback storage operations
function readFromFallback(week: string): WeekData {
  return fallbackStorage[week] || {
    week,
    entries: [],
    totalSpent: 0,
    remaining: WEEKLY_BUDGET,
    categories: { Food: 0, Fun: 0 }
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
  }, { Food: 0, Fun: 0 } as Record<Category, number>)

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
    const week = searchParams.get('week') || getWeekKey(new Date())

    // Try Redis first
    if (useRedis) {
      const data = await readFromRedis(week)
      if (data) {
        return NextResponse.json(data)
      }
    }

    // Fallback to in-memory storage
    const fallbackData = readFromFallback(week)
    return NextResponse.json(fallbackData)

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
    if (!['Food', 'Fun'].includes(entry.category)) {
      return NextResponse.json(
        { error: 'Category must be Food or Fun' },
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
    if (useRedis) {
      existingData = await readFromRedis(weekKey)
    }
    if (!existingData) {
      existingData = readFromFallback(weekKey)
    }

    // Add new entry and recalculate
    const updatedEntries = [...existingData.entries, newEntry]
    const updatedData = calculateWeekData(weekKey, updatedEntries)

    // Save to storage
    let storage = 'fallback'
    if (useRedis) {
      const saved = await writeToRedis(weekKey, updatedData)
      if (saved) storage = 'redis'
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
    const entryId = searchParams.get('entryId')

    if (!entryId) {
      return NextResponse.json({ error: 'entryId required' }, { status: 400 })
    }

    // Get existing data
    let existingData: WeekData | null = null
    if (useRedis) {
      existingData = await readFromRedis(week)
    }
    if (!existingData) {
      existingData = readFromFallback(week)
    }

    // Remove entry and recalculate
    const updatedEntries = existingData.entries.filter(e => e.id !== entryId)
    const updatedData = calculateWeekData(week, updatedEntries)

    // Save to storage
    let storage = 'fallback'
    if (useRedis) {
      const saved = await writeToRedis(week, updatedData)
      if (saved) storage = 'redis'
    }
    writeToFallback(week, updatedData)

    return NextResponse.json({ ...updatedData, storage })

  } catch (error) {
    console.error('DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete budget entry' }, { status: 500 })
  }
}
