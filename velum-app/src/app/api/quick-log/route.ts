import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { buildEntry, addFitnessEntry, getWeekKey } from '../../lib/fitnessStore'
import { addBudgetEntry, BudgetEntry, Category } from '../../lib/budgetStore'

export const dynamic = 'force-dynamic'

// Quick-log accepts simple POST requests from external automation tools
// (Tasker, iOS Shortcuts, curl, etc.) and routes to the appropriate storage.
//
// Auth: Bearer token via QUICK_LOG_TOKEN env var (optional)
//
// POST /api/quick-log
// Body: { "type": "steps|expense|meal|weight", "value": ..., "description": "..." }

const QUICK_LOG_TOKEN = process.env.QUICK_LOG_TOKEN || ''
const usePostgres = !!process.env.POSTGRES_URL

// CORS is handled by middleware — these are kept for OPTIONS preflight only
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://velum-five.vercel.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    if (QUICK_LOG_TOKEN) {
      const authHeader = request.headers.get('authorization')
      const token = authHeader?.replace('Bearer ', '')
      if (token !== QUICK_LOG_TOKEN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS })
      }
    }

    const body = await request.json()
    const { type, value, description, category } = body

    if (!type) {
      return NextResponse.json(
        { error: 'Missing "type" field. Supported: steps, expense, meal, weight' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const date = new Date().toISOString().split('T')[0]
    const time = new Date().toTimeString().slice(0, 5)
    const id = `ql-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any

    switch (type) {
      case 'steps': {
        const steps = Number(value) || 0
        if (steps <= 0) {
          return NextResponse.json({ error: 'Steps value must be positive' }, { status: 400, headers: CORS_HEADERS })
        }
        const weekKey = getWeekKey(new Date())
        const entry = buildEntry({ id, type: 'steps', date, steps, notes: description || '', name: 'Steps' })
        data = await addFitnessEntry(weekKey, entry)
        break
      }

      case 'expense': {
        const amount = Number(value) || 0
        if (amount <= 0) {
          return NextResponse.json({ error: 'Amount must be positive' }, { status: 400, headers: CORS_HEADERS })
        }
        const weekKey = getWeekKey(new Date())
        const entry: BudgetEntry = {
          id,
          amount,
          category: (category as Category) || 'Other',
          description: description || 'Quick expense',
          date,
          timestamp: new Date().toISOString(),
        }
        data = await addBudgetEntry(weekKey, entry)
        break
      }

      case 'meal': {
        if (!description) {
          return NextResponse.json({ error: 'Description required for meal' }, { status: 400, headers: CORS_HEADERS })
        }
        const calories = Number(value) || 0

        // Write directly to Postgres or return fallback
        if (usePostgres) {
          try {
            await sql`
              CREATE TABLE IF NOT EXISTS nutrition_entries (
                id SERIAL PRIMARY KEY,
                entry_id VARCHAR(50) UNIQUE NOT NULL,
                date DATE NOT NULL,
                name VARCHAR(255) NOT NULL,
                calories INTEGER NOT NULL DEFAULT 0,
                protein DECIMAL(6,2) NOT NULL DEFAULT 0,
                carbs DECIMAL(6,2) NOT NULL DEFAULT 0,
                fat DECIMAL(6,2) NOT NULL DEFAULT 0,
                entry_time TIME NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
            `
            await sql`
              INSERT INTO nutrition_entries (entry_id, date, name, calories, protein, carbs, fat, entry_time)
              VALUES (${id}, ${date}, ${description}, ${calories}, ${0}, ${0}, ${0}, ${time})
              ON CONFLICT (entry_id) DO NOTHING
            `
          } catch (error) {
            console.error('Nutrition write error:', error)
          }
        }
        data = { success: true, date, entry: { id, name: description, calories, date, time } }
        break
      }

      case 'weight': {
        const weight = Number(value) || 0
        if (weight <= 0) {
          return NextResponse.json({ error: 'Weight value must be positive' }, { status: 400, headers: CORS_HEADERS })
        }
        const weekKey = getWeekKey(new Date())
        const entry = buildEntry({ id, type: 'weight', date, weight, notes: description || '', name: 'Weight' })
        data = await addFitnessEntry(weekKey, entry)
        break
      }

      default:
        return NextResponse.json(
          { error: `Unknown type "${type}". Supported: steps, expense, meal, weight` },
          { status: 400, headers: CORS_HEADERS }
        )
    }

    return NextResponse.json(
      { success: true, type, logged: { value, description, category, date, time }, data },
      { headers: CORS_HEADERS }
    )
  } catch (error) {
    console.error('Quick-log error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
