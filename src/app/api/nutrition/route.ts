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

// Send tool call with short timeout (just enough to send the request)
async function sendToolQuick(tool: string, args: Record<string, unknown>) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 2000) // 2 second timeout

  try {
    await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GATEWAY_PASSWORD}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tool, args }),
      signal: controller.signal
    })
  } catch {
    // Ignore abort errors - we just need the request to be sent
  } finally {
    clearTimeout(timeoutId)
  }
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

// Helper to send message and wait for response
async function sendAndWaitForResponse(message: string, maxWaitMs: number = 25000): Promise<string | null> {
  // Get current timestamp to detect new response
  const historyBefore = await invokeTool('sessions_history', { sessionKey: SESSION_KEY, limit: 1 })
  const messagesBefore = JSON.parse(historyBefore.result?.content?.[0]?.text || '{}').messages || []
  const lastTimestamp = messagesBefore[0]?.timestamp || 0

  // Send the message with short timeout (sessions_send blocks for 30s, we just need to start it)
  await sendToolQuick('sessions_send', { sessionKey: SESSION_KEY, message })

  // Poll for new assistant response
  const startTime = Date.now()
  const pollInterval = 1000

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise(resolve => setTimeout(resolve, pollInterval))

    const historyAfter = await invokeTool('sessions_history', { sessionKey: SESSION_KEY, limit: 5 })
    const historyData = JSON.parse(historyAfter.result?.content?.[0]?.text || '{}')
    const messagesAfter = historyData.messages || []

    // Look for new assistant message after our user message
    for (const msg of messagesAfter) {
      if (msg.role === 'assistant' && msg.timestamp > lastTimestamp) {
        const reply = extractText(msg.content)
        if (reply) return reply
      }
    }
  }

  return null
}

// Fetch nutrition data from the Pi via Moltbot gateway
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

    const message = `[Velum API] Return the nutrition data for ${date} as JSON only (no markdown, no explanation). Read from the food log and return this exact structure:
{
  "date": "YYYY-MM-DD",
  "entries": [
    {
      "id": "unique-id",
      "name": "Food name",
      "calories": 123,
      "protein": 10,
      "carbs": 20,
      "fat": 5,
      "time": "HH:MM",
      "meal": "breakfast|lunch|dinner|snack",
      "photo": "base64 or url if available"
    }
  ],
  "totals": {
    "calories": 123,
    "protein": 10,
    "carbs": 20,
    "fat": 5
  },
  "goals": {
    "calories": 2000,
    "protein": 150,
    "carbs": 200,
    "fat": 65
  }
}
If no entries exist for that date, return empty entries array with zeros for totals.`

    const content = await sendAndWaitForResponse(message)

    if (!content) {
      // Return empty data if no response
      return NextResponse.json({
        date,
        entries: [],
        totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        goals: { calories: 2000, protein: 150, carbs: 200, fat: 65 }
      })
    }

    // Try to parse as JSON
    try {
      // Remove any markdown code blocks if present
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const nutritionData = JSON.parse(jsonStr)
      return NextResponse.json(nutritionData)
    } catch (parseError) {
      console.error('Failed to parse nutrition data as JSON:', content)
      return NextResponse.json({
        date,
        entries: [],
        totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        goals: { calories: 2000, protein: 150, carbs: 200, fat: 65 }
      })
    }
  } catch (error) {
    console.error('Nutrition API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST endpoint to log food (alternative to chat)
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
      ? `[Velum API] Log ${food} for ${meal || 'a meal'}: ${calories} calories, ${protein || 0}g protein, ${carbs || 0}g carbs, ${fat || 0}g fat`
      : `[Velum API] Log ${food} for ${meal || 'a meal'}`

    const content = await sendAndWaitForResponse(logMessage)

    return NextResponse.json({
      success: true,
      message: content || 'Food logged'
    })
  } catch (error) {
    console.error('Nutrition POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
