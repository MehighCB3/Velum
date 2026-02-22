import { NextRequest, NextResponse } from 'next/server'
import {
  usePostgres,
  WEEKLY_BUDGET,
  BudgetEntry,
  loadWeek,
  addBudgetEntry,
  initializePostgresTables,
  readFromPostgres,
  readFromFallback,
  writeToFallback,
  deleteFromPostgres,
  calculateWeekData,
} from '../../lib/budgetStore'
import { getWeekKey } from '../../lib/weekUtils'

export const dynamic = 'force-dynamic'

// ==================== API HANDLERS ====================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const weekParam = searchParams.get('week')

    const week = dateParam
      ? getWeekKey(new Date(dateParam + 'T00:00:00Z'))
      : weekParam || getWeekKey(new Date())

    const data = await loadWeek(week)

    return NextResponse.json({
      ...data,
      totals: {
        spent: data.totalSpent,
        budget: WEEKLY_BUDGET,
        remaining: data.remaining,
        by_category: data.categories,
      },
      storage: usePostgres ? 'postgres' : 'fallback'
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

    if (!['Food', 'Fun', 'Transport', 'Subscriptions', 'Other'].includes(entry.category)) {
      return NextResponse.json(
        { error: 'Category must be Food, Fun, Transport, Subscriptions, or Other' },
        { status: 400 }
      )
    }

    const weekKey = week || getWeekKey(new Date())

    const newEntry: BudgetEntry = {
      id: entry.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      amount: Number(entry.amount),
      category: entry.category,
      description: entry.description || '',
      date: entry.date || new Date().toISOString().split('T')[0],
      timestamp: entry.timestamp || new Date().toISOString(),
      reason: entry.reason
    }

    const result = await addBudgetEntry(weekKey, newEntry)
    return NextResponse.json(result)

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

    const existingData = await loadWeek(week)

    const updatedEntries = existingData.entries.filter(e => e.id !== entryId)
    const updatedData = calculateWeekData(week, updatedEntries)

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
