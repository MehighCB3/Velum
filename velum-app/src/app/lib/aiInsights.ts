/**
 * AI-powered insight generation via OpenRouter.
 * Used by fitness and budget webhooks to produce natural, contextual insights
 * instead of hardcoded template strings.
 *
 * Falls back gracefully (returns null) when OPENROUTER_API_KEY is missing
 * or the call fails — callers should handle the null case with their own fallback.
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

export interface AIInsightResult {
  insight: string
  type: 'nudge' | 'alert' | 'celebration'
}

/**
 * Call OpenRouter to generate a short, personalised insight.
 *
 * @param context  Plain-text description of the data (activity logged, budget totals, etc.)
 * @param agentName  Agent name shown in the insight card, e.g. "Fity", "Budgy"
 * @returns Insight text + type, or null when AI is unavailable.
 */
export async function generateAIInsight(
  context: string,
  agentName: string
): Promise<AIInsightResult | null> {
  if (!OPENROUTER_API_KEY) {
    console.warn('[aiInsights] OPENROUTER_API_KEY not set — skipping AI insight')
    return null
  }

  const systemPrompt = `You are ${agentName}, a personal wellness assistant. Generate a short, motivating insight based on the user data.

Rules:
- 1-2 sentences, 20-40 words max
- Conversational and direct — no fluff
- Respond with ONLY a JSON object, no markdown:
  {"insight": "...", "type": "nudge|alert|celebration"}
- type = "celebration" when a goal is hit or a personal best is set
- type = "alert" when something needs urgent attention (poor recovery, over budget, high stress)
- type = "nudge" for progress updates and gentle encouragement`

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://velum-five.vercel.app',
        'X-Title': 'Velum',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-3-5',
        max_tokens: 120,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: context },
        ],
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      console.error(`[aiInsights] OpenRouter error ${response.status}`)
      return null
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content || ''
    const clean = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(clean)

    const validTypes = ['nudge', 'alert', 'celebration']
    return {
      insight: String(parsed.insight || '').trim(),
      type: validTypes.includes(parsed.type) ? parsed.type : 'nudge',
    }
  } catch (err) {
    console.error('[aiInsights] Failed to generate AI insight:', err)
    return null
  }
}
