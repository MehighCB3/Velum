import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export const dynamic = 'force-dynamic'

const usePostgres = !!process.env.POSTGRES_URL

// Get date range for last 7 days
function getDateRange(endDate: string): string[] {
  const dates: string[] = []
  const end = new Date(endDate)
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date(end)
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }
  
  return dates
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const endDate = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const dates = getDateRange(endDate)
    
    if (usePostgres) {
      try {
        const startDate = dates[0]
        const endDateQuery = dates[6]
        
        // Fetch all entries for the date range
        const entriesResult = await sql`
          SELECT date::text as date, entry_id as id, name, calories, protein, carbs, fat, entry_time as time
          FROM nutrition_entries 
          WHERE date >= ${startDate}::date AND date <= ${endDateQuery}::date
          ORDER BY date, entry_time
        `
        
        // Fetch goals for the range
        const goalsResult = await sql`
          SELECT date::text as date, calories, protein, carbs, fat
          FROM nutrition_goals 
          WHERE date >= ${startDate}::date AND date <= ${endDateQuery}::date
        `
        
        // Build daily summaries
        const dailyData = dates.map(date => {
          const dayRawEntries = entriesResult.rows.filter(e => e.date === date)
          const dayGoalRaw = goalsResult.rows.find(g => g.date === date)
          const dayGoal = dayGoalRaw
            ? {
                calories: Number(dayGoalRaw.calories),
                protein: Number(dayGoalRaw.protein),
                carbs: Number(dayGoalRaw.carbs),
                fat: Number(dayGoalRaw.fat),
              }
            : { calories: 2600, protein: 160, carbs: 310, fat: 80 }

          // Convert entries to ensure numeric types
          const dayEntries = (dayRawEntries as Array<{ id: string; name: string; calories: string | number; protein: string | number; carbs: string | number; fat: string | number; time: string }>).map((entry) => ({
            id: entry.id,
            name: entry.name,
            calories: Number(entry.calories),
            protein: Number(entry.protein),
            carbs: Number(entry.carbs),
            fat: Number(entry.fat),
            time: entry.time,
            date,
          }))

          const totals = dayEntries.reduce(
            (acc, entry) => ({
              calories: acc.calories + entry.calories,
              protein: acc.protein + entry.protein,
              carbs: acc.carbs + entry.carbs,
              fat: acc.fat + entry.fat,
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
          )

          return {
            date,
            entries: dayEntries,
            totals,
            goals: dayGoal,
            dayName: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
            dayNumber: new Date(date).getDate()
          }
        })
        
        // Calculate weekly totals
        const weeklyTotals = dailyData.reduce(
          (acc, day) => ({
            calories: acc.calories + day.totals.calories,
            protein: acc.protein + day.totals.protein,
            carbs: acc.carbs + day.totals.carbs,
            fat: acc.fat + day.totals.fat
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        )
        
        return NextResponse.json({
          days: dailyData,
          weeklyTotals,
          averageDaily: {
            calories: Math.round(weeklyTotals.calories / 7),
            protein: Math.round(weeklyTotals.protein / 7),
            carbs: Math.round(weeklyTotals.carbs / 7),
            fat: Math.round(weeklyTotals.fat / 7)
          }
        })
        
      } catch (error) {
        console.error('Postgres error:', error)
      }
    }
    
    // Fallback: return empty week
    const emptyDays = dates.map(date => ({
      date,
      entries: [],
      totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      goals: { calories: 2600, protein: 160, carbs: 310, fat: 80 },
      dayName: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: new Date(date).getDate()
    }))
    
    return NextResponse.json({
      days: emptyDays,
      weeklyTotals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      averageDaily: { calories: 0, protein: 0, carbs: 0, fat: 0 }
    })
    
  } catch (error) {
    console.error('GET week error:', error)
    return NextResponse.json({ error: 'Failed to load week data' }, { status: 500 })
  }
}
