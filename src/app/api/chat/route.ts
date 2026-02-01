import { NextResponse } from 'next/server'

const GATEWAY_URL = process.env.GATEWAY_URL || 'https://rasppi5.tail5b3227.ts.net'
const GATEWAY_PASSWORD = process.env.GATEWAY_PASSWORD

// All Velum messages go to the main session so the bot has full context
// Messages are tagged with [Velum:section] to identify source
const MAIN_SESSION_KEY = 'agent:main:main'

// Helper to call gateway tools with timeout
async function invokeTool(tool: string, args: Record<string, unknown>, timeoutMs = 10000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const response = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GATEWAY_PASSWORD}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tool, args }),
      signal: controller.signal
    })
    clearTimeout(timeout)
    return response.json()
  } catch (error) {
    clearTimeout(timeout)
    throw error
  }
}

// Helper to extract text from message content (handles both string and array formats)
function extractText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    // Look for text content, skip thinking blocks
    for (const item of content) {
      if (item?.type === 'text' && item?.text) {
        return item.text
      }
    }
  }
  return ''
}

// Simple response generator for when gateway is unavailable
function generateLocalResponse(message: string, context?: string): string {
  const lowerMsg = message.toLowerCase()
  
  if (lowerMsg.includes('eat') || lowerMsg.includes('food') || lowerMsg.includes('meal') || lowerMsg.includes('calorie')) {
    if (context) {
      return `Based on your log today: ${context}. You're doing great tracking your nutrition! Is there anything specific you'd like to add or modify?`
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

// GET - Fetch chat history filtered by section
// Query param: ?section=nutrition or ?section=goals
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section') || 'nutrition'

    // If gateway not configured, return empty history (will use default greeting)
    if (!GATEWAY_PASSWORD) {
      return NextResponse.json({ messages: [] })
    }

    // Fetch from main session
    const history = await invokeTool('sessions_history', { sessionKey: MAIN_SESSION_KEY, limit: 100 })
    const historyData = JSON.parse(history.result?.content?.[0]?.text || '{}')
    const messages = historyData.messages || []

    // Filter and transform messages for the UI
    const chatMessages: { role: string; content: string; timestamp?: string }[] = []
    const sectionTag = `[Velum:${section}`

    // Process messages - look for Velum messages from this section
    // Messages are in reverse chronological order (newest first)
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i]
      const content = extractText(msg.content)

      if (msg.role === 'user' && content.includes(sectionTag)) {
        // Clean up the user message - remove [Velum:section VLMxxx] prefix
        const cleanContent = content.replace(/\[Velum:[^\]]+\]\s*/g, '').trim()

        // Check if there's a non-empty assistant response before this message (lower index = newer)
        let assistantResponse = ''
        if (i > 0) {
          const prevMsg = messages[i - 1]
          if (prevMsg.role === 'assistant') {
            assistantResponse = extractText(prevMsg.content)
            // Skip pure nutrition JSON responses
            const isPureJson = assistantResponse.trim().startsWith('{') &&
                              assistantResponse.includes('"entries"') &&
                              assistantResponse.includes('"totals"')
            if (isPureJson) {
              assistantResponse = ''
            }
          }
        }

        // Only add to chat if there's meaningful content
        if (cleanContent) {
          chatMessages.push({
            role: 'user',
            content: cleanContent,
            timestamp: msg.timestamp
          })

          if (assistantResponse && assistantResponse.trim()) {
            chatMessages.push({
              role: 'assistant',
              content: assistantResponse,
              timestamp: messages[i - 1]?.timestamp
            })
          }
        }
      }
    }

    // Reverse to get chronological order (oldest first)
    chatMessages.reverse()

    // Limit to last 20 messages for the UI
    const recentMessages = chatMessages.slice(-20)

    return NextResponse.json({ messages: recentMessages })
  } catch (error) {
    console.error('Chat history error:', error)
    // Return empty messages on error - UI will show default greeting
    return NextResponse.json({ messages: [] })
  }
}

// POST - Send a new chat message
export async function POST(request: Request) {
  try {
    const { messages, section = 'nutrition', context } = await request.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    // Get the last user message
    const lastUserMessage = messages.filter((m: { role: string }) => m.role === 'user').pop()
    const messageContent = lastUserMessage?.content || ''

    // If gateway not configured, use local response generator
    if (!GATEWAY_PASSWORD) {
      console.log('Gateway not configured, using local response for:', messageContent)
      const localReply = generateLocalResponse(messageContent, context)
      return NextResponse.json({ reply: localReply, local: true })
    }

    // Add section tag and unique marker to identify our message
    const uniqueMarker = `VLM${Date.now()}`
    const fullMessage = `[Velum:${section} ${uniqueMarker}] ${messageContent}`

    console.log('Sending message with marker:', uniqueMarker)

    // Send to main session
    const sendResult = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GATEWAY_PASSWORD}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tool: 'sessions_send',
        args: { sessionKey: MAIN_SESSION_KEY, message: fullMessage }
      })
    })

    if (!sendResult.ok) {
      console.error('Failed to send message:', await sendResult.text())
      // Fall back to local response
      const localReply = generateLocalResponse(messageContent, context)
      return NextResponse.json({ reply: localReply, fallback: true })
    }

    // Poll for assistant response (max 35 seconds)
    const startTime = Date.now()
    const maxWait = 35000
    const pollInterval = 2000

    // Wait for the bot to start processing
    await new Promise(resolve => setTimeout(resolve, 3000))

    while (Date.now() - startTime < maxWait) {
      try {
        const historyAfter = await invokeTool('sessions_history', { sessionKey: MAIN_SESSION_KEY, limit: 15 })
        const historyData = JSON.parse(historyAfter.result?.content?.[0]?.text || '{}')
        const messagesAfter = historyData.messages || []

        // History is in reverse chronological order (newest first)
        // Find our user message by unique marker
        for (let i = 0; i < messagesAfter.length; i++) {
          const msg = messagesAfter[i]
          if (msg.role === 'user') {
            const userText = extractText(msg.content)

            // Found our message by unique marker
            if (userText.includes(uniqueMarker)) {
              console.log('Found our message at index', i)

              // Check if there's an assistant response before it (lower index = newer)
              if (i > 0) {
                const prevMsg = messagesAfter[i - 1]
                if (prevMsg.role === 'assistant') {
                  const reply = extractText(prevMsg.content)

                  // Only return if we have actual text content (not empty)
                  if (reply && reply.trim().length > 0) {
                    // Skip if it's just JSON data
                    const isPureJson = reply.trim().startsWith('{') &&
                                      reply.includes('"entries"') &&
                                      reply.includes('"totals"')
                    if (!isPureJson) {
                      console.log('Got response:', reply.substring(0, 100))
                      return NextResponse.json({ reply })
                    }
                  }
                }
              }
              // Our message exists but no valid response yet - keep polling
              console.log('Message found but no response yet, continuing to poll...')
              break
            }
          }
        }
      } catch (pollError) {
        console.error('Poll error:', pollError)
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }

    // Timeout - no response received, fall back to local response
    console.log('Polling timed out, using local fallback')
    const localReply = generateLocalResponse(messageContent, context)
    return NextResponse.json({ reply: localReply, fallback: true })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
