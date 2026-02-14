import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Quick-log accepts simple POST requests from external automation tools
// (Tasker, iOS Shortcuts, curl, etc.) and routes to the appropriate API.
//
// Auth: Bearer token via QUICK_LOG_TOKEN env var (optional — if not set, endpoint is open)
//
// POST /api/quick-log
// Body: { "type": "steps|expense|meal|weight", "value": ..., "description": "..." }

const QUICK_LOG_TOKEN = process.env.QUICK_LOG_TOKEN || ''

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
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

    const baseUrl = request.nextUrl.origin
    const date = new Date().toISOString().split('T')[0]
    const time = new Date().toTimeString().slice(0, 5)
    const id = `ql-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    let result: Response

    switch (type) {
      case 'steps': {
        const steps = Number(value) || 0
        if (steps <= 0) {
          return NextResponse.json({ error: 'Steps value must be positive' }, { status: 400, headers: CORS_HEADERS })
        }
        result = await fetch(`${baseUrl}/api/fitness`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entry: {
              id,
              type: 'steps',
              date,
              steps,
              notes: description || '',
              name: 'Steps',
            },
          }),
        })
        break
      }

      case 'expense': {
        const amount = Number(value) || 0
        if (amount <= 0) {
          return NextResponse.json({ error: 'Amount must be positive' }, { status: 400, headers: CORS_HEADERS })
        }
        result = await fetch(`${baseUrl}/api/budget`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entry: {
              id,
              amount,
              category: category || 'Other',
              description: description || 'Quick expense',
              date,
              time,
            },
          }),
        })
        break
      }

      case 'meal': {
        if (!description) {
          return NextResponse.json({ error: 'Description required for meal' }, { status: 400, headers: CORS_HEADERS })
        }
        const calories = Number(value) || 0
        result = await fetch(`${baseUrl}/api/nutrition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date,
            entries: [{
              id,
              name: description,
              calories,
              protein: 0,
              carbs: 0,
              fat: 0,
              time,
              date,
            }],
          }),
        })
        break
      }

      case 'weight': {
        const weight = Number(value) || 0
        if (weight <= 0) {
          return NextResponse.json({ error: 'Weight value must be positive' }, { status: 400, headers: CORS_HEADERS })
        }
        result = await fetch(`${baseUrl}/api/fitness`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entry: {
              id,
              type: 'weight',
              date,
              value: weight,
              notes: description || '',
              name: 'Weight',
            },
          }),
        })
        break
      }

      default:
        return NextResponse.json(
          { error: `Unknown type "${type}". Supported: steps, expense, meal, weight` },
          { status: 400, headers: CORS_HEADERS }
        )
    }

    if (!result.ok) {
      const errBody = await result.text()
      return NextResponse.json(
        { error: `Upstream API error: ${errBody}` },
        { status: result.status, headers: CORS_HEADERS }
      )
    }

    const data = await result.json()
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
