import { NextRequest, NextResponse } from 'next/server'

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

    // Check if gateway is configured
    if (!GATEWAY_URL || !GATEWAY_TOKEN) {
      console.warn('GATEWAY_URL or OPENCLAW_GATEWAY_TOKEN not set, using local response')
      return NextResponse.json({
        content: generateLocalResponse(message, context),
        source: 'local'
      })
    }

    // Format message with context
    const fullMessage = context
      ? `[Velum] Context: ${context}\n\nUser: ${message}`
      : `[Velum] ${message}`

    try {
      // OpenClaw tools/invoke HTTP API
      // https://docs.openclaw.ai/gateway/tools-invoke-http-api
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
        // Fall back to local response
        return NextResponse.json({
          content: generateLocalResponse(message, context),
          source: 'local_fallback'
        })
      }

      const data = await response.json()

      // OpenClaw tools/invoke returns { ok: true, result: { ... } }
      if (data.ok && data.result) {
        const result = data.result
        const content = result.reply || result.response || result.message || result.content || result.text || 'No response received'
        return NextResponse.json({
          content,
          source: 'gateway'
        })
      }

      // Fallback: try direct fields for backward compatibility
      const content = data.response || data.message || data.content || data.reply || 'No response received'
      return NextResponse.json({
        content,
        source: 'gateway'
      })

    } catch (fetchError) {
      console.error('Gateway fetch error:', fetchError)
      // Fall back to local response on network error
      return NextResponse.json({
        content: generateLocalResponse(message, context),
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
