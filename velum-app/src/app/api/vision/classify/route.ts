import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

const SYSTEM_PROMPT = `You are a smart personal assistant analyzing a photo. Identify what the photo shows and extract relevant data for logging.

The photo is ONE of:
1. **Food or meal** → section: "nutrition"
2. **Receipt, bill, price tag, or any expense** → section: "budget"
3. **Fitness tracker screen, GPS watch, running/cycling app screenshot, activity summary** → section: "fitness"

Respond with ONLY this JSON object (no markdown, no extra text):
{
  "section": "nutrition|budget|fitness",
  "confidence": "high|medium|low",
  "emoji": "single relevant emoji",
  "data": { ... }
}

Data shape per section:

nutrition:
  "name": "specific food name",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "serving": "e.g. 1 plate (300g)"

budget:
  "amount": 0.00,
  "description": "short description of the expense",
  "category": "Food|Fun|Transport|Subscriptions|Other"

fitness:
  "type": "run|swim|cycle|steps|jiujitsu",
  "distance": 0,
  "duration": 0,
  "calories": 0,
  "steps": 0

Rules:
- confidence: "high" = clearly identifiable, "medium" = reasonable guess, "low" = unclear
- budget amount: plain number only, no currency symbol (e.g. 24.50)
- fitness distance: km, duration: minutes, steps: integer
- If nothing clearly matches, default to section "nutrition" with confidence "low"
- Omit fields that are not visible/applicable (e.g. omit steps when type is "run")`

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

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'Vision AI not configured' }, { status: 503 })
    }

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
        max_tokens: 400,
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
              { type: 'text', text: SYSTEM_PROMPT },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(25000),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('OpenRouter classify error:', response.status, errText)
      return NextResponse.json({ error: 'Vision classification failed' }, { status: 502 })
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content || ''
    const clean = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = JSON.parse(clean)

    // Sanitize numeric fields to avoid NaN/string issues on mobile
    if (result.section === 'nutrition' && result.data) {
      result.data.calories = Math.round(Number(result.data.calories) || 0)
      result.data.protein  = Math.round(Number(result.data.protein)  || 0)
      result.data.carbs    = Math.round(Number(result.data.carbs)    || 0)
      result.data.fat      = Math.round(Number(result.data.fat)      || 0)
    } else if (result.section === 'budget' && result.data) {
      result.data.amount = Math.round(Number(result.data.amount) * 100) / 100
    } else if (result.section === 'fitness' && result.data) {
      if (result.data.distance != null) result.data.distance = Math.round(Number(result.data.distance) * 10) / 10
      if (result.data.duration != null) result.data.duration = Math.round(Number(result.data.duration))
      if (result.data.calories != null) result.data.calories = Math.round(Number(result.data.calories))
      if (result.data.steps    != null) result.data.steps    = Math.round(Number(result.data.steps))
    }

    return NextResponse.json({ result })
  } catch (error) {
    console.error('Vision classify error:', error)
    return NextResponse.json({ error: 'Classification failed' }, { status: 500 })
  }
}
