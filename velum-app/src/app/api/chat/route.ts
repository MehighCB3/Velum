import { NextRequest, NextResponse } from 'next/server'
import { appendMessage, getRecentContext } from '../../lib/sessionStore'
import {
  getMemoryContext,
  extractMemoriesFromText,
  saveMemory,
  type MemoryCategory,
} from '../../lib/memoryStore'

export const dynamic = 'force-dynamic'

const GATEWAY_URL = process.env.GATEWAY_URL
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || process.env.GATEWAY_PASSWORD

// Local fallback responses when gateway is unavailable.
// Kept intentionally generic — no hardcoded values that can go stale
// (e.g. macro targets, which the user can change via the agent).
function generateLocalResponse(message: string, context?: string): string {
  const lowerMsg = message.toLowerCase()

  if (lowerMsg.includes('eat') || lowerMsg.includes('food') || lowerMsg.includes('meal') || lowerMsg.includes('calorie')) {
    if (context) {
      return `Based on your log: ${context}. You're doing great tracking your nutrition! Want me to suggest some high-protein options for your next meal?`
    }
    return "I can help you track your nutrition! Tell me what you ate and I'll log it for you. Or ask for meal suggestions based on your goals."
  }

  if (lowerMsg.includes('goal') || lowerMsg.includes('target')) {
    return "Your daily goals are tracked in the Nutrition tab. Check there for your current macro targets and progress — or ask me once the agent connection is back up."
  }

  if (lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('hey')) {
    return "Hey! I'm your Velum assistant. I can help you log food, review your intake, or give meal suggestions. What's up?"
  }

  if (lowerMsg.includes('insight') || lowerMsg.includes('analysis') || lowerMsg.includes('how am i doing')) {
    return context
      ? `Looking at your data: ${context}. You're consistently tracking, which is the most important habit!`
      : "Keep logging your meals and I'll spot patterns to help you optimize."
  }

  if (lowerMsg.includes('spanish') || lowerMsg.includes('español') || lowerMsg.includes('conjugat') || lowerMsg.includes('vocabulary') || lowerMsg.includes('flashcard') || lowerMsg.includes('verb') || lowerMsg.includes('grammar')) {
    return "I can help with your Spanish practice! Check the Spanish section under Knowledge for flashcard reviews with spaced repetition, verb conjugation drills, cloze exercises, and writing prompts. What would you like to work on?"
  }

  if (lowerMsg.includes('book') || lowerMsg.includes('reading') || lowerMsg.includes('wisdom') || lowerMsg.includes('principle') || lowerMsg.includes('knowledge') || lowerMsg.includes('quote')) {
    return "Check the Books section under Knowledge for your weekly wisdom widget! It rotates through 10 knowledge domains with principles from great books, context-aware insights, and memorable quotes. This week's domain awaits!"
  }

  return "I'm here to help! Ask me about nutrition, Spanish practice, book wisdom, goals, or anything else you're working on."
}

/**
 * Derive the most relevant memory categories for this message so we avoid
 * injecting the full 60-memory blob on every request.
 *
 * Returns undefined (= all categories) only for general/coaching messages
 * where full context genuinely helps. Specific domain messages get a
 * narrower slice, saving ~30-40% of context tokens on average.
 */
function getRelevantMemoryCategories(message: string): MemoryCategory[] | undefined {
  const lower = message.toLowerCase()

  const isNutrition = /eat|food|meal|calorie|protein|carb|fat|breakfast|lunch|dinner|snack|cook|recipe|hungry|diet|macro/.test(lower)
  const isFitness = /workout|run|swim|cycle|step|sleep|weight|vo2|hrv|stress|recovery|training|bjj|jiu/.test(lower)
  const isBudget = /spent|expense|cost|paid|pay|buy|bought|€|euro|budget|money|cash|bill|invoice/.test(lower)
  const isLearning = /spanish|book|read|learn|wisdom|principle|flashcard|conjugat|vocab/.test(lower)

  // General coaching / open-ended — inject everything
  if (!isNutrition && !isFitness && !isBudget && !isLearning) return undefined

  // Always include base facts + preferences
  const cats: MemoryCategory[] = ['preference', 'fact']

  if (isNutrition || isFitness) {
    cats.push('health', 'habit', 'goal')
  }
  if (isBudget) {
    cats.push('context')
  }
  if (isLearning) {
    cats.push('goal', 'habit')
  }

  return cats
}

export async function POST(request: NextRequest) {
  try {
    // Accept optional `agent` field — callers (mobile screens, web) can pass
    // the target agent ID (e.g. "nutry", "budgy") to skip keyword routing and
    // route directly to the right agent on the gateway.
    const { message, context, agent } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // sessionKey mirrors the agent so conversation history stays per-context.
    // Defaults to "main" for the general assistant.
    const validAgents = ['main', 'nutry', 'booky', 'espanol', 'budgy']
    const sessionKey = validAgents.includes(agent) ? agent : 'main'

    // Store the user's message in session history
    await appendMessage(sessionKey, {
      id: `${Date.now()}-user`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      source: 'gateway',
    })

    // Check if gateway is configured
    if (!GATEWAY_URL || !GATEWAY_TOKEN) {
      console.warn('GATEWAY_URL or OPENCLAW_GATEWAY_TOKEN not set, using local response')
      const localContent = generateLocalResponse(message, context)

      await appendMessage(sessionKey, {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: localContent,
        timestamp: new Date().toISOString(),
        source: 'local',
      })

      return NextResponse.json({
        content: localContent,
        source: 'local'
      })
    }

    // Build enriched context: scope memory to the relevant categories for this
    // message so we don't inject Spanish-flashcard facts into a budget query.
    const relevantCategories = getRelevantMemoryCategories(message)
    const [memoryContext, recentHistory] = await Promise.all([
      getMemoryContext(relevantCategories),
      getRecentContext(sessionKey, 8),
    ])

    const contextParts = ['[Velum]']
    if (memoryContext) contextParts.push(memoryContext)
    if (recentHistory) contextParts.push(`[Recent Conversation]\n${recentHistory}`)
    if (context) contextParts.push(`[Dashboard Data]\n${context}`)
    contextParts.push(`User: ${message}`)

    const fullMessage = contextParts.join('\n\n')

    try {
      // OpenClaw tools/invoke HTTP API.
      // Pass sessionKey so the gateway routes directly to the right agent
      // instead of relying on keyword matching for every message.
      const response = await fetch(`${GATEWAY_URL}/tools/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        },
        body: JSON.stringify({
          tool: 'sessions_send',
          args: {
            sessionKey,
            message: fullMessage,
            timeoutSeconds: 25
          }
        }),
        signal: AbortSignal.timeout(30000)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Gateway error ${response.status}:`, errorText)
        const fallbackContent = generateLocalResponse(message, context)

        await appendMessage(sessionKey, {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          content: fallbackContent,
          timestamp: new Date().toISOString(),
          source: 'local_fallback',
        })

        return NextResponse.json({
          content: fallbackContent,
          source: 'local_fallback'
        })
      }

      const data = await response.json()

      // OpenClaw tools/invoke returns:
      // { ok: true, result: { content: [{type:"text", text:"..."}], details: { status, reply, ... } } }
      let responseContent: string
      if (data.ok && data.result) {
        const result = data.result
        const details = result.details || {}

        if (details.status === 'timeout') {
          responseContent = 'The assistant is taking a moment to think. Please try again shortly.'
        } else {
          // Try details.reply first, then parse content array, then fallbacks
          responseContent = details.reply
            || (Array.isArray(result.content) && result.content[0]?.text
              ? (() => { try { const p = JSON.parse(result.content[0].text); return p.reply || p.response || p.message } catch { return result.content[0].text } })()
              : null)
            || result.reply || result.response || result.message || result.text
            || 'No response received'
        }
      } else {
        responseContent = data.response || data.message || data.content || data.reply || 'No response received'
      }

      // Extract any memory directives from the agent's response
      const { cleaned, memories } = extractMemoriesFromText(responseContent)

      // Save extracted memories in the background
      if (memories.length > 0) {
        Promise.all(
          memories.map(m => saveMemory({
            category: m.category,
            key: m.key,
            value: m.value,
            source: 'agent',
          }))
        ).catch(err => console.error('Failed to save extracted memories:', err))
      }

      // Store the assistant's response (cleaned of memory directives)
      await appendMessage(sessionKey, {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: cleaned,
        timestamp: new Date().toISOString(),
        source: 'gateway',
        metadata: memories.length > 0 ? { memoriesExtracted: memories.length } : undefined,
      })

      return NextResponse.json({
        content: cleaned,
        source: 'gateway',
        ...(memories.length > 0 && { memoriesSaved: memories.length }),
      })

    } catch (fetchError) {
      console.error('Gateway fetch error:', fetchError)
      const fallbackContent = generateLocalResponse(message, context)

      await appendMessage(sessionKey, {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: fallbackContent,
        timestamp: new Date().toISOString(),
        source: 'local_fallback',
      })

      return NextResponse.json({
        content: fallbackContent,
        source: 'local_fallback'
      })
    }

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
