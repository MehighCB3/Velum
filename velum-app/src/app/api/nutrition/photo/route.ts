import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

interface FoodAnalysis {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  serving: string
  confidence: 'high' | 'medium' | 'low'
  note?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageBase64, mimeType = 'image/jpeg' } = body as {
      imageBase64: string
      mimeType?: string
    }

    if (!imageBase64) {
      return NextResponse.json({ error: 'imageBase64 required' }, { status: 400 })
    }

    // Fallback if no OpenAI key
    if (!OPENAI_API_KEY) {
      return NextResponse.json({
        result: {
          name: 'Unknown food',
          calories: 200,
          protein: 10,
          carbs: 20,
          fat: 8,
          serving: '1 serving',
          confidence: 'low',
          note: 'AI recognition unavailable — please fill in manually',
        } satisfies FoodAnalysis,
      })
    }

    const prompt = `You are a nutrition expert analyzing a food photo. Identify the food and provide nutrition estimates per serving.

Respond with ONLY a JSON object in this exact format (no markdown, no extra text):
{
  "name": "Food name",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "serving": "e.g. 1 plate (300g)",
  "confidence": "high|medium|low",
  "note": "optional note if unsure"
}

Rules:
- name: specific food name, e.g. "Grilled chicken with rice" not just "food"
- calories: total kcal for the portion you see in the photo
- protein/carbs/fat: grams for that same portion
- serving: describe the visible portion
- confidence: high if you can clearly identify it, medium if guessing, low if unclear
- If you cannot see any food, return name "Unknown" with confidence "low"`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                  detail: 'low',
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('OpenAI error:', response.status, errText)
      return NextResponse.json({ error: 'AI analysis failed' }, { status: 502 })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    // Parse the JSON response
    let result: FoodAnalysis
    try {
      // Strip any markdown code fences just in case
      const clean = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
      result = JSON.parse(clean)
    } catch {
      console.error('Failed to parse AI response:', content)
      result = {
        name: 'Unknown food',
        calories: 200,
        protein: 10,
        carbs: 20,
        fat: 8,
        serving: '1 serving',
        confidence: 'low',
        note: 'Could not parse AI response — please fill in manually',
      }
    }

    // Ensure numeric fields are numbers
    result.calories = Math.round(Number(result.calories) || 0)
    result.protein = Math.round(Number(result.protein) || 0)
    result.carbs = Math.round(Number(result.carbs) || 0)
    result.fat = Math.round(Number(result.fat) || 0)

    return NextResponse.json({ result })
  } catch (error) {
    console.error('Photo analysis error:', error)
    return NextResponse.json({ error: 'Failed to analyze photo' }, { status: 500 })
  }
}
