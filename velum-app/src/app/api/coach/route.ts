import { NextResponse } from 'next/server'
import { getAvatarState } from '../../lib/avatarStore'
import { getAllInsights } from '../../lib/insightsStore'
import { query, usePostgres } from '../../lib/db'

export const dynamic = 'force-dynamic'
const DEFAULT_NUTRITION_GOALS = { calories: 2600, protein: 160, carbs: 310, fat: 80 }

// Relationship state mapping from bond score
function getRelState(bondScore: number): {
  index: number
  key: string
  label: string
} {
  if (bondScore < 25) return { index: 0, key: 'distant', label: 'Getting to know you' }
  if (bondScore < 50) return { index: 1, key: 'neutral', label: 'Building rapport' }
  if (bondScore < 75) return { index: 2, key: 'warm', label: 'In sync' }
  return { index: 3, key: 'bonded', label: 'Deep connection' }
}

/**
 * GET /api/coach
 *
 * Returns aggregated coach state: avatar, metrics, insights, relationship.
 * Single endpoint for the Coach screen to call on mount.
 */
export async function GET() {
  try {
    // Fetch nutrition data for avatar state calculation
    let nutritionData: {
      totals: { calories: number; protein: number }
      goals: { calories: number; protein: number }
      dates: string[]
    } | null = null

    if (usePostgres) {
      try {
        const today = new Date().toISOString().split('T')[0]

        const todayResult = await query(
          'SELECT COALESCE(SUM(calories), 0) as calories, COALESCE(SUM(protein), 0) as protein FROM nutrition_entries WHERE date = $1',
          [today]
        )

        const goalsResult = await query(
          'SELECT calories, protein FROM nutrition_goals WHERE date = $1',
          [today]
        )

        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const datesResult = await query(
          'SELECT DISTINCT date::text as date FROM nutrition_entries WHERE date >= $1',
          [sevenDaysAgo.toISOString().split('T')[0]]
        )

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
        console.error('[coach] Nutrition query error:', error)
      }
    }

    // Fetch avatar state and insights in parallel
    const [avatarState, insights] = await Promise.all([
      getAvatarState(nutritionData),
      getAllInsights(),
    ])

    const relState = getRelState(avatarState.bond.score)

    return NextResponse.json({
      name: 'Archie',
      relState: relState.index,
      relLabel: relState.label,
      relKey: relState.key,
      streak: avatarState.bond.streak,
      bond: avatarState.bond,
      avatarParams: avatarState.avatarParams,
      health: avatarState.health,
      insights,
      greeting: avatarState.greeting,
    })
  } catch (error) {
    console.error('[coach] Error:', error)
    return NextResponse.json(
      { error: 'Failed to load coach data' },
      { status: 500 },
    )
  }
}
