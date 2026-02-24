import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { getAvatarState } from '../../lib/avatarStore'

export const dynamic = 'force-dynamic'

const usePostgres = !!process.env.POSTGRES_URL

const DEFAULT_NUTRITION_GOALS = { calories: 2600, protein: 160, carbs: 310, fat: 80 }

/**
 * GET /api/avatar
 *
 * Returns the full avatar state: bond score, avatar params, health snapshot, insights, greeting.
 * Aggregates data from fitness, nutrition, budget, chat, and insights stores.
 */
export async function GET() {
  try {
    // Fetch today's nutrition data (no shared store — query directly)
    let nutritionData: {
      totals: { calories: number; protein: number }
      goals: { calories: number; protein: number }
      dates: string[]
    } | null = null

    if (usePostgres) {
      try {
        const today = new Date().toISOString().split('T')[0]

        // Today's nutrition totals
        const todayResult = await sql`
          SELECT
            COALESCE(SUM(calories), 0) as calories,
            COALESCE(SUM(protein), 0) as protein
          FROM nutrition_entries
          WHERE date = ${today}
        `

        // Nutrition goals
        const goalsResult = await sql`
          SELECT calories, protein FROM nutrition_goals
          WHERE date = ${today}
        `

        // Dates with entries in the last 7 days (for logging frequency + streak)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const datesResult = await sql`
          SELECT DISTINCT date::text as date
          FROM nutrition_entries
          WHERE date >= ${sevenDaysAgo.toISOString().split('T')[0]}
        `

        const goalsRow = goalsResult.rows[0] as { calories: number; protein: number } | undefined

        nutritionData = {
          totals: {
            calories: Number(todayResult.rows[0]?.calories ?? 0),
            protein: Number(todayResult.rows[0]?.protein ?? 0),
          },
          goals: goalsRow
            ? { calories: Number(goalsRow.calories), protein: Number(goalsRow.protein) }
            : { calories: DEFAULT_NUTRITION_GOALS.calories, protein: DEFAULT_NUTRITION_GOALS.protein },
          dates: (datesResult.rows as Array<{ date: string }>).map(r => r.date),
        }
      } catch (error) {
        console.error('[avatar] Nutrition query error:', error)
      }
    }

    const state = await getAvatarState(nutritionData)

    return NextResponse.json(state)
  } catch (error) {
    console.error('[avatar] Error computing avatar state:', error)
    return NextResponse.json(
      { error: 'Failed to compute avatar state' },
      { status: 500 },
    )
  }
}
