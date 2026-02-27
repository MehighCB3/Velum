import { describe, it, expect } from 'vitest'
import {
  calculateDistanceFromSteps,
  calculatePace,
  calculateWeekData,
  buildEntry,
  readFromFallback,
  writeToFallback,
  DEFAULT_GOALS,
  VALID_TYPES,
  type FitnessEntry,
} from '../fitnessStore'

describe('calculateDistanceFromSteps', () => {
  it('converts steps to km using 0.0007 factor', () => {
    expect(calculateDistanceFromSteps(10000)).toBe(7)
  })

  it('returns 0 for 0 steps', () => {
    expect(calculateDistanceFromSteps(0)).toBe(0)
  })

  it('rounds to two decimal places', () => {
    expect(calculateDistanceFromSteps(1234)).toBe(0.86)
  })
})

describe('calculatePace', () => {
  it('calculates min/km from duration and distance', () => {
    // 30 min / 5 km = 6.0 min/km
    expect(calculatePace(30, 5)).toBe(6)
  })

  it('rounds to one decimal place', () => {
    // 25 min / 4 km = 6.25 → 6.3
    expect(calculatePace(25, 4)).toBe(6.3)
  })

  it('returns 0 when distance is 0', () => {
    expect(calculatePace(30, 0)).toBe(0)
  })

  it('returns 0 when distance is negative', () => {
    expect(calculatePace(30, -1)).toBe(0)
  })
})

describe('buildEntry', () => {
  it('builds a steps entry with auto-calculated distance', () => {
    const entry = buildEntry({ type: 'steps', steps: 8000, date: '2025-01-06' })
    expect(entry.type).toBe('steps')
    expect(entry.steps).toBe(8000)
    expect(entry.distanceKm).toBe(5.6)
    expect(entry.date).toBe('2025-01-06')
    expect(entry.id).toBeTruthy()
  })

  it('builds a run entry with pace calculated', () => {
    const entry = buildEntry({ type: 'run', duration: 30, distance: 5, calories: 300 })
    expect(entry.type).toBe('run')
    expect(entry.duration).toBe(30)
    expect(entry.distance).toBe(5)
    expect(entry.pace).toBe(6)
    expect(entry.calories).toBe(300)
  })

  it('builds a swim entry', () => {
    const entry = buildEntry({ type: 'swim', duration: 45, distance: 1.5 })
    expect(entry.type).toBe('swim')
    expect(entry.duration).toBe(45)
    expect(entry.distance).toBe(1.5)
  })

  it('builds a vo2max entry', () => {
    const entry = buildEntry({ type: 'vo2max', vo2max: 52.3 })
    expect(entry.vo2max).toBe(52.3)
  })

  it('builds a sleep entry', () => {
    const entry = buildEntry({ type: 'sleep', sleepHours: 7.5, sleepScore: 85 })
    expect(entry.sleepHours).toBe(7.5)
    expect(entry.sleepScore).toBe(85)
  })

  it('builds a weight entry', () => {
    const entry = buildEntry({ type: 'weight', weight: 75.2 })
    expect(entry.weight).toBe(75.2)
  })

  it('builds a jiujitsu entry with optional duration and calories', () => {
    const entry = buildEntry({ type: 'jiujitsu', duration: 60, calories: 500 })
    expect(entry.type).toBe('jiujitsu')
    expect(entry.duration).toBe(60)
    expect(entry.calories).toBe(500)
  })

  it('uses provided id if present', () => {
    const entry = buildEntry({ type: 'run', id: 'my-id', duration: 0, distance: 0 })
    expect(entry.id).toBe('my-id')
  })
})

describe('calculateWeekData', () => {
  // Week 2025-W02 = Mon 2025-01-06 → Sun 2025-01-12
  const week = '2025-W02'

  it('returns empty totals for no entries', () => {
    const result = calculateWeekData(week, [])
    expect(result.totals.steps).toBe(0)
    expect(result.totals.runs).toBe(0)
    expect(result.entries).toHaveLength(0)
    expect(result.goals).toEqual(DEFAULT_GOALS)
  })

  it('sums steps correctly', () => {
    const entries: FitnessEntry[] = [
      { id: '1', date: '2025-01-06', timestamp: '', type: 'steps', steps: 5000, distanceKm: 3.5 },
      { id: '2', date: '2025-01-07', timestamp: '', type: 'steps', steps: 8000, distanceKm: 5.6 },
    ]
    const result = calculateWeekData(week, entries)
    expect(result.totals.steps).toBe(13000)
    expect(result.totals.totalDistance).toBeCloseTo(9.1, 1)
  })

  it('counts run sessions and accumulates distance', () => {
    const entries: FitnessEntry[] = [
      { id: '1', date: '2025-01-06', timestamp: '', type: 'run', distance: 5, duration: 30, calories: 300 },
      { id: '2', date: '2025-01-08', timestamp: '', type: 'run', distance: 10, duration: 55, calories: 600 },
    ]
    const result = calculateWeekData(week, entries)
    expect(result.totals.runs).toBe(2)
    expect(result.totals.runDistance).toBe(15)
    expect(result.totals.totalCalories).toBe(900)
  })

  it('counts swim and cycle sessions', () => {
    const entries: FitnessEntry[] = [
      { id: '1', date: '2025-01-06', timestamp: '', type: 'swim', distance: 1.5, duration: 40, calories: 400 },
      { id: '2', date: '2025-01-07', timestamp: '', type: 'cycle', distance: 20, duration: 60, calories: 500 },
    ]
    const result = calculateWeekData(week, entries)
    expect(result.totals.swims).toBe(1)
    expect(result.totals.cycles).toBe(1)
    expect(result.totals.swimDistance).toBe(1.5)
    expect(result.totals.cycleDistance).toBe(20)
  })

  it('counts jiujitsu sessions', () => {
    const entries: FitnessEntry[] = [
      { id: '1', date: '2025-01-06', timestamp: '', type: 'jiujitsu' },
      { id: '2', date: '2025-01-08', timestamp: '', type: 'jiujitsu' },
    ]
    const result = calculateWeekData(week, entries)
    expect(result.totals.jiujitsu).toBe(2)
  })

  it('calculates advanced metrics', () => {
    const entries: FitnessEntry[] = [
      { id: '1', date: '2025-01-06', timestamp: '', type: 'vo2max', vo2max: 50 },
      { id: '2', date: '2025-01-07', timestamp: '', type: 'vo2max', vo2max: 52 },
      { id: '3', date: '2025-01-06', timestamp: '', type: 'stress', stressLevel: 30 },
      { id: '4', date: '2025-01-06', timestamp: '', type: 'recovery', recoveryScore: 80 },
      { id: '5', date: '2025-01-07', timestamp: '', type: 'hrv', hrv: 65 },
      { id: '6', date: '2025-01-08', timestamp: '', type: 'weight', weight: 75 },
      { id: '7', date: '2025-01-06', timestamp: '', type: 'sleep', sleepHours: 7.5, sleepScore: 85 },
    ]
    const result = calculateWeekData(week, entries)
    expect(result.advanced!.avgVo2max).toBe(51)
    expect(result.advanced!.avgStress).toBe(30)
    expect(result.advanced!.avgRecovery).toBe(80)
    expect(result.advanced!.recoveryStatus).toBe('good')
    expect(result.advanced!.latestHrv).toBe(65)
    expect(result.advanced!.latestWeight).toBe(75)
    expect(result.advanced!.avgSleepHours).toBe(7.5)
    expect(result.advanced!.avgSleepScore).toBe(85)
  })

  it('classifies recovery status correctly', () => {
    // fair: 40–69
    const fairEntries: FitnessEntry[] = [
      { id: '1', date: '2025-01-06', timestamp: '', type: 'recovery', recoveryScore: 50 },
    ]
    expect(calculateWeekData(week, fairEntries).advanced!.recoveryStatus).toBe('fair')

    // poor: <40
    const poorEntries: FitnessEntry[] = [
      { id: '1', date: '2025-01-06', timestamp: '', type: 'recovery', recoveryScore: 20 },
    ]
    expect(calculateWeekData(week, poorEntries).advanced!.recoveryStatus).toBe('poor')
  })

  it('filters entries to the correct week dates only', () => {
    const entries: FitnessEntry[] = [
      { id: '1', date: '2025-01-06', timestamp: '', type: 'run', distance: 5, duration: 30, calories: 300 },
      { id: '2', date: '2025-01-15', timestamp: '', type: 'run', distance: 10, duration: 55, calories: 600 }, // wrong week
    ]
    const result = calculateWeekData(week, entries)
    expect(result.totals.runs).toBe(1)
    expect(result.entries).toHaveLength(1)
  })
})

describe('fallback storage', () => {
  it('returns empty week for uninitialized key', () => {
    const data = readFromFallback('9999-W01')
    expect(data.week).toBe('9999-W01')
    expect(data.entries).toHaveLength(0)
    expect(data.totals.steps).toBe(0)
    expect(data.goals).toEqual(DEFAULT_GOALS)
  })

  it('round-trips data through write/read', () => {
    const week = '9999-W02'
    const data = calculateWeekData(week, [])
    writeToFallback(week, data)
    const read = readFromFallback(week)
    expect(read.week).toBe(week)
  })
})

describe('VALID_TYPES', () => {
  it('includes all expected fitness entry types', () => {
    expect(VALID_TYPES).toContain('steps')
    expect(VALID_TYPES).toContain('run')
    expect(VALID_TYPES).toContain('swim')
    expect(VALID_TYPES).toContain('cycle')
    expect(VALID_TYPES).toContain('jiujitsu')
    expect(VALID_TYPES).toContain('gym')
    expect(VALID_TYPES).toContain('vo2max')
    expect(VALID_TYPES).toContain('sleep')
    expect(VALID_TYPES).toContain('weight')
    expect(VALID_TYPES).toContain('body_fat')
    expect(VALID_TYPES).toContain('hrv')
  })
})
