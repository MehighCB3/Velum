import { NextRequest, NextResponse } from 'next/server'
import { appendMessage, getRecentContext } from '../../../lib/sessionStore'
import {
  getMemoryContext,
  extractMemoriesFromText,
  saveMemory,
  type MemoryCategory,
} from '../../../lib/memoryStore'

export const dynamic = 'force-dynamic'

const GATEWAY_URL = process.env.GATEWAY_URL
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || process.env.GATEWAY_PASSWORD

// Telegram relay config — connect with @Teky_mihai_bot
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

// ── Agent routing ──

const NUTRITION_RE = /eat|ate|food|meal|calorie|protein|carb|fat|breakfast|lunch|dinner|snack|cook|recipe|hungry|diet|macro|pizza|chicken|rice|egg|salad|fruit/i
const BUDGET_RE = /spent|expense|cost|paid|pay|buy|bought|€|euro|budget|money|cash|bill|invoice|price/i
const FITNESS_RE = /workout|run|swim|cycle|step|sleep|weight|vo2|hrv|stress|recovery|training|bjj|jiu|gym|exercise/i

function detectAgent(message: string): string {
  if (NUTRITION_RE.test(message)) return 'nutry'
  if (BUDGET_RE.test(message)) return 'budgy'
  if (FITNESS_RE.test(message)) return 'main' // Fity routes through main for now
  return 'main'
}

function getRelevantMemoryCategories(message: string): MemoryCategory[] | undefined {
  const lower = message.toLowerCase()

  const isNutrition = NUTRITION_RE.test(lower)
  const isFitness = FITNESS_RE.test(lower)
  const isBudget = BUDGET_RE.test(lower)

  if (!isNutrition && !isFitness && !isBudget) return undefined

  const cats: MemoryCategory[] = ['preference', 'fact']
  if (isNutrition || isFitness) cats.push('health', 'habit', 'goal')
  if (isBudget) cats.push('context')
  return cats
}

// ── Telegram relay ──
// Fire-and-forget: send message to @Teky_mihai_bot for cross-platform sync

async function relayToTelegram(userMsg: string, assistantReply: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return

  const text = `📱 *Coach Screen*\n\n👤 ${userMsg}\n\n🤖 ${assistantReply}`

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'Markdown',
        disable_notification: true,
      }),
      signal: AbortSignal.timeout(5000),
    })
  } catch (err) {
    console.error('[coach/chat] Telegram relay error:', err)
  }
}

// ── Local fallback ──

function generateLocalResponse(message: string, context?: string): string {
  const lower = message.toLowerCase()

  if (lower.includes('how am i doing') || lower.includes('review') || lower.includes('summary')) {
    return context
      ? `Here's where you stand: ${context}. Keep tracking — consistency is key!`
      : "You're doing great by checking in. Keep logging your data and I'll have better insights for you."
  }
  if (NUTRITION_RE.test(lower)) {
    return "I can help with nutrition! Tell me what you ate and I'll log it, or ask for meal suggestions based on your goals."
  }
  if (BUDGET_RE.test(lower)) {
    return "I can help track spending! Tell me what you spent and I'll log it. Or ask how your budget is looking this week."
  }
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return "Hey! I'm Archie, your Velum coach. Ask me about your nutrition, fitness, budget, or anything else."
  }

  return "I'm here to help! Ask about nutrition, fitness, budget, goals, or anything you're working on."
}

// ── POST handler ──

export async function POST(request: NextRequest) {
  try {
    const { message, context, agent: requestedAgent } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const agent = requestedAgent || detectAgent(message)
    const validAgents = ['main', 'nutry', 'booky', 'espanol', 'budgy']
    const sessionKey = validAgents.includes(agent) ? agent : 'main'

    // Store user message
    await appendMessage(sessionKey, {
      id: `${Date.now()}-user`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      source: 'gateway',
    })

    // No gateway — use local fallback
    if (!GATEWAY_URL || !GATEWAY_TOKEN) {
      const localContent = generateLocalResponse(message, context)

      await appendMessage(sessionKey, {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: localContent,
        timestamp: new Date().toISOString(),
        source: 'local',
      })

      // Relay to Telegram even for local responses
      relayToTelegram(message, localContent).catch(() => {})

      return NextResponse.json({ content: localContent, source: 'local' })
    }

    // Build enriched context with scoped memory
    const relevantCategories = getRelevantMemoryCategories(message)
    const [memoryContext, recentHistory] = await Promise.all([
      getMemoryContext(relevantCategories),
      getRecentContext(sessionKey, 8),
    ])

    const contextParts = ['[Velum Coach Screen]']
    if (memoryContext) contextParts.push(memoryContext)
    if (recentHistory) contextParts.push(`[Recent Conversation]\n${recentHistory}`)
    if (context) contextParts.push(`[Dashboard Data]\n${context}`)
    contextParts.push(`User: ${message}`)

    const fullMessage = contextParts.join('\n\n')

    try {
      const response = await fetch(`${GATEWAY_URL}/tools/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        },
        body: JSON.stringify({
          tool: 'sessions_send',
          args: { sessionKey, message: fullMessage, timeoutSeconds: 25 },
        }),
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[coach/chat] Gateway error ${response.status}:`, errorText)
        const fallback = generateLocalResponse(message, context)

        await appendMessage(sessionKey, {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          content: fallback,
          timestamp: new Date().toISOString(),
          source: 'local_fallback',
        })

        relayToTelegram(message, fallback).catch(() => {})
        return NextResponse.json({ content: fallback, source: 'local_fallback' })
      }

      const data = await response.json()
      let responseContent: string

      if (data.ok && data.result) {
        const result = data.result
        responseContent = result.reply || result.response || result.message || result.content || result.text || 'No response received'
      } else {
        responseContent = data.response || data.message || data.content || data.reply || 'No response received'
      }

      // Extract memories from agent response
      const { cleaned, memories } = extractMemoriesFromText(responseContent)

      if (memories.length > 0) {
        Promise.all(
          memories.map(m => saveMemory({
            category: m.category,
            key: m.key,
            value: m.value,
            source: 'agent',
          }))
        ).catch(err => console.error('[coach/chat] Failed to save memories:', err))
      }

      await appendMessage(sessionKey, {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: cleaned,
        timestamp: new Date().toISOString(),
        source: 'gateway',
        metadata: memories.length > 0 ? { memoriesExtracted: memories.length } : undefined,
      })

      // Relay to Telegram
      relayToTelegram(message, cleaned).catch(() => {})

      return NextResponse.json({
        content: cleaned,
        source: 'gateway',
        ...(memories.length > 0 && { memoriesSaved: memories.length }),
      })
    } catch (fetchError) {
      console.error('[coach/chat] Gateway fetch error:', fetchError)
      const fallback = generateLocalResponse(message, context)

      await appendMessage(sessionKey, {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: fallback,
        timestamp: new Date().toISOString(),
        source: 'local_fallback',
      })

      relayToTelegram(message, fallback).catch(() => {})
      return NextResponse.json({ content: fallback, source: 'local_fallback' })
    }
  } catch (error) {
    console.error('[coach/chat] API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
