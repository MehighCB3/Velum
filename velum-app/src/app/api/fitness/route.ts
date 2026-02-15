import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { getWeekKey, parseWeekKey, getWeekDates } from '../../lib/weekUtils'

export const dynamic = 'force-dynamic'

// Storage mode detection
const usePostgres = !!process.env.POSTGRES_URL

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
  type: 'steps' | 'run' | 'swim' | 'cycle' | 'jiujitsu' | 'gym' | 'other' | 'vo2max' | 'training_load' | 'stress' | 'recovery' | 'hrv' | 'weight' | 'body_fat'
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

// ==================== POSTGRES FUNCTIONS ====================

let tablesInitialized = false

async function initializePostgresTables(): Promise<void> {
  if (tablesInitialized) return
  
  try {
    // Create fitness_entries table
    await sql`
      CREATE TABLE IF NOT EXISTS fitness_entries (
        id SERIAL PRIMARY KEY,
        entry_id VARCHAR(50) UNIQUE NOT NULL,
        week VARCHAR(10) NOT NULL,
        date DATE NOT NULL,
        entry_type VARCHAR(20) NOT NULL,
        name VARCHAR(255),
        steps INTEGER,
        distance_km DECIMAL(6,2),
        duration INTEGER,
        distance DECIMAL(6,2),
        pace DECIMAL(4,2),
        calories INTEGER,
        vo2max DECIMAL(5,2),
        training_load INTEGER,
        stress_level INTEGER,
        recovery_score INTEGER,
        hrv DECIMAL(5,2),
        weight DECIMAL(5,2),
        body_fat DECIMAL(4,2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    
    // Create fitness_goals table
    await sql`
      CREATE TABLE IF NOT EXISTS fitness_goals (
        week VARCHAR(10) UNIQUE NOT NULL PRIMARY KEY,
        steps INTEGER NOT NULL DEFAULT 10000,
        runs INTEGER NOT NULL DEFAULT 3,
        swims INTEGER NOT NULL DEFAULT 2
      )
    `
    
    await sql`CREATE INDEX IF NOT EXISTS idx_fitness_entries_week ON fitness_entries(week)`
    await sql`CREATE INDEX IF NOT EXISTS idx_fitness_entries_date ON fitness_entries(date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_fitness_entries_type ON fitness_entries(entry_type)`

    tablesInitialized = true
  } catch (error) {
    console.error('Failed to initialize fitness tables:', error)
    throw error
  }
}

async function readFromPostgres(week: string): Promise<FitnessWeek | null> {
  const entriesResult = await sql`
    SELECT
      entry_id as id,
      date::text as date,
      entry_type as type,
      name,
      steps,
      distance_km as "distanceKm",
      duration,
      distance,
      pace,
      calories,
      vo2max,
      training_load as "trainingLoad",
      stress_level as "stressLevel",
      recovery_score as "recoveryScore",
      hrv,
      weight,
      body_fat as "bodyFat",
      notes,
      created_at as timestamp
    FROM fitness_entries
    WHERE week = ${week}
    ORDER BY date, created_at
  `

  const goalsResult = await sql`
    SELECT steps, runs, swims
    FROM fitness_goals
    WHERE week = ${week}
  `

  const goalsRow = goalsResult.rows[0] as { steps: number; runs: number; swims: number } | undefined
  const goals = goalsRow
    ? {
        steps: Number(goalsRow.steps),
        runs: Number(goalsRow.runs),
        swims: Number(goalsRow.swims),
      }
    : DEFAULT_GOALS

  // Convert entries ensuring numeric types (Postgres DECIMAL returns as string)
  const entries = (entriesResult.rows as Array<{
    id: string
    date: string
    type: string
    name?: string | null
    steps?: number | string | null
    distanceKm?: number | string | null
    duration?: number | string | null
    distance?: number | string | null
    pace?: number | string | null
    calories?: number | string | null
    vo2max?: number | string | null
    trainingLoad?: number | string | null
    stressLevel?: number | string | null
    recoveryScore?: number | string | null
    hrv?: number | string | null
    weight?: number | string | null
    bodyFat?: number | string | null
    notes?: string | null
    timestamp: string
  }>).map((row) => ({
    id: row.id,
    date: row.date,
    timestamp: row.timestamp,
    type: row.type as FitnessEntry['type'],
    name: row.name ?? undefined,
    steps: row.steps != null ? Number(row.steps) : undefined,
    distanceKm: row.distanceKm != null ? Number(row.distanceKm) : undefined,
    duration: row.duration != null ? Number(row.duration) : undefined,
    distance: row.distance != null ? Number(row.distance) : undefined,
    pace: row.pace != null ? Number(row.pace) : undefined,
    calories: row.calories != null ? Number(row.calories) : undefined,
    vo2max: row.vo2max != null ? Number(row.vo2max) : undefined,
    trainingLoad: row.trainingLoad != null ? Number(row.trainingLoad) : undefined,
    stressLevel: row.stressLevel != null ? Number(row.stressLevel) : undefined,
    recoveryScore: row.recoveryScore != null ? Number(row.recoveryScore) : undefined,
    hrv: row.hrv != null ? Number(row.hrv) : undefined,
    weight: row.weight != null ? Number(row.weight) : undefined,
    bodyFat: row.bodyFat != null ? Number(row.bodyFat) : undefined,
    notes: row.notes ?? undefined,
  })) as FitnessEntry[]

  if (entries.length === 0 && goalsResult.rows.length === 0) {
    return null
  }

  const weekData = calculateWeekData(week, entries)
  weekData.goals = goals

  return weekData
}

async function writeToPostgres(week: string, entry: FitnessEntry, goals?: typeof DEFAULT_GOALS) {
  await initializePostgresTables()
  
  if (goals) {
    await sql`
      INSERT INTO fitness_goals (week, steps, runs, swims)
      VALUES (${week}, ${goals.steps}, ${goals.runs}, ${goals.swims})
      ON CONFLICT (week) DO UPDATE SET 
        steps = EXCLUDED.steps,
        runs = EXCLUDED.runs,
        swims = EXCLUDED.swims
    `
  }
  
  await sql`
    INSERT INTO fitness_entries (
      entry_id, week, date, entry_type, name, steps, distance_km, 
      duration, distance, pace, calories, vo2max, training_load,
      stress_level, recovery_score, hrv, weight, body_fat, notes
    )
    VALUES (
      ${entry.id}, ${week}, ${entry.date}, ${entry.type}, ${entry.name || null}, 
      ${entry.steps || null}, ${entry.distanceKm || null}, ${entry.duration || null}, 
      ${entry.distance || null}, ${entry.pace || null}, ${entry.calories || null}, 
      ${entry.vo2max || null}, ${entry.trainingLoad || null}, ${entry.stressLevel || null}, 
      ${entry.recoveryScore || null}, ${entry.hrv || null}, ${entry.weight || null}, 
      ${entry.bodyFat || null}, ${entry.notes || null}
    )
    ON CONFLICT (entry_id) DO UPDATE SET
      entry_type = EXCLUDED.entry_type,
      name = EXCLUDED.name,
      steps = EXCLUDED.steps,
      distance_km = EXCLUDED.distance_km,
      duration = EXCLUDED.duration,
      distance = EXCLUDED.distance,
      pace = EXCLUDED.pace,
      calories = EXCLUDED.calories,
      vo2max = EXCLUDED.vo2max,
      training_load = EXCLUDED.training_load,
      stress_level = EXCLUDED.stress_level,
      recovery_score = EXCLUDED.recovery_score,
      hrv = EXCLUDED.hrv,
      weight = EXCLUDED.weight,
      body_fat = EXCLUDED.body_fat,
      notes = EXCLUDED.notes
  `
}

async function deleteFromPostgres(week: string, entryId?: string) {
  await initializePostgresTables()
  
  if (entryId) {
    await sql`DELETE FROM fitness_entries WHERE week = ${week} AND entry_id = ${entryId}`
  } else {
    await sql`DELETE FROM fitness_entries WHERE week = ${week}`
    await sql`DELETE FROM fitness_goals WHERE week = ${week}`
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
    const dateParam = searchParams.get('date')
    const rangeParam = searchParams.get('range')
    const weekParam = searchParams.get('week')

    // Helper to load a week's data from Postgres or fallback
    const loadWeek = async (weekKey: string): Promise<FitnessWeek> => {
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

    // If range is specified, return multiple weeks of data
    if (rangeParam) {
      const days = parseInt(rangeParam) || 7
      const allEntries: FitnessEntry[] = []
      const now = new Date()

      const seenWeeks = new Set<string>()
      for (let i = 0; i < days; i++) {
        const d = new Date(now)
        d.setDate(now.getDate() - i)
        const wk = getWeekKey(d)
        if (!seenWeeks.has(wk)) {
          seenWeeks.add(wk)
          const weekData = await loadWeek(wk)
          allEntries.push(...weekData.entries)
        }
      }

      // Filter to only the last N days
      const cutoff = new Date(now)
      cutoff.setDate(now.getDate() - days)
      const cutoffStr = cutoff.toISOString().split('T')[0]
      const filtered = allEntries.filter(e => e.date >= cutoffStr)

      return NextResponse.json({
        range: days,
        activities: filtered,
        count: filtered.length,
      })
    }

    // If date is specified, return that date's entries plus weekly summary
    if (dateParam) {
      const targetDate = new Date(dateParam + 'T00:00:00Z')
      const weekKey = getWeekKey(targetDate)
      const weekData = await loadWeek(weekKey)

      const dayEntries = weekData.entries.filter(e => e.date === dateParam)

      return NextResponse.json({
        date: dateParam,
        activities: dayEntries,
        weekly_summary: {
          runs: weekData.totals.runs,
          swims: weekData.totals.swims,
          cycles: weekData.totals.cycles,
          bjj: weekData.totals.jiujitsu,
          total_calories_burned: weekData.totals.totalCalories,
        },
        weekly_targets: {
          runs: weekData.goals.runs,
          swims: weekData.goals.swims,
          cycles: 1,
          bjj: 2,
        },
      })
    }

    // Default: return week data (existing behavior)
    const week = weekParam || getWeekKey(new Date())
    const weekData = await loadWeek(week)
    return NextResponse.json(weekData)

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
      
      existingData.goals = { ...existingData.goals, ...goals }
      
      let storage = 'fallback'
      if (usePostgres) {
        try {
          // Write updated goals to Postgres
          await sql`
            INSERT INTO fitness_goals (week, steps, runs, swims)
            VALUES (${weekKey}, ${existingData.goals.steps}, ${existingData.goals.runs}, ${existingData.goals.swims})
            ON CONFLICT (week) DO UPDATE SET 
              steps = EXCLUDED.steps,
              runs = EXCLUDED.runs,
              swims = EXCLUDED.swims
          `
          storage = 'postgres'
        } catch (error) {
          console.error('Postgres write error:', error)
        }
      }
      writeToFallback(weekKey, existingData)
      
      return NextResponse.json({ ...existingData, storage })
    }

    // Handle entry creation — accept both { entry: { type, ... } } and flat { type, ... }
    const resolvedEntry = entry || (body.type ? body : null)
    if (!resolvedEntry || !resolvedEntry.type) {
      return NextResponse.json(
        { error: 'Entry with type required. Send { entry: { type, ... } } or { type, ... }' },
        { status: 400 }
      )
    }

    const VALID_TYPES = ['steps', 'run', 'swim', 'cycle', 'jiujitsu', 'gym', 'other', 'vo2max', 'training_load', 'stress', 'recovery', 'hrv', 'weight', 'body_fat']
    if (!VALID_TYPES.includes(resolvedEntry.type)) {
      return NextResponse.json(
        { error: `Type must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    const weekKey = week || getWeekKey(new Date())
    const entryDate = resolvedEntry.date || new Date().toISOString().split('T')[0]

    // Create new entry with calculated fields
    const newEntry: FitnessEntry = {
      id: resolvedEntry.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: entryDate,
      timestamp: resolvedEntry.timestamp || new Date().toISOString(),
      type: resolvedEntry.type,
      name: resolvedEntry.name,
      notes: resolvedEntry.notes,
    }

    // Add type-specific fields
    if (resolvedEntry.type === 'steps') {
      newEntry.steps = Number(resolvedEntry.steps) || 0
      newEntry.distanceKm = resolvedEntry.distanceKm || calculateDistanceFromSteps(newEntry.steps)
    } else if (resolvedEntry.type === 'run' || resolvedEntry.type === 'swim' || resolvedEntry.type === 'cycle') {
      newEntry.duration = Number(resolvedEntry.duration) || 0
      newEntry.distance = Number(resolvedEntry.distance) || 0
      newEntry.calories = Number(resolvedEntry.calories) || 0
      newEntry.pace = resolvedEntry.pace || calculatePace(newEntry.duration, newEntry.distance)
    } else if (resolvedEntry.type === 'vo2max') {
      newEntry.vo2max = Number(resolvedEntry.vo2max) || 0
    } else if (resolvedEntry.type === 'training_load') {
      newEntry.trainingLoad = Number(resolvedEntry.trainingLoad) || 0
    } else if (resolvedEntry.type === 'stress') {
      newEntry.stressLevel = Number(resolvedEntry.stressLevel) || 0
    } else if (resolvedEntry.type === 'recovery') {
      newEntry.recoveryScore = Number(resolvedEntry.recoveryScore) || 0
    } else if (resolvedEntry.type === 'hrv') {
      newEntry.hrv = Number(resolvedEntry.hrv) || 0
    } else if (resolvedEntry.type === 'weight') {
      newEntry.weight = Number(resolvedEntry.weight) || 0
    } else if (resolvedEntry.type === 'body_fat') {
      newEntry.bodyFat = Number(resolvedEntry.bodyFat) || 0
    } else if (resolvedEntry.type === 'jiujitsu' || resolvedEntry.type === 'gym' || resolvedEntry.type === 'other') {
      if (resolvedEntry.duration) newEntry.duration = Number(resolvedEntry.duration)
      if (resolvedEntry.calories) newEntry.calories = Number(resolvedEntry.calories)
    }

    // Get existing data
    let existingData: FitnessWeek | null = null
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

    // For steps: replace existing entry for the same date
    if (resolvedEntry.type === 'steps') {
      existingData.entries = existingData.entries.filter(e =>
        !(e.type === 'steps' && e.date === entryDate)
      )
      // Also delete from Postgres if using it
      if (usePostgres) {
        try {
          await sql`DELETE FROM fitness_entries WHERE week = ${weekKey} AND entry_type = 'steps' AND date = ${entryDate}`
        } catch (error) {
          console.error('Postgres delete error:', error)
        }
      }
    }

    // Add new entry and recalculate
    const updatedEntries = [...existingData.entries, newEntry]
    const updatedData = calculateWeekData(weekKey, updatedEntries)
    updatedData.goals = existingData.goals

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
    return NextResponse.json({ error: 'Failed to save fitness entry' }, { status: 500 })
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
    let existingData: FitnessWeek | null = null
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
    updatedData.goals = existingData.goals

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
    return NextResponse.json({ error: 'Failed to delete fitness entry' }, { status: 500 })
  }
}
