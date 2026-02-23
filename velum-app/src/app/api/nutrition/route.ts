import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export const dynamic = 'force-dynamic'

// Storage mode detection
const usePostgres = !!process.env.POSTGRES_URL

// Nutrition types
interface NutritionEntry {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  time: string
  date: string
  photoUrl?: string
}

interface NutritionGoals {
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface NutritionDay {
  date: string
  entries: NutritionEntry[]
  totals: NutritionGoals
  goals: NutritionGoals
}

// Seed data fallback
const SEED_DATA: Record<string, NutritionDay> = {
  "2026-02-01": {
    "date": "2026-02-01",
    "entries": [
      { "id": "20260201-001", "name": "Matcha latte", "calories": 70, "protein": 4, "carbs": 8, "fat": 2, "time": "08:00", "date": "2026-02-01" },
      { "id": "20260201-002", "name": "Huevos rancheros", "calories": 203, "protein": 12, "carbs": 18, "fat": 10, "time": "09:30", "date": "2026-02-01" },
      { "id": "20260201-003", "name": "Patatas bravas", "calories": 280, "protein": 4, "carbs": 35, "fat": 14, "time": "13:00", "date": "2026-02-01" },
      { "id": "20260201-004", "name": "Grilled seafood platter", "calories": 220, "protein": 28, "carbs": 5, "fat": 8, "time": "14:30", "date": "2026-02-01" },
      { "id": "20260201-005", "name": "Fideuà with seafood", "calories": 420, "protein": 24, "carbs": 58, "fat": 10, "time": "15:00", "date": "2026-02-01" },
      { "id": "20260201-006", "name": "Coke (can)", "calories": 139, "protein": 0, "carbs": 35, "fat": 0, "time": "16:00", "date": "2026-02-01" },
      { "id": "20260201-007", "name": "Cinnamon roll", "calories": 220, "protein": 4, "carbs": 32, "fat": 8, "time": "17:00", "date": "2026-02-01" },
      { "id": "20260201-008", "name": "Pringles Salt & Vinegar (165g)", "calories": 850, "protein": 6, "carbs": 90, "fat": 55, "time": "20:30", "date": "2026-02-01" },
      { "id": "20260201-009", "name": "Dr Pepper (330ml)", "calories": 140, "protein": 0, "carbs": 36, "fat": 0, "time": "20:31", "date": "2026-02-01" },
      { "id": "20260201-010", "name": "Toblerone (50g)", "calories": 260, "protein": 3, "carbs": 29, "fat": 14, "time": "20:32", "date": "2026-02-01" }
    ],
    "totals": { "calories": 2802, "protein": 85, "carbs": 346, "fat": 121 },
    "goals": { "calories": 2600, "protein": 160, "carbs": 310, "fat": 80 }
  }
}

// ==================== POSTGRES FUNCTIONS ====================

let tablesInitialized = false

async function initializePostgresTables(): Promise<void> {
  if (tablesInitialized) return
  
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
      CREATE TABLE IF NOT EXISTS nutrition_goals (
        date DATE UNIQUE NOT NULL,
        calories INTEGER NOT NULL DEFAULT 2600,
        protein INTEGER NOT NULL DEFAULT 160,
        carbs INTEGER NOT NULL DEFAULT 310,
        fat INTEGER NOT NULL DEFAULT 80
      )
    `
    
    await sql`CREATE INDEX IF NOT EXISTS idx_entries_date ON nutrition_entries(date)`

    // Add photo_url column if it doesn't exist (migration-safe)
    try {
      await sql`ALTER TABLE nutrition_entries ADD COLUMN IF NOT EXISTS photo_url TEXT`
    } catch {
      // Column may already exist — ignore
    }

    tablesInitialized = true
  } catch (error) {
    console.error('Failed to initialize tables:', error)
    throw error
  }
}

async function readFromPostgres(date: string): Promise<NutritionDay> {
  const entriesResult = await sql`
    SELECT entry_id as id, name, calories, protein, carbs, fat,
           TO_CHAR(entry_time, 'HH24:MI') as time, photo_url as "photoUrl"
    FROM nutrition_entries
    WHERE date = ${date}
    ORDER BY entry_time
  `

  const goalsResult = await sql`
    SELECT calories, protein, carbs, fat
    FROM nutrition_goals
    WHERE date = ${date}
  `

  const goalsRow = goalsResult.rows[0] as { calories: number; protein: number; carbs: number; fat: number } | undefined
  const goals = goalsRow
    ? {
        calories: Number(goalsRow.calories),
        protein: Number(goalsRow.protein),
        carbs: Number(goalsRow.carbs),
        fat: Number(goalsRow.fat),
      }
    : SEED_DATA["2026-02-01"].goals

  // Convert entries ensuring numeric types (Postgres DECIMAL returns as string)
  const entries = (entriesResult.rows as Array<{
    id: string
    name: string
    calories: number | string
    protein: number | string
    carbs: number | string
    fat: number | string
    time: string
    photoUrl?: string | null
  }>).map((row) => ({
    id: row.id,
    name: row.name,
    calories: Number(row.calories),
    protein: Number(row.protein),
    carbs: Number(row.carbs),
    fat: Number(row.fat),
    time: row.time,
    date,
    photoUrl: row.photoUrl ?? undefined,
  }))

  const totals = entries.reduce(
    (acc, entry) => ({
      calories: acc.calories + entry.calories,
      protein: acc.protein + entry.protein,
      carbs: acc.carbs + entry.carbs,
      fat: acc.fat + entry.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  return { date, entries, totals, goals }
}

async function writeToPostgres(date: string, entries: NutritionEntry[], goals?: NutritionGoals) {
  await initializePostgresTables()
  
  if (goals) {
    await sql`
      INSERT INTO nutrition_goals (date, calories, protein, carbs, fat)
      VALUES (${date}, ${goals.calories}, ${goals.protein}, ${goals.carbs}, ${goals.fat})
      ON CONFLICT (date) DO UPDATE SET 
        calories = EXCLUDED.calories,
        protein = EXCLUDED.protein,
        carbs = EXCLUDED.carbs,
        fat = EXCLUDED.fat
    `
  }
  
  for (const entry of entries) {
    await sql`
      INSERT INTO nutrition_entries (entry_id, date, name, calories, protein, carbs, fat, entry_time, photo_url)
      VALUES (${entry.id}, ${date}, ${entry.name}, ${entry.calories}, ${entry.protein}, ${entry.carbs}, ${entry.fat}, ${entry.time}, ${entry.photoUrl || null})
      ON CONFLICT (entry_id) DO UPDATE SET
        name = EXCLUDED.name,
        calories = EXCLUDED.calories,
        protein = EXCLUDED.protein,
        carbs = EXCLUDED.carbs,
        fat = EXCLUDED.fat,
        entry_time = EXCLUDED.entry_time,
        photo_url = EXCLUDED.photo_url
    `
  }
}

async function deleteFromPostgres(date: string, entryId?: string) {
  await initializePostgresTables()
  
  if (entryId) {
    await sql`DELETE FROM nutrition_entries WHERE date = ${date} AND entry_id = ${entryId}`
  } else {
    await sql`DELETE FROM nutrition_entries WHERE date = ${date}`
    await sql`DELETE FROM nutrition_goals WHERE date = ${date}`
  }
}

// ==================== API HANDLERS ====================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    
    if (usePostgres) {
      try {
        await initializePostgresTables()
        const data = await readFromPostgres(date)
        return NextResponse.json(data)
      } catch (error) {
        console.error('Postgres error, falling back to seed:', error)
      }
    }
    
    // Fallback to seed data
    return NextResponse.json(SEED_DATA[date] || {
      date,
      entries: [],
      totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      goals: { calories: 2600, protein: 160, carbs: 310, fat: 80 }
    })
  } catch (error) {
    console.error('GET error:', error)
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, entries, totals, goals } = body
    
    if (!date) {
      return NextResponse.json({ error: 'Date required' }, { status: 400 })
    }
    
    // Build entries array
    const newEntries = entries || (body.name ? [{
      id: body.id || `${Date.now()}`,
      name: body.name || body.food || 'Unknown',
      calories: Number(body.calories) || 0,
      protein: Number(body.protein) || 0,
      carbs: Number(body.carbs) || 0,
      fat: Number(body.fat) || 0,
      time: body.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      date
    }] : [])
    
    if (usePostgres) {
      try {
        await writeToPostgres(date, newEntries, goals)
        const data = await readFromPostgres(date)
        return NextResponse.json({ ...data, storage: 'postgres' })
      } catch (error) {
        console.error('Postgres write error:', error)
      }
    }
    
    // Fallback response
    return NextResponse.json({
      success: true,
      date,
      entries: newEntries,
      totals: totals || { calories: 0, protein: 0, carbs: 0, fat: 0 },
      goals: goals || { calories: 2600, protein: 160, carbs: 310, fat: 80 },
      storage: 'fallback'
    })
  } catch (error) {
    console.error('POST error:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const entryId = searchParams.get('entryId')
    
    if (usePostgres) {
      try {
        await deleteFromPostgres(date, entryId || undefined)
        const data = await readFromPostgres(date)
        return NextResponse.json(data)
      } catch (error) {
        console.error('Delete error:', error)
      }
    }
    
    return NextResponse.json({ success: true, date, entries: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } })
  } catch (error) {
    console.error('DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
