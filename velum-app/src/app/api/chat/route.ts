import { NextRequest, NextResponse } from 'next/server'
import { appendMessage, getRecentContext } from '../../lib/sessionStore'
import {
  getMemoryContext,
  extractMemoriesFromText,
  saveMemory,
} from '../../lib/memoryStore'

export const dynamic = 'force-dynamic'

const GATEWAY_URL = process.env.GATEWAY_URL
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || process.env.GATEWAY_PASSWORD

// Local fallback responses when gateway is unavailable
function generateLocalResponse(message: string, context?: string): string {
  const lowerMsg = message.toLowerCase()

  if (lowerMsg.includes('eat') || lowerMsg.includes('food') || lowerMsg.includes('meal') || lowerMsg.includes('calorie')) {
    if (context) {
      return `Based on your log: ${context}. You're doing great tracking your nutrition! Want me to suggest some high-protein options for your next meal?`
    }
    return "I can help you track your nutrition! Tell me what you ate and I'll log it for you. Or ask for meal suggestions based on your goals."
  }

  if (lowerMsg.includes('goal') || lowerMsg.includes('target')) {
    return "Your daily goals are set to 2000 calories, 150g protein, 200g carbs, and 65g fat. You're making solid progress!"
  }

  if (lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('hey')) {
    return "Hey! I'm Archie, your nutrition assistant. I can help you log food, review your intake, or give meal suggestions. What's up?"
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

export async function POST(request: NextRequest) {
  try {
    const { message, context } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const sessionKey = 'main'

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

    // Build enriched context: persistent memory + recent conversation + dashboard data
    const [memoryContext, recentHistory] = await Promise.all([
      getMemoryContext(),
      getRecentContext(sessionKey, 8),
    ])

    const contextParts = ['[Velum]']
    if (memoryContext) contextParts.push(memoryContext)
    if (recentHistory) contextParts.push(`[Recent Conversation]\n${recentHistory}`)
    if (context) contextParts.push(`[Dashboard Data]\n${context}`)
    contextParts.push(`User: ${message}`)

    const fullMessage = contextParts.join('\n\n')

    try {
      // OpenClaw tools/invoke HTTP API
      const response = await fetch(`${GATEWAY_URL}/tools/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        },
        body: JSON.stringify({
          tool: 'sessions_send',
          args: {
            sessionKey: 'main',
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

      // OpenClaw tools/invoke returns { ok: true, result: { ... } }
      let responseContent: string
      if (data.ok && data.result) {
        const result = data.result
        responseContent = result.reply || result.response || result.message || result.content || result.text || 'No response received'
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
