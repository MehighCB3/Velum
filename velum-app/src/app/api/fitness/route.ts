import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import {
  usePostgres,
  DEFAULT_GOALS,
  VALID_TYPES,
  loadWeek,
  buildEntry,
  addFitnessEntry,
  initializePostgresTables,
  readFromPostgres,
  readFromFallback,
  writeToFallback,
  deleteFromPostgres,
  calculateWeekData,
} from '../../lib/fitnessStore'
import { getWeekKey, getWeekDates } from '../../lib/weekUtils'

// Re-export types for the webhook to import
export type { FitnessEntry, FitnessWeek } from '../../lib/fitnessStore'

export const dynamic = 'force-dynamic'

// ==================== API HANDLERS ====================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const rangeParam = searchParams.get('range')
    const weekParam = searchParams.get('week')

    // If range is specified, return multiple weeks of data
    if (rangeParam) {
      const days = parseInt(rangeParam) || 7
      const allEntries: any[] = []
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

    // Default: return week data
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

      let existingData = await loadWeek(weekKey)
      existingData.goals = { ...existingData.goals, ...goals }

      let storage = 'fallback'
      if (usePostgres) {
        try {
          await initializePostgresTables()
          await sql`
            INSERT INTO fitness_goals (week, steps, runs, swims)
            VALUES (${weekKey}, ${existingData.goals.steps}, ${existingData.goals.runs}, ${existingData.goals.swims})
            ON CONFLICT (week) DO UPDATE SET
              steps = EXCLUDED.steps, runs = EXCLUDED.runs, swims = EXCLUDED.swims
          `
          storage = 'postgres'
        } catch (error) {
          console.error('Postgres write error:', error)
        }
      }
      writeToFallback(weekKey, existingData)

      return NextResponse.json({ ...existingData, storage })
    }

    // Handle entry creation
    const resolvedEntry = entry || (body.type ? body : null)
    if (!resolvedEntry || !resolvedEntry.type) {
      return NextResponse.json(
        { error: 'Entry with type required. Send { entry: { type, ... } } or { type, ... }' },
        { status: 400 }
      )
    }

    if (!VALID_TYPES.includes(resolvedEntry.type)) {
      return NextResponse.json(
        { error: `Type must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    const weekKey = week || getWeekKey(new Date())
    const newEntry = buildEntry(resolvedEntry)
    const result = await addFitnessEntry(weekKey, newEntry)

    return NextResponse.json(result)

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

    let existingData = await loadWeek(week)

    const updatedEntries = existingData.entries.filter(e => e.id !== entryId)
    const updatedData = calculateWeekData(week, updatedEntries)
    updatedData.goals = existingData.goals

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
