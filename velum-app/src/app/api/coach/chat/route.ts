import { NextRequest, NextResponse } from 'next/server'
import { appendMessage, getRecentContext } from '../../../lib/sessionStore'
import {
  getMemoryContext,
  extractMemoriesFromText,
  saveMemory,
  type MemoryCategory,
} from '../../../lib/memoryStore'
import { parseFitnessMessage, buildEntryData } from '../../../lib/fitnessParser'
import { parseExpenseMessage } from '../../../lib/budgetParser'
import { parseNutritionMessage, mealTimeEstimate } from '../../../lib/nutritionParser'
import { searchFatSecret } from '../../../lib/fatsecret'
import { buildEntry, addFitnessEntry } from '../../../lib/fitnessStore'
import { addBudgetEntry, type BudgetEntry, type Category } from '../../../lib/budgetStore'
import { getWeekKey, getISOWeek, parseWeekKey } from '../../../lib/weekUtils'
import { saveInsight } from '../../../lib/insightsStore'
import { generateAIInsight } from '../../../lib/aiInsights'
import { query } from '../../../lib/db'

export const dynamic = 'force-dynamic'

const GATEWAY_URL = process.env.GATEWAY_URL
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || process.env.GATEWAY_PASSWORD

// Telegram relay config
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

// ── Agent routing (shared) ──

import { detectAgent, NUTRITION_RE, BUDGET_RE, FITNESS_RE, VALID_AGENTS } from '../../../lib/agentRouting'

// ── Fast-path patterns ──
// Simple greetings/acks skip the gateway entirely for <50ms response

const FAST_PATH: Record<string, string> = {
  'hi': "Hey! How can I help today?",
  'hello': "Hey! What's on the agenda?",
  'hey': "Hey! Ready when you are.",
  'thanks': "You got it!",
  'thank you': "Anytime!",
  'ok': "Cool — let me know if you need anything.",
  'okay': "Got it!",
  'bye': "See you later! Keep crushing it.",
  'good morning': "Good morning! What's the plan for today?",
  'good night': "Good night! Rest well.",
}

function getFastPathResponse(message: string): string | null {
  const normalized = message.trim().toLowerCase().replace(/[!?.]+$/, '')
  return FAST_PATH[normalized] ?? null
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

// ── Data logging ──

interface LogResult {
  type: 'fitness' | 'budget' | 'nutrition'
  summary: string
}

async function tryLogData(message: string): Promise<LogResult | null> {
  // Try fitness first
  const fitnessEntry = parseFitnessMessage(message)
  if (fitnessEntry) {
    try {
      const entryDate = fitnessEntry.date || new Date().toISOString().split('T')[0]
      const weekKey = getWeekKey(new Date(entryDate))
      const entryData = buildEntryData(fitnessEntry)
      const newEntry = buildEntry(entryData)
      await addFitnessEntry(weekKey, newEntry)

      // Generate insight (non-blocking)
      generateFitnessInsight(fitnessEntry, weekKey).catch(err =>
        console.warn('[coach/chat] Failed to generate fitness insight:', err)
      )

      return {
        type: 'fitness',
        summary: formatFitnessSummary(fitnessEntry),
      }
    } catch (err) {
      console.error('[coach/chat] Failed to log fitness entry:', err)
    }
  }

  // Try budget
  const budgetEntry = parseExpenseMessage(message)
  if (budgetEntry) {
    try {
      const weekKey = getWeekKeyForBudget(budgetEntry.week)
      const entryDate = budgetEntry.week
        ? parseWeekKey(weekKey).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]

      const entry: BudgetEntry = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        amount: budgetEntry.amount,
        category: budgetEntry.category as Category,
        description: budgetEntry.description,
        date: entryDate,
        timestamp: new Date().toISOString(),
        reason: budgetEntry.reason,
      }

      const savedData = await addBudgetEntry(weekKey, entry)

      // Generate insight (non-blocking)
      generateBudgetInsight(budgetEntry, savedData, weekKey).catch(err =>
        console.warn('[coach/chat] Failed to generate budget insight:', err)
      )

      return {
        type: 'budget',
        summary: `€${budgetEntry.amount} ${budgetEntry.description} (${budgetEntry.category})`,
      }
    } catch (err) {
      console.error('[coach/chat] Failed to log budget entry:', err)
    }
  }

  // Try nutrition
  const nutritionEntry = parseNutritionMessage(message)
  if (nutritionEntry) {
    try {
      const fsResults = await searchFatSecret(nutritionEntry.foodDescription, 1)
      if (fsResults && fsResults.length > 0) {
        const fs = fsResults[0]
        const entryDate = nutritionEntry.date || new Date().toISOString().split('T')[0]
        const entryTime = mealTimeEstimate(nutritionEntry.mealHint)

        const entryId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        await query(
          'INSERT INTO nutrition_entries (entry_id, date, name, calories, protein, carbs, fat, entry_time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (entry_id) DO NOTHING',
          [entryId, entryDate, fs.name, Math.round(fs.calories), Math.round(fs.protein), Math.round(fs.carbs), Math.round(fs.fat), entryTime]
        )

        // Generate insight (non-blocking)
        generateAIInsight(
          `Food logged: ${fs.name} — ${Math.round(fs.calories)} kcal, ${Math.round(fs.protein)}g protein`,
          'Nutry',
        ).then(aiResult => {
          if (aiResult) {
            saveInsight({
              agent: 'Nutry',
              agentId: 'nutrition-agent',
              emoji: '\uD83C\uDF4E',
              insight: aiResult.insight,
              type: aiResult.type,
              updatedAt: new Date().toISOString(),
              section: 'nutrition',
            })
          }
        }).catch(err => console.warn('[coach/chat] Failed to generate nutrition insight:', err))

        return {
          type: 'nutrition',
          summary: `${fs.name} (${Math.round(fs.calories)} kcal, ${Math.round(fs.protein)}g protein)`,
        }
      }
    } catch (err) {
      console.error('[coach/chat] Failed to log nutrition entry:', err)
    }
  }

  return null
}

function getWeekKeyForBudget(weekNum: number | null): string {
  const now = new Date()
  const year = now.getFullYear()
  if (weekNum) return `${year}-W${String(weekNum).padStart(2, '0')}`
  const weekNumber = getISOWeek(now)
  return `${year}-W${String(weekNumber).padStart(2, '0')}`
}

function formatFitnessSummary(parsed: ReturnType<typeof parseFitnessMessage>): string {
  if (!parsed) return ''
  switch (parsed.type) {
    case 'steps': return `${(parsed.steps || 0).toLocaleString('en-US')} steps`
    case 'run': return `Run ${parsed.distance || 0}km${parsed.duration ? ` in ${parsed.duration}min` : ''}`
    case 'swim': return `Swim ${parsed.distance || 0}km${parsed.duration ? ` in ${parsed.duration}min` : ''}`
    case 'cycle': return `Ride ${parsed.distance || 0}km${parsed.duration ? ` in ${parsed.duration}min` : ''}`
    case 'jiujitsu': return `BJJ${parsed.duration ? ` ${parsed.duration}min` : ''}`
    case 'vo2max': return `VO2 Max ${parsed.vo2max}`
    case 'hrv': return `HRV ${parsed.hrv}ms`
    case 'weight': return `Weight ${parsed.weight}kg`
    case 'body_fat': return `Body fat ${parsed.bodyFat}%`
    case 'sleep': return `Sleep ${parsed.sleepHours}h`
    case 'stress': return `Stress ${parsed.stressLevel}%`
    case 'recovery': return `Recovery ${parsed.recoveryScore}%`
    case 'training_load': return `Training load ${parsed.trainingLoad}`
    default: return parsed.type
  }
}

async function generateFitnessInsight(
  parsed: NonNullable<ReturnType<typeof parseFitnessMessage>>,
  weekKey: string,
) {
  const contextLines: string[] = [`Activity logged: ${parsed.type}`]
  if (parsed.steps) contextLines.push(`Steps: ${parsed.steps.toLocaleString('en-US')}`)
  if (parsed.distance) contextLines.push(`Distance: ${parsed.distance}km`)
  if (parsed.duration) contextLines.push(`Duration: ${parsed.duration}min`)
  if (parsed.recoveryScore != null) contextLines.push(`Recovery score: ${parsed.recoveryScore}%`)
  if (parsed.stressLevel != null) contextLines.push(`Stress level: ${parsed.stressLevel}%`)
  if (parsed.hrv != null) contextLines.push(`HRV: ${parsed.hrv}ms`)
  if (parsed.vo2max != null) contextLines.push(`VO2 Max: ${parsed.vo2max}`)
  if (parsed.weight != null) contextLines.push(`Weight: ${parsed.weight}kg`)
  if (parsed.sleepHours != null) contextLines.push(`Sleep: ${parsed.sleepHours}h`)

  const aiResult = await generateAIInsight(contextLines.join('\n'), 'Fity')
  if (aiResult) {
    await saveInsight({
      agent: 'Fity',
      agentId: 'fitness-agent',
      emoji: '🏋️',
      insight: aiResult.insight,
      type: aiResult.type,
      updatedAt: new Date().toISOString(),
      section: 'fitness',
    })
  }
}

async function generateBudgetInsight(
  parsed: NonNullable<ReturnType<typeof parseExpenseMessage>>,
  savedData: { totalSpent?: number; remaining?: number },
  weekKey: string,
) {
  const contextLines = [
    `Expense logged: €${parsed.amount} ${parsed.description} (${parsed.category})`,
    `Week: ${weekKey}`,
    `Total spent this week: €${savedData.totalSpent?.toFixed(2) ?? parsed.amount}`,
    `Remaining budget: €${savedData.remaining?.toFixed(2) ?? 'unknown'}`,
  ]
  if (parsed.reason) contextLines.push(`Reason: ${parsed.reason}`)

  const aiResult = await generateAIInsight(contextLines.join('\n'), 'Budgy')
  if (aiResult) {
    await saveInsight({
      agent: 'Budgy',
      agentId: 'budget-agent',
      emoji: '💰',
      insight: aiResult.insight,
      type: aiResult.type,
      updatedAt: new Date().toISOString(),
      section: 'budget',
    })
  }
}

// ── Local fallback ──

function generateLocalResponse(message: string, context?: string, logResult?: LogResult | null): string {
  const lower = message.toLowerCase()

  if (logResult) {
    const prefix = `Logged: ${logResult.summary}.`
    if (logResult.type === 'fitness') {
      return `${prefix} Your fitness dashboard has been updated.`
    }
    if (logResult.type === 'nutrition') {
      return `${prefix} Your nutrition dashboard has been updated.`
    }
    return `${prefix} Your budget dashboard has been updated.`
  }

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

// ── Streaming helpers ──

/**
 * Create a true streaming SSE response.
 * Sends typing indicator immediately, then streams content as it becomes available.
 */
function createTrueStreamResponse(
  contentPromise: Promise<{ text: string; source: string; logResult: LogResult | null; memoriesSaved?: number }>,
): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      // IMMEDIATELY send typing indicator — user sees feedback in <100ms
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'typing' })}\n\n`))

      try {
        const { text, source, logResult, memoriesSaved } = await contentPromise

        // Stream words in fast small chunks for perceived real-time feel
        const words = text.split(/(\s+)/)
        let sent = ''
        const CHUNK_SIZE = 2 // Smaller chunks = smoother feel
        const CHUNK_DELAY = 12 // Faster interval

        for (let i = 0; i < words.length; i += CHUNK_SIZE) {
          const chunk = words.slice(i, i + CHUNK_SIZE).join('')
          sent += chunk
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text: chunk, fullText: sent })}\n\n`))
          // Only delay between chunks, not on the first one
          if (i + CHUNK_SIZE < words.length) {
            await new Promise(r => setTimeout(r, CHUNK_DELAY))
          }
        }

        // Send done event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'done',
          content: text,
          source,
          ...(logResult && { logged: logResult }),
          ...(memoriesSaved && { memoriesSaved }),
        })}\n\n`))
      } catch (err) {
        console.error('[coach/chat] Stream error:', err)
        const errorText = "Sorry, something went wrong. Please try again."
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'done',
          content: errorText,
          source: 'error',
        })}\n\n`))
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// ── POST handler ──

export async function POST(request: NextRequest) {
  const requestStart = Date.now()

  try {
    const body = await request.json()
    const { message, context, agent: requestedAgent, stream: useStream } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const agent = requestedAgent || detectAgent(message)
    const sessionKey = (VALID_AGENTS as readonly string[]).includes(agent) ? agent : 'main'

    // ── FAST PATH: Simple greetings respond in <50ms ──
    const fastResponse = getFastPathResponse(message)
    if (fastResponse) {
      // Fire-and-forget: save messages + relay
      const now = new Date().toISOString()
      appendMessage(sessionKey, { id: `${Date.now()}-user`, role: 'user', content: message, timestamp: now, source: 'gateway' }).catch(() => {})
      appendMessage(sessionKey, { id: `${Date.now()}-assistant`, role: 'assistant', content: fastResponse, timestamp: now, source: 'local' }).catch(() => {})
      relayToTelegram(message, fastResponse).catch(() => {})

      console.log(`[coach/chat] Fast-path response in ${Date.now() - requestStart}ms`)

      if (useStream) {
        return createTrueStreamResponse(
          Promise.resolve({ text: fastResponse, source: 'fast', logResult: null })
        )
      }
      return NextResponse.json({ content: fastResponse, source: 'fast', responseTimeMs: Date.now() - requestStart })
    }

    // ── PARALLEL PRE-PROCESSING ──
    // Start ALL async work simultaneously instead of sequentially

    // 1. Save user message (fire-and-forget — don't block on this)
    appendMessage(sessionKey, {
      id: `${Date.now()}-user`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      source: 'gateway',
    }).catch(err => console.error('[coach/chat] Failed to save user message:', err))

    // 2. Start data logging AND context fetching in parallel
    const relevantCategories = getRelevantMemoryCategories(message)
    const [logResult, memoryContext, recentHistory] = await Promise.all([
      tryLogData(message),
      getMemoryContext(relevantCategories),
      getRecentContext(sessionKey, 8),
    ])

    if (logResult) {
      console.log(`[coach/chat] Logged ${logResult.type} entry: ${logResult.summary}`)
    }

    // ── NO GATEWAY: local fallback ──
    if (!GATEWAY_URL || !GATEWAY_TOKEN) {
      const localContent = generateLocalResponse(message, context, logResult)

      // Fire-and-forget post-work
      appendMessage(sessionKey, {
        id: `${Date.now()}-assistant`, role: 'assistant', content: localContent,
        timestamp: new Date().toISOString(), source: 'local',
      }).catch(() => {})
      relayToTelegram(message, localContent).catch(() => {})

      if (useStream) {
        return createTrueStreamResponse(
          Promise.resolve({ text: localContent, source: 'local', logResult })
        )
      }
      return NextResponse.json({ content: localContent, source: 'local', ...(logResult && { logged: logResult }) })
    }

    // ── BUILD CONTEXT (already fetched in parallel above) ──
    const contextParts = ['[Velum Coach Screen]']
    if (memoryContext) contextParts.push(memoryContext)
    if (recentHistory) contextParts.push(`[Recent Conversation]\n${recentHistory}`)
    if (context) contextParts.push(`[Dashboard Data]\n${context}`)
    if (logResult) contextParts.push(`[Auto-logged] ${logResult.type}: ${logResult.summary}`)
    contextParts.push(`User: ${message}`)

    const fullMessage = contextParts.join('\n\n')

    // ── GATEWAY CALL ──
    // If streaming: return SSE immediately with typing, then stream when gateway responds
    // If not streaming: wait and return JSON

    const gatewayCall = async (): Promise<{ text: string; source: string; logResult: LogResult | null; memoriesSaved?: number }> => {
      try {
        const gatewayStart = Date.now()
        const response = await fetch(`${GATEWAY_URL}/tools/invoke`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GATEWAY_TOKEN}`,
          },
          body: JSON.stringify({
            tool: 'sessions_send',
            args: { sessionKey, message: fullMessage, timeoutSeconds: 55 },
          }),
          signal: AbortSignal.timeout(60000),
        })
        const responseTimeMs = Date.now() - gatewayStart

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`[coach/chat] Gateway error ${response.status}:`, errorText)
          const fallback = generateLocalResponse(message, context, logResult)

          // Fire-and-forget
          appendMessage(sessionKey, {
            id: `${Date.now()}-assistant`, role: 'assistant', content: fallback,
            timestamp: new Date().toISOString(), source: 'local_fallback',
          }).catch(() => {})
          relayToTelegram(message, fallback).catch(() => {})

          return { text: fallback, source: 'local_fallback', logResult }
        }

        const data = await response.json()
        let responseContent: string

        if (data.ok && data.result) {
          const result = data.result
          const details = result.details || {}

          if (details.status === 'timeout') {
            responseContent = 'The assistant is taking a moment to think. Please try again shortly.'
          } else {
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

        // Extract memories
        const { cleaned, memories } = extractMemoriesFromText(responseContent)

        // Fire-and-forget: save memories, message, relay
        if (memories.length > 0) {
          Promise.all(
            memories.map(m => saveMemory({ category: m.category, key: m.key, value: m.value, source: 'agent' }))
          ).catch(err => console.error('[coach/chat] Failed to save memories:', err))
        }

        appendMessage(sessionKey, {
          id: `${Date.now()}-assistant`, role: 'assistant', content: cleaned,
          timestamp: new Date().toISOString(), source: 'gateway',
          metadata: memories.length > 0 ? { memoriesExtracted: memories.length } : undefined,
        }).catch(() => {})
        relayToTelegram(message, cleaned).catch(() => {})

        console.log(`[coach/chat] Gateway responded in ${responseTimeMs}ms (total: ${Date.now() - requestStart}ms)`)

        return {
          text: cleaned,
          source: 'gateway',
          logResult,
          memoriesSaved: memories.length > 0 ? memories.length : undefined,
        }
      } catch (fetchError) {
        console.error('[coach/chat] Gateway fetch error:', fetchError)
        const fallback = generateLocalResponse(message, context, logResult)

        appendMessage(sessionKey, {
          id: `${Date.now()}-assistant`, role: 'assistant', content: fallback,
          timestamp: new Date().toISOString(), source: 'local_fallback',
        }).catch(() => {})
        relayToTelegram(message, fallback).catch(() => {})

        return { text: fallback, source: 'local_fallback', logResult }
      }
    }

    if (useStream) {
      // Return SSE stream IMMEDIATELY — typing shows while gateway works
      return createTrueStreamResponse(gatewayCall())
    }

    // Non-streaming: wait for full response
    const result = await gatewayCall()
    return NextResponse.json({
      content: result.text,
      source: result.source,
      responseTimeMs: Date.now() - requestStart,
      ...(result.memoriesSaved && { memoriesSaved: result.memoriesSaved }),
      ...(result.logResult && { logged: result.logResult }),
    })
  } catch (error) {
    console.error('[coach/chat] API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
