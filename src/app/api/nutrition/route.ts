import { NextRequest, NextResponse } from 'next/server'

const GATEWAY_URL = process.env.GATEWAY_URL || 'https://rasppi5.tail5b3227.ts.net'
const GATEWAY_PASSWORD = process.env.GATEWAY_PASSWORD
const SESSION_KEY = 'agent:main:main'

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

// Helper to extract text from message content
function extractText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    for (const item of content) {
      if (item?.type === 'text' && item?.text) return item.text
    }
  }
  return ''
}

// Fetch nutrition data by looking at recent responses in history
// This avoids the 30s timeout issue by not sending new requests
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
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    // Look through recent history for nutrition data responses
    const history = await invokeTool('sessions_history', { sessionKey: SESSION_KEY, limit: 20 })
    const historyData = JSON.parse(history.result?.content?.[0]?.text || '{}')
    const messages = historyData.messages || []

    // Look for recent assistant message that contains nutrition JSON for this date
    for (const msg of messages) {
      if (msg.role === 'assistant') {
        const content = extractText(msg.content)
        // Check if it looks like nutrition JSON
        if (content.includes('"date"') && content.includes('"entries"') && content.includes('"totals"')) {
          try {
            const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
            const nutritionData = JSON.parse(jsonStr)
            // Check if it's for the requested date
            if (nutritionData.date === date) {
              return NextResponse.json(nutritionData)
            }
          } catch {
            // Not valid JSON, continue searching
          }
        }
      }
    }

    // No nutrition data found in history, return empty
    return NextResponse.json({
      date,
      entries: [],
      totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      goals: { calories: 2000, protein: 150, carbs: 200, fat: 65 }
    })
  } catch (error) {
    console.error('Nutrition API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST endpoint to log food - just sends to the bot asynchronously
export async function POST(request: NextRequest) {
  try {
    if (!GATEWAY_PASSWORD) {
      return NextResponse.json(
        { error: 'Gateway not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { food, meal, calories, protein, carbs, fat } = body

    if (!food) {
      return NextResponse.json(
        { error: 'Food name is required' },
        { status: 400 }
      )
    }

    const logMessage = calories
      ? `[Velum] Log ${food} for ${meal || 'a meal'}: ${calories} calories, ${protein || 0}g protein, ${carbs || 0}g carbs, ${fat || 0}g fat`
      : `[Velum] Log ${food} for ${meal || 'a meal'}`

    // Send the message (fire-and-forget - don't wait for response)
    fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GATEWAY_PASSWORD}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tool: 'sessions_send',
        args: { sessionKey: SESSION_KEY, message: logMessage }
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
