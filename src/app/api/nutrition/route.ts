import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// In-memory storage for serverless environments (Vercel)
const memoryStore: Record<string, any> = {}

// Data file path for persistence (local development)
const DATA_FILE = path.join(process.cwd(), 'data', 'nutrition.json')

// Check if we're in a serverless environment
const isServerless = process.env.VERCEL || !fs.existsSync(process.cwd() + '/package.json')

// Ensure data directory exists (local dev only)
function ensureDataDir() {
  const dataDir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

// Read nutrition data
function readData(): Record<string, any> {
  // Use in-memory store for serverless environments
  if (isServerless) {
    return memoryStore
  }
  
  // Use file storage for local development
  try {
    ensureDataDir()
    if (!fs.existsSync(DATA_FILE)) {
      return {}
    }
    const data = fs.readFileSync(DATA_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Error reading nutrition data:', error)
    return {}
  }
}

// Write nutrition data
function writeData(data: Record<string, any>) {
  // Skip file writes in serverless environments
  if (isServerless) {
    Object.assign(memoryStore, data)
    return
  }
  
  try {
    ensureDataDir()
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Error writing nutrition data:', error)
  }
}

// GET /api/nutrition - Get nutrition data for a specific date
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    
    const allData = readData()
    const dateData = allData[date] || {
      date,
      entries: [],
      totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      goals: { calories: 2000, protein: 150, carbs: 200, fat: 65 }
    }
    
    return NextResponse.json(dateData)
  } catch (error) {
    console.error('GET nutrition error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve nutrition data' },
      { status: 500 }
    )
  }
}

// POST /api/nutrition - Add new nutrition entry
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
    
    const allData = readData()
    
    // Get existing data for this date or create new
    const existingData = allData[date] || {
      date,
      entries: [],
      totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      goals: goals || { calories: 2000, protein: 150, carbs: 200, fat: 65 }
    }
    
    // Handle different input formats:
    // 1. Single entry with name, calories, etc.
    // 2. Array of entries
    // 3. Complete data object with entries array
    
    let newEntries: any[] = []
    
    if (entries && Array.isArray(entries)) {
      // Format: { date, entries: [...], totals, goals }
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
      // Format: Single entry { name/food, calories, protein, carbs, fat, time }
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
    
    // Add new entries to existing entries
    const updatedEntries = [...existingData.entries, ...newEntries]
    
    // Recalculate totals from all entries
    const calculatedTotals = updatedEntries.reduce(
      (acc, entry) => ({
        calories: acc.calories + (Number(entry.calories) || 0),
        protein: acc.protein + (Number(entry.protein) || 0),
        carbs: acc.carbs + (Number(entry.carbs) || 0),
        fat: acc.fat + (Number(entry.fat) || 0)
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )
    
    // Use provided totals if available, otherwise use calculated
    const finalTotals = totals || calculatedTotals
    
    // Update goals if provided
    const finalGoals = goals || existingData.goals
    
    // Save updated data
    allData[date] = {
      date,
      entries: updatedEntries,
      totals: finalTotals,
      goals: finalGoals
    }
    
    writeData(allData)
    
    return NextResponse.json({
      success: true,
      date,
      entries: updatedEntries,
      totals: finalTotals,
      goals: finalGoals
    })
    
  } catch (error) {
    console.error('POST nutrition error:', error)
    return NextResponse.json(
      { error: 'Failed to save nutrition data' },
      { status: 500 }
    )
  }
}

// DELETE /api/nutrition - Delete a specific entry
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const entryId = searchParams.get('entryId')
    
    const allData = readData()
    
    if (!allData[date]) {
      return NextResponse.json(
        { error: 'No data found for this date' },
        { status: 404 }
      )
    }
    
    if (entryId) {
      // Delete specific entry
      allData[date].entries = allData[date].entries.filter((e: any) => e.id !== entryId)
      
      // Recalculate totals
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
      // Delete all data for this date
      delete allData[date]
    }
    
    writeData(allData)
    
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
