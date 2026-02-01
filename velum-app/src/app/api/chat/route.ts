import { NextRequest, NextResponse } from 'next/server'

const GATEWAY_URL = process.env.GATEWAY_URL || 'https://rasppi5.tail5b3227.ts.net'
const GATEWAY_PASSWORD = process.env.GATEWAY_PASSWORD

// Simple response generator for when gateway is unavailable
function generateLocalResponse(message: string, context?: string): string {
  const lowerMsg = message.toLowerCase()
  
  if (lowerMsg.includes('eat') || lowerMsg.includes('food') || lowerMsg.includes('meal') || lowerMsg.includes('calorie')) {
    if (context) {
      return `Based on your log: ${context}. You're doing great tracking your nutrition! Is there anything specific you'd like to add or modify?`
    }
    return "I can see you're interested in your nutrition today. You've logged several meals already. Would you like to add something else or see a summary?"
  }
  
  if (lowerMsg.includes('goal') || lowerMsg.includes('target')) {
    return "Your daily goals are set to 2000 calories, 150g protein, 200g carbs, and 65g fat. You're making good progress toward these goals!"
  }
  
  if (lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('hey')) {
    return "Hey there! I'm your nutrition assistant. I can help you log food, review your daily intake, or answer questions about your nutrition goals. What would you like to do?"
  }
  
  if (lowerMsg.includes('help')) {
    return "I can help you:\n• Log food entries\n• Review today's nutrition totals\n• Check progress toward your goals\n• Answer nutrition questions\n\nJust tell me what you'd like to do!"
  }
  
  return "I understand! I'm here to help with your nutrition tracking. Feel free to ask about your daily intake, log new foods, or discuss your goals."
}

export async function POST(request: NextRequest) {
  try {
    const { message, messages, context, section = 'nutrition' } = await request.json()

    // Support both message formats
    const messageContent = message || (messages && messages.length > 0 ? messages[messages.length - 1].content : '')

    if (!messageContent || typeof messageContent !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Debug: Log env var status (redacted for security)
    console.log('GATEWAY_URL:', GATEWAY_URL)
    console.log('GATEWAY_PASSWORD exists:', !!GATEWAY_PASSWORD)
    console.log('GATEWAY_PASSWORD length:', GATEWAY_PASSWORD ? GATEWAY_PASSWORD.length : 0)
    
    // If gateway not configured, use local response
    if (!GATEWAY_PASSWORD) {
      console.log('Gateway not configured, using local response for:', messageContent)
      const localReply = generateLocalResponse(messageContent, context)
      return NextResponse.json({ content: localReply, reply: localReply, local: true, debug: 'no_password' })
    }

    // Build the message with context if provided
    const fullMessage = context
      ? `[Velum:${section}] Context: ${context}\n\nUser: ${messageContent}`
      : `[Velum:${section}] ${messageContent}`

    try {
      const response = await fetch(`${GATEWAY_URL}/tools/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GATEWAY_PASSWORD}`,
        },
        body: JSON.stringify({
          tool: 'agent_send',
          args: {
            message: fullMessage
          }
        }),
        signal: AbortSignal.timeout(30000)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Gateway error: ${response.status} - ${errorText}`)
        // Fall back to local response
        const localReply = generateLocalResponse(messageContent, context)
        return NextResponse.json({ 
          content: localReply, 
          reply: localReply, 
          fallback: true,
          debug: 'gateway_error',
          status: response.status,
          error: errorText
        })
      }

      const data = await response.json()
      const reply = data.response || data.message || data.content || data.reply || 'No response received'

      return NextResponse.json({
        content: reply,
        reply: reply,
      })
    } catch (fetchError) {
      console.error('Fetch error:', fetchError)
      // Fall back to local response on network error
      const localReply = generateLocalResponse(messageContent, context)
      return NextResponse.json({ 
        content: localReply, 
        reply: localReply, 
        fallback: true,
        debug: 'fetch_error',
        error: fetchError instanceof Error ? fetchError.message : 'Unknown fetch error'
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

// GET - Fetch chat history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section') || 'nutrition'

    // If gateway not configured, return empty history
    if (!GATEWAY_PASSWORD) {
      return NextResponse.json({ messages: [] })
    }

    // Try to fetch history from gateway
    try {
      const response = await fetch(`${GATEWAY_URL}/tools/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GATEWAY_PASSWORD}`,
        },
        body: JSON.stringify({
          tool: 'sessions_history',
          args: { limit: 50 }
        }),
        signal: AbortSignal.timeout(10000)
      })

      if (!response.ok) {
        return NextResponse.json({ messages: [] })
      }

      const data = await response.json()
      const messages = data.messages || data.result?.messages || []
      
      // Filter for Velum messages from this section
      const sectionMessages = messages.filter((m: any) => {
        const content = typeof m.content === 'string' ? m.content : ''
        return content.includes(`[Velum:${section}]`)
      })

      return NextResponse.json({ messages: sectionMessages })
    } catch (error) {
      console.error('History fetch error:', error)
      return NextResponse.json({ messages: [] })
    }
  } catch (error) {
    console.error('Chat history error:', error)
    return NextResponse.json({ messages: [] })
  }
}
