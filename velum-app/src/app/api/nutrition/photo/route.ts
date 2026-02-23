import { NextRequest, NextResponse } from 'next/server'
import { searchFatSecret } from '@/app/lib/fatsecret'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

interface FoodAnalysis {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  serving: string
  confidence: 'high' | 'medium' | 'low'
  note?: string
  source?: string
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

    // Fallback if no OpenRouter key
    if (!OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY not configured')
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
          source: 'fallback',
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

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://velum-five.vercel.app',
        'X-Title': 'Velum',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4-5',
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
      return NextResponse.json(
        { error: `AI analysis failed (${response.status})` },
        { status: 502 },
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    // Parse the JSON response
    let aiResult: FoodAnalysis
    try {
      const clean = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
      aiResult = JSON.parse(clean)
    } catch {
      console.error('Failed to parse AI response:', content)
      aiResult = {
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
    aiResult.calories = Math.round(Number(aiResult.calories) || 0)
    aiResult.protein = Math.round(Number(aiResult.protein) || 0)
    aiResult.carbs = Math.round(Number(aiResult.carbs) || 0)
    aiResult.fat = Math.round(Number(aiResult.fat) || 0)

    // ── Refine with FatSecret lookup ──────────────────────────
    // Use the AI-identified name to get accurate nutrition from FatSecret
    if (aiResult.name && aiResult.name !== 'Unknown' && aiResult.name !== 'Unknown food') {
      try {
        const fsResults = await searchFatSecret(aiResult.name, 1)
        if (fsResults && fsResults.length > 0) {
          const fs = fsResults[0]
          // Use FatSecret nutrition data (more accurate than AI estimates)
          // but keep the AI-identified name and serving description
          aiResult.calories = Math.round(fs.calories)
          aiResult.protein = Math.round(fs.protein)
          aiResult.carbs = Math.round(fs.carbs)
          aiResult.fat = Math.round(fs.fat)
          aiResult.source = 'fatsecret'
          // If FatSecret has a serving size, note it
          if (fs.serving && fs.serving !== '100g') {
            aiResult.note = `Nutrition per ${fs.serving} (via FatSecret)`
          } else {
            aiResult.note = `Nutrition per 100g (via FatSecret)`
          }
        } else {
          aiResult.source = 'ai-estimate'
        }
      } catch (fsError) {
        console.error('FatSecret lookup failed (using AI estimates):', fsError)
        aiResult.source = 'ai-estimate'
      }
    }

    return NextResponse.json({ result: aiResult })
  } catch (error) {
    console.error('Photo analysis error:', error)
    return NextResponse.json({ error: 'Failed to analyze photo' }, { status: 500 })
  }
}
