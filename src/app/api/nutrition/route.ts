import { NextRequest, NextResponse } from 'next/server'

const GATEWAY_URL = process.env.GATEWAY_URL || 'https://rasppi5.tail5b3227.ts.net'
const GATEWAY_PASSWORD = process.env.GATEWAY_PASSWORD

// Default nutrition goals
const DEFAULT_GOALS = { calories: 2000, protein: 150, carbs: 200, fat: 65 }

// Helper to call gateway tools (awaits response)
async function invokeTool(tool: string, args: Record<string, unknown>) {
  const response = await fetch(`${GATEWAY_URL}/tools/invoke`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GATEWAY_PASSWORD}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ tool, args })
  })
  return response.json()
}

// Helper to extract text from tool result content
function extractText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    for (const item of content) {
      if (item?.type === 'text' && item?.text) return item.text
    }
  }
  return ''
}

// Interface for food log entries (normalized format for Velum UI)
interface FoodEntry {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  time: string
  meal: string
  photo?: string | null
}

// Helper to normalize bot's JSON format to Velum's expected format
// Bot outputs: { entries: [{ timestamp, meal_type, items: [{name, calories, ...}], total }] }
// Velum needs: { entries: [{ id, name, calories, protein, carbs, fat, time, meal }] }
function normalizeEntries(rawEntries: any[], date: string): FoodEntry[] {
  const normalized: FoodEntry[] = []
  let entryIndex = 0

  for (const entry of rawEntries) {
    // Check if this is the bot's nested format (has items array)
    if (entry.items && Array.isArray(entry.items)) {
      for (const item of entry.items) {
        entryIndex++
        normalized.push({
          id: `${date}-${String(entryIndex).padStart(3, '0')}`,
          name: item.name || 'Unknown food',
          calories: item.calories || 0,
          protein: item.protein || 0,
          carbs: item.carbs || 0,
          fat: item.fat || 0,
          time: entry.timestamp ? new Date(entry.timestamp).toTimeString().slice(0, 5) : '12:00',
          meal: entry.meal_type || entry.meal || 'snack',
          photo: item.photo || null
        })
      }
    } else {
      // Already in flat format (or close to it)
      entryIndex++
      normalized.push({
        id: entry.id || `${date}-${String(entryIndex).padStart(3, '0')}`,
        name: entry.name || 'Unknown food',
        calories: entry.calories || 0,
        protein: entry.protein || 0,
        carbs: entry.carbs || 0,
        fat: entry.fat || 0,
        time: entry.time || (entry.timestamp ? new Date(entry.timestamp).toTimeString().slice(0, 5) : '12:00'),
        meal: entry.meal || entry.meal_type || 'snack',
        photo: entry.photo || null
      })
    }
  }

  return normalized
}

// The main session where Telegram logs food - this is our source of truth
const MAIN_SESSION_KEY = 'agent:main:main'

// GET - Fetch nutrition data by reading from session history
// The bot logs food to both the session AND food-log.json
// We search session history for nutrition JSON responses
export async function GET(request: NextRequest) {
  try {
    if (!GATEWAY_PASSWORD) {
      console.error('GATEWAY_PASSWORD environment variable is not set')
      return NextResponse.json(
        { error: 'Gateway not configured' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const requestedDate = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const days = parseInt(searchParams.get('days') || '1', 10)

    // Fetch recent session history to find nutrition data
    // The bot outputs JSON with entries when asked "what did I eat" or after logging food
    const history = await invokeTool('sessions_history', {
      sessionKey: MAIN_SESSION_KEY,
      limit: 100 // Get more history to find nutrition data for multiple days
    })

    const historyData = JSON.parse(history.result?.content?.[0]?.text || '{}')
    const messages = historyData.messages || []

    // Build a map of nutrition data by date from session history
    const nutritionByDate: Map<string, { entries: FoodEntry[], totals: any, goals: any }> = new Map()

    // First, check the in-memory cache (data POSTed directly by bot)
    nutritionCache.forEach((data, date) => {
      const normalizedEntries = normalizeEntries(data.entries || [], date)
      nutritionByDate.set(date, {
        entries: normalizedEntries,
        totals: data.totals,
        goals: data.goals
      })
    })

    // Process messages to extract nutrition JSON
    for (const msg of messages) {
      if (msg.role === 'assistant') {
        const content = extractText(msg.content)

        // Look for nutrition JSON in the response
        // It could be wrapped in markdown code blocks or raw JSON
        let jsonStr = content

        // Try to extract JSON from markdown code blocks
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim()
        }

        // Check if it looks like nutrition data
        if (jsonStr.includes('"date"') && (jsonStr.includes('"entries"') || jsonStr.includes('"totals"'))) {
          try {
            // Find the JSON object within the string
            const startIdx = jsonStr.indexOf('{')
            const endIdx = jsonStr.lastIndexOf('}')
            if (startIdx !== -1 && endIdx !== -1) {
              const cleanJson = jsonStr.substring(startIdx, endIdx + 1)
              const nutritionData = JSON.parse(cleanJson)

              if (nutritionData.date) {
                // Normalize entries to Velum's expected format
                const normalizedEntries = normalizeEntries(nutritionData.entries || [], nutritionData.date)

                // Store/update nutrition data for this date
                // Later entries override earlier ones (most recent data wins)
                nutritionByDate.set(nutritionData.date, {
                  entries: normalizedEntries,
                  totals: nutritionData.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 },
                  goals: nutritionData.goals || DEFAULT_GOALS
                })
              }
            }
          } catch {
            // Not valid JSON, continue searching
          }
        }
      }
    }

    const goals = nutritionByDate.get(requestedDate)?.goals || DEFAULT_GOALS

    // If requesting multiple days (for week view)
    if (days > 1) {
      const results = []
      for (let i = 0; i < days; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]

        const dayData = nutritionByDate.get(dateStr)
        results.push({
          date: dateStr,
          entries: dayData?.entries || [],
          totals: dayData?.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 },
          goals
        })
      }

      return NextResponse.json({ days: results })
    }

    // Single day request (default)
    const dayData = nutritionByDate.get(requestedDate)

    return NextResponse.json({
      date: requestedDate,
      entries: dayData?.entries || [],
      totals: dayData?.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 },
      goals
    })
  } catch (error) {
    console.error('Nutrition API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// In-memory cache for nutrition data posted by bot
// This avoids the circular call back to the gateway that was causing timeouts
const nutritionCache = new Map<string, { entries: any[], totals: any, goals: any, timestamp: number }>()

// POST endpoint for bot to log nutrition data directly (no visible JSON in Telegram)
// The bot POSTs here instead of showing JSON in chat
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Accept full nutrition JSON from bot
    // Format: { date, entries, totals, goals }
    if (body.date && (body.entries || body.totals)) {
      // Store in memory cache (fast, no external calls)
      nutritionCache.set(body.date, {
        entries: body.entries || [],
        totals: body.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 },
        goals: body.goals || DEFAULT_GOALS,
        timestamp: Date.now()
      })

      // Clean old entries (keep last 30 days)
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
      const keysToDelete: string[] = []
      nutritionCache.forEach((data, date) => {
        if (data.timestamp < thirtyDaysAgo) {
          keysToDelete.push(date)
        }
      })
      keysToDelete.forEach(key => nutritionCache.delete(key))

      return NextResponse.json({
        success: true,
        message: 'Nutrition data logged successfully',
        date: body.date,
        totals: body.totals
      })
    }

    // Legacy format: simple food logging (requires gateway)
    if (!GATEWAY_PASSWORD) {
      return NextResponse.json(
        { error: 'Gateway not configured' },
        { status: 500 }
      )
    }

    const { food, meal, calories, protein, carbs, fat } = body

    if (!food) {
      return NextResponse.json(
        { error: 'Food name or full nutrition data required' },
        { status: 400 }
      )
    }

    // Format the log message - the bot will parse this and update food-log.json
    const logMessage = calories
      ? `[Velum] Log ${food} for ${meal || 'a meal'}: ${calories} calories, ${protein || 0}g protein, ${carbs || 0}g carbs, ${fat || 0}g fat`
      : `[Velum] Log ${food} for ${meal || 'a meal'}`

    // Send to the main session where nutrition is tracked (fire and forget)
    fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GATEWAY_PASSWORD}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tool: 'sessions_send',
        args: { sessionKey: MAIN_SESSION_KEY, message: logMessage }
      })
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      message: 'Food logging request sent. The dashboard will update shortly.'
    })
  } catch (error) {
    console.error('Nutrition POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

