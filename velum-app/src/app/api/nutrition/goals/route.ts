import { NextRequest, NextResponse } from 'next/server'
import { query, usePostgres } from '../../../lib/db'

export const dynamic = 'force-dynamic'

const DEFAULT_GOALS = { calories: 2600, protein: 160, carbs: 310, fat: 80 }

// CORS is handled by middleware — these are kept for OPTIONS preflight only
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.APP_URL || 'https://velum-five.vercel.app',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

// GET /api/nutrition/goals?date=2026-02-15
// Returns goals for a specific date, or defaults if none set
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    if (usePostgres) {
      try {
        const result = await query(
          'SELECT calories, protein, carbs, fat FROM nutrition_goals WHERE date = $1',
          [date]
        )
        if (result.rows[0]) {
          return NextResponse.json({
            date,
            goals: {
              calories: Number(result.rows[0].calories),
              protein: Number(result.rows[0].protein),
              carbs: Number(result.rows[0].carbs),
              fat: Number(result.rows[0].fat),
            },
            source: 'database',
          }, { headers: CORS_HEADERS })
        }
      } catch (error) {
        console.error('Postgres read error:', error)
      }
    }

    return NextResponse.json({
      date,
      goals: DEFAULT_GOALS,
      source: 'defaults',
    }, { headers: CORS_HEADERS })
  } catch (error) {
    console.error('GET goals error:', error)
    return NextResponse.json({ error: 'Failed to load goals' }, { status: 500, headers: CORS_HEADERS })
  }
}

// POST /api/nutrition/goals
// Body: { "date": "2026-02-15", "calories": 2600, "protein": 160, "carbs": 310, "fat": 80 }
// Sets goals for a specific date. Omitted fields keep their defaults.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const date = body.date || new Date().toISOString().split('T')[0]
    const goals = {
      calories: Number(body.calories) || DEFAULT_GOALS.calories,
      protein: Number(body.protein) || DEFAULT_GOALS.protein,
      carbs: Number(body.carbs) || DEFAULT_GOALS.carbs,
      fat: Number(body.fat) || DEFAULT_GOALS.fat,
    }

    if (usePostgres) {
      try {
        await query(
          'INSERT INTO nutrition_goals (date, calories, protein, carbs, fat) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (date) DO UPDATE SET calories = EXCLUDED.calories, protein = EXCLUDED.protein, carbs = EXCLUDED.carbs, fat = EXCLUDED.fat',
          [date, goals.calories, goals.protein, goals.carbs, goals.fat]
        )
        return NextResponse.json({
          success: true,
          date,
          goals,
          source: 'database',
        }, { headers: CORS_HEADERS })
      } catch (error) {
        console.error('Postgres write error:', error)
      }
    }

    return NextResponse.json({
      success: true,
      date,
      goals,
      source: 'fallback',
    }, { headers: CORS_HEADERS })
  } catch (error) {
    console.error('POST goals error:', error)
    return NextResponse.json({ error: 'Failed to save goals' }, { status: 500, headers: CORS_HEADERS })
  }
}

// PUT /api/nutrition/goals — same as POST, for REST convention
export { POST as PUT }
