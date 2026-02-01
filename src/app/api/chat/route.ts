import { NextResponse } from 'next/server'

const GATEWAY_URL = process.env.GATEWAY_URL || 'https://rasppi5.tail5b3227.ts.net'
const GATEWAY_PASSWORD = process.env.GATEWAY_PASSWORD

// All Velum messages go to the main session so the bot has full context
// Messages are tagged with [Velum:section] to identify source
const MAIN_SESSION_KEY = 'agent:main:main'

// Helper to call gateway tools
async function invokeTool(tool: string, args: Record<string, unknown>) {
  const response = await fetch(`${GATEWAY_URL}/tools/invoke`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GATEWAY_PASSWORD}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ tool, args })
  })
  return response.json()
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

// GET - Fetch chat history filtered by section
// Query param: ?section=nutrition or ?section=goals
export async function GET(request: Request) {
  try {
    if (!GATEWAY_PASSWORD) {
      return NextResponse.json(
        { error: 'Gateway not configured' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section') || 'nutrition'

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
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    )
  }
}

// POST - Send a new chat message to the main session (tagged by section)
export async function POST(request: Request) {
  try {
    const { messages, section = 'nutrition' } = await request.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    if (!GATEWAY_PASSWORD) {
      console.error('GATEWAY_PASSWORD environment variable is not set')
      return NextResponse.json(
        { error: 'Gateway not configured' },
        { status: 500 }
      )
    }

    // Get the last user message
    const lastUserMessage = messages.filter((m: { role: string }) => m.role === 'user').pop()
    const messageContent = lastUserMessage?.content || ''

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
      return NextResponse.json({
        reply: "Sorry, I couldn't send your message. Please try again."
      })
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

    // Timeout - no response received
    console.log('Polling timed out after', maxWait, 'ms')
    return NextResponse.json({
      reply: "I'm still thinking... Try refreshing the chat in a few seconds."
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
