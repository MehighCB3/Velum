/**
 * Shared fitness storage module.
 * Used by both /api/fitness (route handler) and /api/fitness/webhook
 * to avoid self-referencing fetch() calls that cause Vercel timeouts.
 */

import { query, usePostgres } from './db'
import { getWeekKey, getWeekDates } from './weekUtils'

export { getWeekKey, usePostgres }

// Default goals
export const DEFAULT_GOALS = {
  steps: 10000,
  runs: 3,
  swims: 2,
}

// Fitness entry types
export interface FitnessEntry {
  id: string
  date: string
  timestamp: string
  type: 'steps' | 'run' | 'swim' | 'cycle' | 'jiujitsu' | 'gym' | 'other' | 'vo2max' | 'training_load' | 'stress' | 'recovery' | 'hrv' | 'weight' | 'body_fat' | 'sleep'
  name?: string
  steps?: number
  distanceKm?: number
  duration?: number
  distance?: number
  pace?: number
  calories?: number
  vo2max?: number
  trainingLoad?: number
  stressLevel?: number
  recoveryScore?: number
  hrv?: number
  weight?: number
  bodyFat?: number
  sleepHours?: number
  sleepScore?: number
  notes?: string
}

export interface FitnessWeek {
  week: string
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
    steps: number
    runs: number
    swims: number
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
    avgSleepHours: number
    avgSleepScore: number
  }
}

// In-memory fallback storage
const fallbackStorage: Record<string, FitnessWeek> = {}

export const VALID_TYPES = ['steps', 'run', 'swim', 'cycle', 'jiujitsu', 'gym', 'other', 'vo2max', 'training_load', 'stress', 'recovery', 'hrv', 'weight', 'body_fat', 'sleep']

// Calculate distance from steps
export function calculateDistanceFromSteps(steps: number): number {
  return Math.round((steps * 0.0007) * 100) / 100
}

// Calculate pace (min/km)
export function calculatePace(duration: number, distance: number): number {
  if (!distance || distance <= 0) return 0
  return Math.round((duration / distance) * 10) / 10
}

// Calculate week data from entries
export function calculateWeekData(week: string, entries: FitnessEntry[]): FitnessWeek {
  const weekDates = getWeekDates(week)
  const weekEntries = entries.filter(e => weekDates.includes(e.date))

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
    steps: 0, runs: 0, swims: 0, cycles: 0, jiujitsu: 0,
    totalDistance: 0, totalCalories: 0,
    runDistance: 0, swimDistance: 0, cycleDistance: 0,
  })

  // Advanced metrics
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

  let recoveryStatus: 'good' | 'fair' | 'poor' = 'good'
  if (avgRecovery > 0) {
    if (avgRecovery >= 70) recoveryStatus = 'good'
    else if (avgRecovery >= 40) recoveryStatus = 'fair'
    else recoveryStatus = 'poor'
  } else if (totalTrainingLoad > 0) {
    if (totalTrainingLoad > 400) recoveryStatus = 'poor'
    else if (totalTrainingLoad > 250) recoveryStatus = 'fair'
    else recoveryStatus = 'good'
  }

  const hrvEntries = weekEntries.filter(e => e.type === 'hrv' && e.hrv).sort((a, b) => b.date.localeCompare(a.date))
  const weightEntries = weekEntries.filter(e => e.type === 'weight' && e.weight).sort((a, b) => b.date.localeCompare(a.date))
  const bodyFatEntries = weekEntries.filter(e => e.type === 'body_fat' && e.bodyFat).sort((a, b) => b.date.localeCompare(a.date))
  const sleepEntries = weekEntries.filter(e => e.type === 'sleep' && e.sleepHours).sort((a, b) => b.date.localeCompare(a.date))

  const avgSleepHours = sleepEntries.length > 0
    ? Math.round(sleepEntries.reduce((a, e) => a + (e.sleepHours || 0), 0) / sleepEntries.length * 10) / 10
    : 0
  const avgSleepScore = sleepEntries.filter(e => e.sleepScore).length > 0
    ? Math.round(sleepEntries.filter(e => e.sleepScore).reduce((a, e) => a + (e.sleepScore || 0), 0) / sleepEntries.filter(e => e.sleepScore).length)
    : 0

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
      avgSleepHours,
      avgSleepScore,
    }
  }
}

// ==================== POSTGRES FUNCTIONS ====================

let tablesInitialized = false

export async function initializePostgresTables(): Promise<void> {
  if (tablesInitialized) return

  try {
    await query(`
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
        sleep_hours DECIMAL(4,2),
        sleep_score INTEGER,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await query('ALTER TABLE fitness_entries ADD COLUMN IF NOT EXISTS sleep_hours DECIMAL(4,2)')
    await query('ALTER TABLE fitness_entries ADD COLUMN IF NOT EXISTS sleep_score INTEGER')
    await query(`
      CREATE TABLE IF NOT EXISTS fitness_goals (
        week VARCHAR(10) UNIQUE NOT NULL PRIMARY KEY,
        steps INTEGER NOT NULL DEFAULT 10000,
        runs INTEGER NOT NULL DEFAULT 3,
        swims INTEGER NOT NULL DEFAULT 2
      )
    `)
    await query('CREATE INDEX IF NOT EXISTS idx_fitness_entries_week ON fitness_entries(week)')
    await query('CREATE INDEX IF NOT EXISTS idx_fitness_entries_date ON fitness_entries(date)')
    await query('CREATE INDEX IF NOT EXISTS idx_fitness_entries_type ON fitness_entries(entry_type)')
    tablesInitialized = true
  } catch (error) {
    console.error('Failed to initialize fitness tables:', error)
    throw error
  }
}

export async function readFromPostgres(week: string): Promise<FitnessWeek | null> {
  const entriesResult = await query(
    `SELECT entry_id as id, date::text as date, entry_type as type, name,
            steps, distance_km as "distanceKm", duration, distance, pace, calories,
            vo2max, training_load as "trainingLoad", stress_level as "stressLevel",
            recovery_score as "recoveryScore", hrv, weight, body_fat as "bodyFat",
            sleep_hours as "sleepHours", sleep_score as "sleepScore",
            notes, created_at as timestamp
     FROM fitness_entries WHERE week = $1 ORDER BY date, created_at`,
    [week]
  )

  const goalsResult = await query(
    'SELECT steps, runs, swims FROM fitness_goals WHERE week = $1',
    [week]
  )

  const goalsRow = goalsResult.rows[0] as { steps: number; runs: number; swims: number } | undefined
  const goals = goalsRow
    ? { steps: Number(goalsRow.steps), runs: Number(goalsRow.runs), swims: Number(goalsRow.swims) }
    : DEFAULT_GOALS

  const entries = (entriesResult.rows as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    date: row.date as string,
    timestamp: row.timestamp as string,
    type: row.type as FitnessEntry['type'],
    name: (row.name as string) ?? undefined,
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
    sleepHours: row.sleepHours != null ? Number(row.sleepHours) : undefined,
    sleepScore: row.sleepScore != null ? Number(row.sleepScore) : undefined,
    notes: (row.notes as string) ?? undefined,
  })) as FitnessEntry[]

  if (entries.length === 0 && goalsResult.rows.length === 0) return null

  const weekData = calculateWeekData(week, entries)
  weekData.goals = goals
  return weekData
}

export async function writeToPostgres(week: string, entry: FitnessEntry, goals?: typeof DEFAULT_GOALS) {
  await initializePostgresTables()

  if (goals) {
    await query(
      `INSERT INTO fitness_goals (week, steps, runs, swims)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (week) DO UPDATE SET
         steps = EXCLUDED.steps, runs = EXCLUDED.runs, swims = EXCLUDED.swims`,
      [week, goals.steps, goals.runs, goals.swims]
    )
  }

  await query(
    `INSERT INTO fitness_entries (
       entry_id, week, date, entry_type, name, steps, distance_km,
       duration, distance, pace, calories, vo2max, training_load,
       stress_level, recovery_score, hrv, weight, body_fat,
       sleep_hours, sleep_score, notes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
     ON CONFLICT (entry_id) DO UPDATE SET
       entry_type = EXCLUDED.entry_type, name = EXCLUDED.name,
       steps = EXCLUDED.steps, distance_km = EXCLUDED.distance_km,
       duration = EXCLUDED.duration, distance = EXCLUDED.distance,
       pace = EXCLUDED.pace, calories = EXCLUDED.calories,
       vo2max = EXCLUDED.vo2max, training_load = EXCLUDED.training_load,
       stress_level = EXCLUDED.stress_level, recovery_score = EXCLUDED.recovery_score,
       hrv = EXCLUDED.hrv, weight = EXCLUDED.weight, body_fat = EXCLUDED.body_fat,
       sleep_hours = EXCLUDED.sleep_hours, sleep_score = EXCLUDED.sleep_score,
       notes = EXCLUDED.notes`,
    [entry.id, week, entry.date, entry.type, entry.name || null,
     entry.steps || null, entry.distanceKm || null, entry.duration || null,
     entry.distance || null, entry.pace || null, entry.calories || null,
     entry.vo2max || null, entry.trainingLoad || null, entry.stressLevel || null,
     entry.recoveryScore || null, entry.hrv || null, entry.weight || null,
     entry.bodyFat || null, entry.sleepHours || null, entry.sleepScore || null,
     entry.notes || null]
  )
}

export async function deleteFromPostgres(week: string, entryId?: string) {
  await initializePostgresTables()

  if (entryId) {
    await query('DELETE FROM fitness_entries WHERE week = $1 AND entry_id = $2', [week, entryId])
  } else {
    await query('DELETE FROM fitness_entries WHERE week = $1', [week])
    await query('DELETE FROM fitness_goals WHERE week = $1', [week])
  }
}

// ==================== FALLBACK STORAGE ====================

export function readFromFallback(week: string): FitnessWeek {
  return fallbackStorage[week] || {
    week,
    entries: [],
    totals: {
      steps: 0, runs: 0, swims: 0, cycles: 0, jiujitsu: 0,
      totalDistance: 0, totalCalories: 0,
      runDistance: 0, swimDistance: 0, cycleDistance: 0,
    },
    goals: { ...DEFAULT_GOALS },
    advanced: {
      avgVo2max: 0, totalTrainingLoad: 0, avgStress: 0, avgRecovery: 0,
      recoveryStatus: 'good', latestHrv: 0, latestWeight: 0, latestBodyFat: 0,
      avgSleepHours: 0, avgSleepScore: 0,
    }
  }
}

export function writeToFallback(week: string, data: FitnessWeek): void {
  fallbackStorage[week] = data
}

// ==================== HIGH-LEVEL OPERATIONS ====================

/** Load a week's fitness data from Postgres or fallback. */
export async function loadWeek(weekKey: string): Promise<FitnessWeek> {
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

/** Build a FitnessEntry from a raw input object. */
export function buildEntry(resolvedEntry: Record<string, unknown>): FitnessEntry {
  const entryDate = (resolvedEntry.date as string) || new Date().toISOString().split('T')[0]

  const newEntry: FitnessEntry = {
    id: (resolvedEntry.id as string) || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    date: entryDate,
    timestamp: (resolvedEntry.timestamp as string) || new Date().toISOString(),
    type: resolvedEntry.type as FitnessEntry['type'],
    name: resolvedEntry.name as string | undefined,
    notes: resolvedEntry.notes as string | undefined,
  }

  if (resolvedEntry.type === 'steps') {
    newEntry.steps = Number(resolvedEntry.steps) || 0
    newEntry.distanceKm = (resolvedEntry.distanceKm as number) || calculateDistanceFromSteps(newEntry.steps)
  } else if (resolvedEntry.type === 'run' || resolvedEntry.type === 'swim' || resolvedEntry.type === 'cycle') {
    newEntry.duration = Number(resolvedEntry.duration) || 0
    newEntry.distance = Number(resolvedEntry.distance) || 0
    newEntry.calories = Number(resolvedEntry.calories) || 0
    newEntry.pace = (resolvedEntry.pace as number) || calculatePace(newEntry.duration, newEntry.distance)
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
  } else if (resolvedEntry.type === 'sleep') {
    newEntry.sleepHours = Number(resolvedEntry.sleepHours) || 0
    if (resolvedEntry.sleepScore) newEntry.sleepScore = Number(resolvedEntry.sleepScore)
  } else if (resolvedEntry.type === 'jiujitsu' || resolvedEntry.type === 'gym' || resolvedEntry.type === 'other') {
    if (resolvedEntry.duration) newEntry.duration = Number(resolvedEntry.duration)
    if (resolvedEntry.calories) newEntry.calories = Number(resolvedEntry.calories)
  }

  return newEntry
}

/**
 * Add a fitness entry directly to storage.
 * Returns the updated week data. No HTTP fetch involved.
 */
export async function addFitnessEntry(
  weekKey: string,
  newEntry: FitnessEntry,
): Promise<FitnessWeek & { storage: string }> {
  // Get existing data
  let existingData = await loadWeek(weekKey)

  // For steps: replace existing entry for the same date
  if (newEntry.type === 'steps') {
    existingData.entries = existingData.entries.filter(e =>
      !(e.type === 'steps' && e.date === newEntry.date)
    )
    if (usePostgres) {
      try {
        await query('DELETE FROM fitness_entries WHERE week = $1 AND entry_type = $2 AND date = $3', [weekKey, 'steps', newEntry.date])
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

  return { ...updatedData, storage }
}
