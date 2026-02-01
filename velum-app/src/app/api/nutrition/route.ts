import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { Redis } from '@upstash/redis'
import fs from 'fs'
import path from 'path'

// Storage mode detection
const usePostgres = !!process.env.POSTGRES_URL

// Initialize Redis client (fallback)
let redis: Redis | null = null
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
} catch (error) {
  console.error('Redis initialization error:', error)
}

// File fallback paths
const DATA_PATHS = [
  path.join(process.cwd(), 'data', 'nutrition.json'),
  path.join(process.cwd(), '..', 'data', 'nutrition.json'),
  path.join('/var/task', 'data', 'nutrition.json'),
]

const isServerless = process.env.VERCEL || !fs.existsSync(process.cwd() + '/package.json')
const useRedis = !!redis && !usePostgres

// Seed data for initial load
const SEED_DATA: Record<string, any> = {
  "2026-02-01": {
    "date": "2026-02-01",
    "entries": [
      { "id": "20260201-001", "name": "Matcha latte", "calories": 70, "protein": 4, "carbs": 8, "fat": 2, "time": "08:00", "date": "2026-02-01" },
      { "id": "20260201-002", "name": "Huevos rancheros", "calories": 203, "protein": 12, "carbs": 18, "fat": 10, "time": "09:30", "date": "2026-02-01" },
      { "id": "20260201-003", "name": "Patatas bravas", "calories": 280, "protein": 4, "carbs": 35, "fat": 14, "time": "13:00", "date": "2026-02-01" },
      { "id": "20260201-004", "name": "Grilled seafood platter", "calories": 220, "protein": 28, "carbs": 5, "fat": 8, "time": "14:30", "date": "2026-02-01" },
      { "id": "20260201-005", "name": "Fideuà with seafood", "calories": 420, "protein": 24, "carbs": 58, "fat": 10, "time": "15:00", "date": "2026-02-01" },
      { "id": "20260201-006", "name": "Coke (can)", "calories": 139, "protein": 0, "carbs": 35, "fat": 0, "time": "16:00", "date": "2026-02-01" },
      { "id": "20260201-007", "name": "Cinnamon roll", "calories": 220, "protein": 4, "carbs": 32, "fat": 8, "time": "17:00", "date": "2026-02-01" }
    ],
    "totals": { "calories": 1552, "protein": 76, "carbs": 191, "fat": 52 },
    "goals": { "calories": 2000, "protein": 150, "carbs": 200, "fat": 65 }
  }
}

// ==================== POSTGRES FUNCTIONS ====================

async function readFromPostgres(date: string): Promise<any> {
  try {
    // Get entries for date
    const entriesResult = await sql`
      SELECT entry_id as id, name, calories, protein, carbs, fat, 
             TO_CHAR(entry_time, 'HH24:MI') as time, date::text as date
      FROM nutrition_entries 
      WHERE date = ${date}
      ORDER BY entry_time
    `
    
    // Get goals for date (or default)
    const goalsResult = await sql`
      SELECT calories, protein, carbs, fat 
      FROM nutrition_goals 
      WHERE date = ${date}
    `
    
    const goals = goalsResult.rows[0] || { calories: 2000, protein: 150, carbs: 200, fat: 65 }
    const entries = entriesResult.rows
    
    // Calculate totals
    const totals = entries.reduce(
      (acc, entry) => ({
        calories: acc.calories + (Number(entry.calories) || 0),
        protein: acc.protein + (Number(entry.protein) || 0),
        carbs: acc.carbs + (Number(entry.carbs) || 0),
        fat: acc.fat + (Number(entry.fat) || 0)
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )
    
    return {
      date,
      entries,
      totals,
      goals
    }
  } catch (error) {
    console.error('Postgres read error:', error)
    throw error
  }
}

async function writeToPostgres(date: string, entries: any[], goals?: any) {
  try {
    // Insert/update goals
    if (goals) {
      await sql`
        INSERT INTO nutrition_goals (date, calories, protein, carbs, fat)
        VALUES (${date}, ${goals.calories}, ${goals.protein}, ${goals.carbs}, ${goals.fat})
        ON CONFLICT (date) 
        DO UPDATE SET 
          calories = EXCLUDED.calories,
          protein = EXCLUDED.protein,
          carbs = EXCLUDED.carbs,
          fat = EXCLUDED.fat,
          updated_at = CURRENT_TIMESTAMP
      `
    }
    
    // Insert entries
    for (const entry of entries) {
      await sql`
        INSERT INTO nutrition_entries (entry_id, date, name, calories, protein, carbs, fat, entry_time)
        VALUES (
          ${entry.id}, 
          ${date}, 
          ${entry.name}, 
          ${entry.calories}, 
          ${entry.protein}, 
          ${entry.carbs}, 
          ${entry.fat},
          ${entry.time}
        )
        ON CONFLICT (entry_id) 
        DO UPDATE SET 
          name = EXCLUDED.name,
          calories = EXCLUDED.calories,
          protein = EXCLUDED.protein,
          carbs = EXCLUDED.carbs,
          fat = EXCLUDED.fat,
          entry_time = EXCLUDED.entry_time,
          updated_at = CURRENT_TIMESTAMP
      `
    }
  } catch (error) {
    console.error('Postgres write error:', error)
    throw error
  }
}

async function deleteFromPostgres(date: string, entryId?: string) {
  try {
    if (entryId) {
      await sql`DELETE FROM nutrition_entries WHERE date = ${date} AND entry_id = ${entryId}`
    } else {
      await sql`DELETE FROM nutrition_entries WHERE date = ${date}`
      await sql`DELETE FROM nutrition_goals WHERE date = ${date}`
    }
  } catch (error) {
    console.error('Postgres delete error:', error)
    throw error
  }
}

// ==================== FALLBACK FUNCTIONS ====================

function findDataFile(): string | null {
  for (const filePath of DATA_PATHS) {
    if (fs.existsSync(filePath)) {
      return filePath
    }
  }
  return DATA_PATHS[0]
}

const DATA_FILE = findDataFile()

function loadInitialData(): Record<string, any> {
  if (!DATA_FILE || !fs.existsSync(DATA_FILE)) {
    return { ...SEED_DATA }
  }
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return { ...SEED_DATA }
  }
}

const memoryStore: Record<string, any> = loadInitialData()

async function readFromFallback(date: string): Promise<any> {
  // Try Redis
  if (useRedis && redis) {
    try {
      const data = await redis.get('nutrition:data')
      const allData = (data as Record<string, any>) || {}
      return allData[date] || {
        date,
        entries: [],
        totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        goals: { calories: 2000, protein: 150, carbs: 200, fat: 65 }
      }
    } catch (error) {
      console.error('Redis read error:', error)
    }
  }
  
  // Use memory store
  if (isServerless) {
    return memoryStore[date] || {
      date,
      entries: [],
      totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      goals: { calories: 2000, protein: 150, carbs: 200, fat: 65 }
    }
  }
  
  // Use file
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return {
        date,
        entries: [],
        totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        goals: { calories: 2000, protein: 150, carbs: 200, fat: 65 }
      }
    }
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
    return data[date] || {
      date,
      entries: [],
      totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      goals: { calories: 2000, protein: 150, carbs: 200, fat: 65 }
    }
  } catch {
    return {
      date,
      entries: [],
      totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      goals: { calories: 2000, protein: 150, carbs: 200, fat: 65 }
    }
  }
}

async function writeToFallback(date: string, data: any) {
  if (useRedis && redis) {
    try {
      const allData = await redis.get('nutrition:data') as Record<string, any> || {}
      allData[date] = data
      await redis.set('nutrition:data', allData)
      return
    } catch (error) {
      console.error('Redis write error:', error)
    }
  }
  
  if (isServerless) {
    memoryStore[date] = data
    return
  }
  
  try {
    const dir = path.dirname(DATA_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    let allData: Record<string, any> = {}
    if (fs.existsSync(DATA_FILE)) {
      allData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
    }
    allData[date] = data
    fs.writeFileSync(DATA_FILE, JSON.stringify(allData, null, 2))
  } catch (error) {
    console.error('File write error:', error)
  }
}

// ==================== API HANDLERS ====================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    
    // Check seed data first
    if (SEED_DATA[date]) {
      return NextResponse.json(SEED_DATA[date])
    }
    
    let data
    if (usePostgres) {
      try {
        data = await readFromPostgres(date)
      } catch {
        data = await readFromFallback(date)
      }
    } else {
      data = await readFromFallback(date)
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('GET nutrition error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve nutrition data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, entries, totals, goals } = body
    
    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      )
    }
    
    // Build new entries array
    let newEntries: any[] = []
    
    if (entries && Array.isArray(entries)) {
      newEntries = entries.map((entry: any, index: number) => ({
        id: entry.id || `${Date.now()}-${index}`,
        name: entry.name || entry.food || 'Unknown food',
        calories: Number(entry.calories) || 0,
        protein: Number(entry.protein) || 0,
        carbs: Number(entry.carbs) || 0,
        fat: Number(entry.fat) || 0,
        time: entry.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        date: date
      }))
    } else if (body.name || body.food) {
      newEntries = [{
        id: body.id || `${Date.now()}`,
        name: body.name || body.food || 'Unknown food',
        calories: Number(body.calories) || 0,
        protein: Number(body.protein) || 0,
        carbs: Number(body.carbs) || 0,
        fat: Number(body.fat) || 0,
        time: body.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        date: date
      }]
    }
    
    let existingEntries: any[] = []
    
    // Read existing data
    if (usePostgres) {
      try {
        const existing = await readFromPostgres(date)
        existingEntries = existing.entries || []
      } catch {
        const fallback = await readFromFallback(date)
        existingEntries = fallback.entries || []
      }
    } else {
      const fallback = await readFromFallback(date)
      existingEntries = fallback.entries || []
    }
    
    // Merge entries
    const updatedEntries = [...existingEntries, ...newEntries]
    
    // Recalculate totals
    const calculatedTotals = updatedEntries.reduce(
      (acc, entry) => ({
        calories: acc.calories + (Number(entry.calories) || 0),
        protein: acc.protein + (Number(entry.protein) || 0),
        carbs: acc.carbs + (Number(entry.carbs) || 0),
        fat: acc.fat + (Number(entry.fat) || 0)
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )
    
    const finalTotals = totals || calculatedTotals
    const finalGoals = goals || { calories: 2000, protein: 150, carbs: 200, fat: 65 }
    
    // Save data
    const dataToSave = {
      date,
      entries: updatedEntries,
      totals: finalTotals,
      goals: finalGoals
    }
    
    if (usePostgres) {
      try {
        await writeToPostgres(date, updatedEntries, finalGoals)
      } catch {
        await writeToFallback(date, dataToSave)
      }
    } else {
      await writeToFallback(date, dataToSave)
    }
    
    return NextResponse.json({
      success: true,
      date,
      entries: updatedEntries,
      totals: finalTotals,
      goals: finalGoals,
      storage: usePostgres ? 'postgres' : useRedis ? 'redis' : isServerless ? 'memory' : 'file'
    })
    
  } catch (error) {
    console.error('POST nutrition error:', error)
    return NextResponse.json(
      { error: 'Failed to save nutrition data' },
      { status: 500 }
    )
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
        const remaining = await readFromPostgres(date)
        return NextResponse.json({
          success: true,
          date,
          entries: remaining.entries,
          totals: remaining.totals
        })
      } catch {
        // Fallback to file/memory
      }
    }
    
    // Fallback delete
    const allData = isServerless ? memoryStore : JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8') || '{}')
    
    if (!allData[date]) {
      return NextResponse.json(
        { error: 'No data found for this date' },
        { status: 404 }
      )
    }
    
    if (entryId) {
      allData[date].entries = allData[date].entries.filter((e: any) => e.id !== entryId)
      allData[date].totals = allData[date].entries.reduce(
        (acc: any, entry: any) => ({
          calories: acc.calories + (Number(entry.calories) || 0),
          protein: acc.protein + (Number(entry.protein) || 0),
          carbs: acc.carbs + (Number(entry.carbs) || 0),
          fat: acc.fat + (Number(entry.fat) || 0)
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      )
    } else {
      delete allData[date]
    }
    
    await writeToFallback(date, allData[date])
    
    return NextResponse.json({
      success: true,
      date,
      entries: allData[date]?.entries || [],
      totals: allData[date]?.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 }
    })
    
  } catch (error) {
    console.error('DELETE nutrition error:', error)
    return NextResponse.json(
      { error: 'Failed to delete nutrition data' },
      { status: 500 }
    )
  }
}
