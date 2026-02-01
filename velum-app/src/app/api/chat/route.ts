import { NextRequest, NextResponse } from 'next/server'

const GATEWAY_URL = process.env.GATEWAY_URL || 'https://rasppi5.tail5b3227.ts.net'
const GATEWAY_PASSWORD = process.env.GATEWAY_PASSWORD

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
  
  return "I'm here to help with your nutrition! Ask me to log food, review your day, or suggest meals based on your macros."
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
    if (!GATEWAY_PASSWORD) {
      console.warn('GATEWAY_PASSWORD not set, using local response')
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
      const response = await fetch(`${GATEWAY_URL}/tools/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GATEWAY_PASSWORD}`,
        },
        body: JSON.stringify({
          tool: 'sessions_send',
          args: {
            sessionKey: 'agent:main:main',
            message: fullMessage
          }
        }),
        signal: AbortSignal.timeout(30000)
      })

      if (!response.ok) {
        console.error(`Gateway error ${response.status}:`, await response.text())
        // Fall back to local response
        return NextResponse.json({
          content: generateLocalResponse(message, context),
          source: 'local_fallback'
        })
      }

      const data = await response.json()
      
      return NextResponse.json({
        content: data.response || data.message || data.content || 'No response received',
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
