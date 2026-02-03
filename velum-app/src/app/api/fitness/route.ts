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

// Default goals
const DEFAULT_GOALS = {
  steps: 10000,    // daily step goal
  runs: 3,         // weekly run goal
  swims: 2,        // weekly swim goal
}

// Fitness entry types
export interface FitnessEntry {
  id: string
  date: string
  timestamp: string
  type: 'steps' | 'run' | 'swim'
  // For steps:
  steps?: number
  distanceKm?: number  // calculated from steps (approx 0.7m per step)
  // For runs/swims:
  duration?: number    // in minutes
  distance?: number    // in km
  pace?: number        // min/km
  calories?: number
  // Common:
  notes?: string
}

export interface FitnessWeek {
  week: string  // "2026-W06"
  entries: FitnessEntry[]
  totals: {
    steps: number
    runs: number
    swims: number
    totalDistance: number
    totalCalories: number
  }
  goals: {
    steps: number     // daily goal
    runs: number      // weekly goal
    swims: number     // weekly goal
  }
}

// In-memory fallback storage
const fallbackStorage: Record<string, FitnessWeek> = {}

// Helper to generate week key (e.g., "2026-W06") - ISO week format
function getWeekKey(date: Date): string {
  const year = date.getFullYear()
  
  // Calculate ISO week number
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  
  return `${year}-W${String(weekNumber).padStart(2, '0')}`
}

// Parse week key to get start date
function parseWeekKey(weekKey: string): Date {
  const match = weekKey.match(/^(\d{4})-W(\d{2})$/)
  if (!match) return new Date()
  
  const [, year, week] = match
  const yearNum = parseInt(year)
  const weekNum = parseInt(week)
  
  // Calculate the first day of the ISO week (Monday)
  const yearStart = new Date(Date.UTC(yearNum, 0, 1))
  const dayNum = yearStart.getUTCDay() || 7
  const weekStart = new Date(yearStart)
  weekStart.setUTCDate(yearStart.getUTCDate() + (weekNum - 1) * 7 - dayNum + 1)
  
  return weekStart
}

// Get all dates in a week
function getWeekDates(weekKey: string): string[] {
  const startDate = parseWeekKey(weekKey)
  const dates: string[] = []
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate)
    date.setUTCDate(startDate.getUTCDate() + i)
    dates.push(date.toISOString().split('T')[0])
  }
  
  return dates
}

// Calculate distance from steps (approx 0.7m per step for walking)
function calculateDistanceFromSteps(steps: number): number {
  return Math.round((steps * 0.0007) * 100) / 100 // km, rounded to 2 decimals
}

// Calculate pace (min/km)
function calculatePace(duration: number, distance: number): number {
  if (!distance || distance <= 0) return 0
  return Math.round((duration / distance) * 10) / 10
}

// Calculate week data from entries
function calculateWeekData(week: string, entries: FitnessEntry[]): FitnessWeek {
  const weekDates = getWeekDates(week)
  
  // Filter entries to only include those in this week
  const weekEntries = entries.filter(e => weekDates.includes(e.date))
  
  // Calculate totals
  const totals = weekEntries.reduce((acc, entry) => {
    if (entry.type === 'steps') {
      acc.steps += entry.steps || 0
      acc.totalDistance += entry.distanceKm || 0
    } else if (entry.type === 'run') {
      acc.runs += 1
      acc.totalDistance += entry.distance || 0
      acc.totalCalories += entry.calories || 0
    } else if (entry.type === 'swim') {
      acc.swims += 1
      acc.totalDistance += entry.distance || 0
      acc.totalCalories += entry.calories || 0
    }
    return acc
  }, {
    steps: 0,
    runs: 0,
    swims: 0,
    totalDistance: 0,
    totalCalories: 0,
  })

  return {
    week,
    entries: weekEntries,
    totals,
    goals: { ...DEFAULT_GOALS }
  }
}

// Redis operations
async function readFromRedis(week: string): Promise<FitnessWeek | null> {
  if (!redis) return null
  try {
    const data = await redis.get<FitnessWeek>(`fitness:${week}`)
    return data
  } catch (error) {
    console.error('Redis read error:', error)
    return null
  }
}

async function writeToRedis(week: string, data: FitnessWeek): Promise<boolean> {
  if (!redis) return false
  try {
    await redis.set(`fitness:${week}`, data)
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
        const recalculated = calculateWeekData(week, data.entries)
        recalculated.goals = data.goals
        await writeToRedis(week, recalculated)
      }
    } else {
      await redis.del(`fitness:${week}`)
    }
    return true
  } catch (error) {
    console.error('Redis delete error:', error)
    return false
  }
}

// Fallback storage operations
function readFromFallback(week: string): FitnessWeek {
  return fallbackStorage[week] || {
    week,
    entries: [],
    totals: {
      steps: 0,
      runs: 0,
      swims: 0,
      totalDistance: 0,
      totalCalories: 0,
    },
    goals: { ...DEFAULT_GOALS }
  }
}

function writeToFallback(week: string, data: FitnessWeek): void {
  fallbackStorage[week] = data
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
    return NextResponse.json({ error: 'Failed to load fitness data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { week, entry, goals } = body

    // Handle goals update
    if (goals) {
      const weekKey = week || getWeekKey(new Date())
      
      let existingData: FitnessWeek | null = null
      if (useRedis) {
        existingData = await readFromRedis(weekKey)
      }
      if (!existingData) {
        existingData = readFromFallback(weekKey)
      }
      
      existingData.goals = { ...existingData.goals, ...goals }
      
      let storage = 'fallback'
      if (useRedis) {
        const saved = await writeToRedis(weekKey, existingData)
        if (saved) storage = 'redis'
      }
      writeToFallback(weekKey, existingData)
      
      return NextResponse.json({ ...existingData, storage })
    }

    // Handle entry creation
    if (!entry || !entry.type) {
      return NextResponse.json(
        { error: 'Entry with type required' },
        { status: 400 }
      )
    }

    // Validate type
    if (!['steps', 'run', 'swim'].includes(entry.type)) {
      return NextResponse.json(
        { error: 'Type must be steps, run, or swim' },
        { status: 400 }
      )
    }

    const weekKey = week || getWeekKey(new Date())
    const entryDate = entry.date || new Date().toISOString().split('T')[0]

    // Create new entry with calculated fields
    const newEntry: FitnessEntry = {
      id: entry.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: entryDate,
      timestamp: entry.timestamp || new Date().toISOString(),
      type: entry.type,
      notes: entry.notes,
    }

    // Add type-specific fields
    if (entry.type === 'steps') {
      newEntry.steps = Number(entry.steps) || 0
      newEntry.distanceKm = entry.distanceKm || calculateDistanceFromSteps(newEntry.steps)
    } else {
      // run or swim
      newEntry.duration = Number(entry.duration) || 0
      newEntry.distance = Number(entry.distance) || 0
      newEntry.calories = Number(entry.calories) || 0
      newEntry.pace = entry.pace || calculatePace(newEntry.duration, newEntry.distance)
    }

    // Get existing data
    let existingData: FitnessWeek | null = null
    if (useRedis) {
      existingData = await readFromRedis(weekKey)
    }
    if (!existingData) {
      existingData = readFromFallback(weekKey)
    }

    // For steps: replace existing entry for the same date
    if (entry.type === 'steps') {
      existingData.entries = existingData.entries.filter(e => 
        !(e.type === 'steps' && e.date === entryDate)
      )
    }

    // Add new entry and recalculate
    const updatedEntries = [...existingData.entries, newEntry]
    const updatedData = calculateWeekData(weekKey, updatedEntries)
    updatedData.goals = existingData.goals

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
    return NextResponse.json({ error: 'Failed to save fitness entry' }, { status: 500 })
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
    let existingData: FitnessWeek | null = null
    if (useRedis) {
      existingData = await readFromRedis(week)
    }
    if (!existingData) {
      existingData = readFromFallback(week)
    }

    // Remove entry and recalculate
    const updatedEntries = existingData.entries.filter(e => e.id !== entryId)
    const updatedData = calculateWeekData(week, updatedEntries)
    updatedData.goals = existingData.goals

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
    return NextResponse.json({ error: 'Failed to delete fitness entry' }, { status: 500 })
  }
}
