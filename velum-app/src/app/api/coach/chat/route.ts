import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

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
  if (FITNESS_RE.test(message)) return 'main'
  return 'main'
}

// ── Local fallback ──
function generateLocalResponse(message: string, context?: string): string {
  const lower = message.toLowerCase()

  if (NUTRITION_RE.test(lower)) {
    return context
      ? `Based on your nutrition data: ${context}. Keep tracking!`
      : "I can help with nutrition! Tell me what you ate and I'll log it."
  }
  if (BUDGET_RE.test(lower)) {
    return context
      ? `Looking at your budget: ${context}. You're staying on track!`
      : "I can help track spending! Tell me what you spent."
  }
  if (FITNESS_RE.test(lower)) {
    return context
      ? `Checking your fitness: ${context}. Great work!`
      : "I can log workouts! Tell me what you did."
  }
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return "Hey! I'm Archie, your Velum coach. Ask me about nutrition, fitness, budget, or goals."
  }
  return "I'm here to help! Ask about nutrition, fitness, budget, or goals."
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
      signal: AbortSignal.timeout(3000),
    })
  } catch (err) {
    console.error('[coach/chat] Telegram relay error:', err)
  }
}

// ── Streaming Response Helper ──
function createStreamResponse() {
  const encoder = new TextEncoder()
  let controller: ReadableStreamDefaultController | null = null

  const stream = new ReadableStream({
    start(c) {
      controller = c
    },
  })

  return {
    stream,
    send: (data: unknown) => {
      if (controller) {
        controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))
      }
    },
    close: () => {
      if (controller) {
        controller.close()
      }
    },
    error: (err: Error) => {
      if (controller) {
        controller.error(err)
      }
    },
  }
}

// ── POST handler with streaming ──
export async function POST(request: NextRequest) {
  const { message, context, agent: requestedAgent, stream: requestStream = true } = await request.json()

  if (!message || typeof message !== 'string') {
    return new Response(JSON.stringify({ error: 'Message is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // If streaming not requested, use simple JSON response
  if (!requestStream) {
    return handleNonStreaming(message, context, requestedAgent)
  }

  const { stream, send, close } = createStreamResponse()
  const agent = requestedAgent || detectAgent(message)

  // Start processing in background
  ;(async () => {
    try {
      // Send immediate typing indicator
      send({ type: 'status', status: 'typing' })

      // No gateway — use local fallback
      if (!GATEWAY_URL || !GATEWAY_TOKEN) {
        const localContent = generateLocalResponse(message, context)
        send({ type: 'chunk', content: localContent })
        send({ type: 'done', source: 'local', content: localContent })
        close()
        return
      }

      // Build context with reduced history (3 messages instead of 8)
      const contextParts = ['[Velum Coach Screen]']
      if (context) contextParts.push(`[Dashboard Data]\n${context}`)
      contextParts.push(`User: ${message}`)
      const fullMessage = contextParts.join('\n\n')

      try {
        // Send typing status while waiting
        send({ type: 'status', status: 'typing' })

        const response = await fetch(`${GATEWAY_URL}/tools/invoke`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GATEWAY_TOKEN}`,
          },
          body: JSON.stringify({
            tool: 'sessions_send',
            args: { 
              sessionKey: agent, 
              message: fullMessage, 
              timeoutSeconds: 12 // Reduced from 25s
            },
          }),
          signal: AbortSignal.timeout(15000), // Reduced from 30s
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`[coach/chat] Gateway error ${response.status}:`, errorText)
          const fallback = generateLocalResponse(message, context)
          send({ type: 'chunk', content: fallback })
          send({ type: 'done', source: 'local_fallback', content: fallback })
          close()
          return
        }

        const data = await response.json()
        let responseContent: string

        if (data.ok && data.result) {
          const result = data.result
          responseContent = result.reply || result.response || result.message || result.content || result.text || 'No response received'
        } else {
          responseContent = data.response || data.message || data.content || data.reply || 'No response received'
        }

        // Stream the response in chunks for perceived speed
        const words = responseContent.split(' ')
        const chunkSize = 3 // Words per chunk
        let accumulated = ''

        for (let i = 0; i < words.length; i += chunkSize) {
          const chunk = words.slice(i, i + chunkSize).join(' ')
          accumulated += (accumulated ? ' ' : '') + chunk
          send({ type: 'chunk', content: accumulated })
          // Small delay for streaming effect
          await new Promise(resolve => setTimeout(resolve, 20))
        }

        // Send final done event
        send({ type: 'done', source: 'gateway', content: responseContent })

        // Relay to Telegram (non-blocking)
        relayToTelegram(message, responseContent).catch(() => {})

        close()
      } catch (fetchError) {
        console.error('[coach/chat] Gateway fetch error:', fetchError)
        const fallback = generateLocalResponse(message, context)
        send({ type: 'chunk', content: fallback })
        send({ type: 'done', source: 'local_fallback', content: fallback })
        close()
      }
    } catch (error) {
      console.error('[coach/chat] Streaming error:', error)
      send({ type: 'error', error: 'Internal server error' })
      close()
    }
  })()

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// ── Non-streaming handler for backward compatibility ──
async function handleNonStreaming(message: string, context?: string, requestedAgent?: string) {
  const agent = requestedAgent || detectAgent(message)

  if (!GATEWAY_URL || !GATEWAY_TOKEN) {
    const localContent = generateLocalResponse(message, context)
    return NextResponse.json({ content: localContent, source: 'local' })
  }

  const contextParts = ['[Velum Coach Screen]']
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
        args: { 
          sessionKey: agent, 
          message: fullMessage, 
          timeoutSeconds: 12 // Reduced from 25s
        },
      }),
      signal: AbortSignal.timeout(15000), // Reduced from 30s
    })

    if (!response.ok) {
      const fallback = generateLocalResponse(message, context)
      return NextResponse.json({ content: fallback, source: 'local_fallback' })
    }

    const data = await response.json()
    let responseContent: string

    if (data.ok && data.result) {
      responseContent = data.result.reply || data.result.response || data.result.message || data.result.content || data.result.text || 'No response received'
    } else {
      responseContent = data.response || data.message || data.content || data.reply || 'No response received'
    }

    relayToTelegram(message, responseContent).catch(() => {})

    return NextResponse.json({ content: responseContent, source: 'gateway' })
  } catch (fetchError) {
    const fallback = generateLocalResponse(message, context)
    return NextResponse.json({ content: fallback, source: 'local_fallback' })
  }
}


