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
  type: 'steps' | 'run' | 'swim' | 'cycle' | 'jiujitsu' | 'vo2max' | 'training_load' | 'stress' | 'recovery' | 'hrv' | 'weight' | 'body_fat'
  name?: string        // Activity name (e.g., "Morning run", "Commute")
  // For steps:
  steps?: number
  distanceKm?: number  // calculated from steps (approx 0.7m per step)
  // For runs/swims/cycles:
  duration?: number    // in minutes
  distance?: number    // in km
  pace?: number        // min/km
  calories?: number
  // Advanced metrics:
  vo2max?: number          // ml/kg/min
  trainingLoad?: number    // 0-100 score
  stressLevel?: number     // 0-100 scale
  recoveryScore?: number   // 0-100
  // Body metrics:
  hrv?: number             // Heart Rate Variability in ms
  weight?: number          // in kg
  bodyFat?: number         // percentage
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
    cycles: number
    jiujitsu: number
    totalDistance: number
    totalCalories: number
    runDistance: number
    swimDistance: number
    cycleDistance: number
  }
  goals: {
    steps: number     // daily goal
    runs: number      // weekly goal
    swims: number     // weekly goal
  }
  advanced?: {
    avgVo2max: number
    totalTrainingLoad: number
    avgStress: number
    avgRecovery: number
    recoveryStatus: 'good' | 'fair' | 'poor'
    latestHrv: number
    latestWeight: number
    latestBodyFat: number
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
      acc.runDistance += entry.distance || 0
      acc.totalCalories += entry.calories || 0
    } else if (entry.type === 'swim') {
      acc.swims += 1
      acc.totalDistance += entry.distance || 0
      acc.swimDistance += entry.distance || 0
      acc.totalCalories += entry.calories || 0
    } else if (entry.type === 'cycle') {
      acc.cycles += 1
      acc.totalDistance += entry.distance || 0
      acc.cycleDistance += entry.distance || 0
      acc.totalCalories += entry.calories || 0
    } else if (entry.type === 'jiujitsu') {
      acc.jiujitsu += 1
    }
    return acc
  }, {
    steps: 0,
    runs: 0,
    swims: 0,
    cycles: 0,
    jiujitsu: 0,
    totalDistance: 0,
    totalCalories: 0,
    runDistance: 0,
    swimDistance: 0,
    cycleDistance: 0,
  })

  // Calculate advanced metrics
  const vo2maxEntries = weekEntries.filter(e => e.type === 'vo2max' && e.vo2max)
  const trainingLoadEntries = weekEntries.filter(e => e.type === 'training_load' && e.trainingLoad)
  const stressEntries = weekEntries.filter(e => e.type === 'stress' && e.stressLevel)
  const recoveryEntries = weekEntries.filter(e => e.type === 'recovery' && e.recoveryScore)

  const avgVo2max = vo2maxEntries.length > 0
    ? Math.round(vo2maxEntries.reduce((a, e) => a + (e.vo2max || 0), 0) / vo2maxEntries.length * 10) / 10
    : 0
  
  const totalTrainingLoad = trainingLoadEntries.reduce((a, e) => a + (e.trainingLoad || 0), 0)
  
  const avgStress = stressEntries.length > 0
    ? Math.round(stressEntries.reduce((a, e) => a + (e.stressLevel || 0), 0) / stressEntries.length)
    : 0

  const avgRecovery = recoveryEntries.length > 0
    ? Math.round(recoveryEntries.reduce((a, e) => a + (e.recoveryScore || 0), 0) / recoveryEntries.length)
    : 0

  // Determine recovery status based on training load and recovery score
  let recoveryStatus: 'good' | 'fair' | 'poor' = 'good'
  if (avgRecovery > 0) {
    if (avgRecovery >= 70) recoveryStatus = 'good'
    else if (avgRecovery >= 40) recoveryStatus = 'fair'
    else recoveryStatus = 'poor'
  } else if (totalTrainingLoad > 0) {
    // Fallback based on training load
    if (totalTrainingLoad > 400) recoveryStatus = 'poor'
    else if (totalTrainingLoad > 250) recoveryStatus = 'fair'
    else recoveryStatus = 'good'
  }

  // Get latest body metrics
  const hrvEntries = weekEntries.filter(e => e.type === 'hrv' && e.hrv).sort((a, b) => b.date.localeCompare(a.date))
  const weightEntries = weekEntries.filter(e => e.type === 'weight' && e.weight).sort((a, b) => b.date.localeCompare(a.date))
  const bodyFatEntries = weekEntries.filter(e => e.type === 'body_fat' && e.bodyFat).sort((a, b) => b.date.localeCompare(a.date))

  return {
    week,
    entries: weekEntries,
    totals,
    goals: { ...DEFAULT_GOALS },
    advanced: {
      avgVo2max,
      totalTrainingLoad,
      avgStress,
      avgRecovery,
      recoveryStatus,
      latestHrv: hrvEntries.length > 0 ? hrvEntries[0].hrv! : 0,
      latestWeight: weightEntries.length > 0 ? weightEntries[0].weight! : 0,
      latestBodyFat: bodyFatEntries.length > 0 ? bodyFatEntries[0].bodyFat! : 0,
    }
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
      cycles: 0,
      jiujitsu: 0,
      totalDistance: 0,
      totalCalories: 0,
      runDistance: 0,
      swimDistance: 0,
      cycleDistance: 0,
    },
    goals: { ...DEFAULT_GOALS },
    advanced: {
      avgVo2max: 0,
      totalTrainingLoad: 0,
      avgStress: 0,
      avgRecovery: 0,
      recoveryStatus: 'good',
      latestHrv: 0,
      latestWeight: 0,
      latestBodyFat: 0,
    }
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
    if (!['steps', 'run', 'swim', 'cycle', 'jiujitsu', 'vo2max', 'training_load', 'stress', 'recovery', 'hrv', 'weight', 'body_fat'].includes(entry.type)) {
      return NextResponse.json(
        { error: 'Type must be steps, run, swim, cycle, jiujitsu, vo2max, training_load, stress, recovery, hrv, weight, or body_fat' },
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
      name: entry.name,
      notes: entry.notes,
    }

    // Add type-specific fields
    if (entry.type === 'steps') {
      newEntry.steps = Number(entry.steps) || 0
      newEntry.distanceKm = entry.distanceKm || calculateDistanceFromSteps(newEntry.steps)
    } else if (entry.type === 'run' || entry.type === 'swim' || entry.type === 'cycle') {
      newEntry.duration = Number(entry.duration) || 0
      newEntry.distance = Number(entry.distance) || 0
      newEntry.calories = Number(entry.calories) || 0
      newEntry.pace = entry.pace || calculatePace(newEntry.duration, newEntry.distance)
    } else if (entry.type === 'vo2max') {
      newEntry.vo2max = Number(entry.vo2max) || 0
    } else if (entry.type === 'training_load') {
      newEntry.trainingLoad = Number(entry.trainingLoad) || 0
    } else if (entry.type === 'stress') {
      newEntry.stressLevel = Number(entry.stressLevel) || 0
    } else if (entry.type === 'recovery') {
      newEntry.recoveryScore = Number(entry.recoveryScore) || 0
    } else if (entry.type === 'hrv') {
      newEntry.hrv = Number(entry.hrv) || 0
    } else if (entry.type === 'weight') {
      newEntry.weight = Number(entry.weight) || 0
    } else if (entry.type === 'body_fat') {
      newEntry.bodyFat = Number(entry.bodyFat) || 0
    } else if (entry.type === 'jiujitsu') {
      if (entry.duration) newEntry.duration = Number(entry.duration)
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
