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

// Dedup cache: at most one AI call per agent per hour.
// Multiple entries logged close together (e.g. "vo2max 47, hrv 58, stress 30")
// all reuse the same cached insight instead of firing 3 redundant API calls.
const insightCache = new Map<string, { result: AIInsightResult; generatedAt: number }>()
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

/**
 * Call OpenRouter to generate a short, personalised insight.
 *
 * Model strategy:
 *   Primary:  claude-haiku-4-5  (latest Haiku — faster, better JSON adherence)
 *   Fallback: gpt-4o-mini       (different provider — activates if Anthropic is unavailable)
 *
 * response_format: json_object guarantees valid JSON from the API, so the
 * old brittle strip-and-parse regex is no longer needed.
 *
 * @param context   Plain-text description of the data (activity logged, budget totals, etc.)
 * @param agentName Agent name shown in the insight card, e.g. "Fity", "Budgy"
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

  // Return cached insight if still fresh — avoids redundant calls within the hour
  const cached = insightCache.get(agentName)
  if (cached && Date.now() - cached.generatedAt < CACHE_TTL_MS) {
    return cached.result
  }

  const systemPrompt = `You are ${agentName}, a personal wellness assistant. Generate a short, motivating insight based on the user data.

Rules:
- 1-2 sentences, 20-40 words max
- Conversational and direct — no fluff
- Respond with ONLY valid JSON (no markdown, no extra keys):
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
        // Primary + fallback: if Anthropic is briefly unavailable, OpenRouter
        // automatically retries with gpt-4o-mini from a different provider.
        models: [
          'anthropic/claude-haiku-4-5-20251001',
          'openai/gpt-4o-mini',
        ],
        route: 'fallback',
        max_tokens: 150,
        // Guaranteed valid JSON — no strip/parse gymnastics needed
        response_format: { type: 'json_object' },
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
    const parsed = JSON.parse(raw)

    const validTypes = ['nudge', 'alert', 'celebration']
    const result: AIInsightResult = {
      insight: String(parsed.insight || '').trim(),
      type: validTypes.includes(parsed.type) ? parsed.type : 'nudge',
    }

    // Cache for the next hour
    insightCache.set(agentName, { result, generatedAt: Date.now() })

    return result
  } catch (err) {
    console.error('[aiInsights] Failed to generate AI insight:', err)
    return null
  }
}
