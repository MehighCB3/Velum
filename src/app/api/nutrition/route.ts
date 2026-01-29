import { NextRequest, NextResponse } from 'next/server'

const GATEWAY_URL = process.env.GATEWAY_URL || 'https://rasppi5.tail5b3227.ts.net'
const GATEWAY_PASSWORD = process.env.GATEWAY_PASSWORD

// Fetch nutrition data from the Pi via Moltbot gateway
// The nutrition skill stores data in ~/clawd/nutrition/food-log.json
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

    // Use the /tools/invoke endpoint to ask for nutrition data
    // The nutrition skill will read from food-log.json and return structured data
    const response = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GATEWAY_PASSWORD}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tool: 'sessions_send',
        args: {
          sessionKey: 'agent:main:main',
          message: `[Velum API] Return the nutrition data for ${date} as JSON only (no markdown, no explanation). Read from the food log and return this exact structure:
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
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Gateway error: ${response.status} - ${errorText}`)
      return NextResponse.json(
        { error: 'Failed to fetch nutrition data' },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Extract reply from Moltbot response structure
    const content = data.result?.details?.reply ||
                    data.result?.reply ||
                    data.response ||
                    data.message ||
                    ''

    // Try to parse as JSON
    try {
      // Remove any markdown code blocks if present
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const nutritionData = JSON.parse(jsonStr)
      return NextResponse.json(nutritionData)
    } catch (parseError) {
      console.error('Failed to parse nutrition data as JSON:', content)
      // Return empty data structure if parsing fails
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

    // Use the /tools/invoke endpoint to log the food via the nutrition skill
    const logMessage = calories
      ? `Log ${food} for ${meal || 'a meal'}: ${calories} calories, ${protein || 0}g protein, ${carbs || 0}g carbs, ${fat || 0}g fat`
      : `Log ${food} for ${meal || 'a meal'}`

    const response = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GATEWAY_PASSWORD}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tool: 'sessions_send',
        args: {
          sessionKey: 'agent:main:main',
          message: `[Velum API] ${logMessage}`
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Gateway error: ${response.status} - ${errorText}`)
      return NextResponse.json(
        { error: 'Failed to log food' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const content = data.result?.details?.reply ||
                    data.result?.reply ||
                    data.response ||
                    data.message ||
                    'Food logged'

    return NextResponse.json({
      success: true,
      message: content
    })
  } catch (error) {
    console.error('Nutrition POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
