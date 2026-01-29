import { NextResponse } from 'next/server'

const GATEWAY_URL = process.env.GATEWAY_URL || 'https://rasppi5.tail5b3227.ts.net'
const GATEWAY_PASSWORD = process.env.GATEWAY_PASSWORD
const SESSION_KEY = 'agent:main:main'

// Helper to call gateway tools (awaits response)
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

// Helper to extract text from message content
function extractText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    for (const item of content) {
      if (item?.type === 'text' && item?.text) return item.text
    }
  }
  return ''
}

// GET - Fetch chat history from the Pi
// Returns messages from Velum Web UI conversations
export async function GET() {
  try {
    if (!GATEWAY_PASSWORD) {
      return NextResponse.json(
        { error: 'Gateway not configured' },
        { status: 500 }
      )
    }

    // Fetch recent history from the shared session
    const history = await invokeTool('sessions_history', { sessionKey: SESSION_KEY, limit: 50 })
    const historyData = JSON.parse(history.result?.content?.[0]?.text || '{}')
    const messages = historyData.messages || []

    // Filter and transform messages from Velum Web UI conversations
    // Messages are in reverse chronological order (newest first)
    const chatMessages: { role: string; content: string; timestamp?: string }[] = []

    // Process messages - we want to find Velum Web UI user messages and their responses
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i]
      const content = extractText(msg.content)

      if (msg.role === 'user' && content.includes('[Velum Web UI')) {
        // This is a Velum user message - extract the actual content
        // Format: [Velum Web UI VLM{timestamp}] actual message
        const match = content.match(/\[Velum Web UI VLM\d+\]\s*(.+)/)
        const userContent = match ? match[1] : content.replace(/\[Velum Web UI[^\]]*\]\s*/, '')

        // Add the user message
        chatMessages.push({
          role: 'user',
          content: userContent,
          timestamp: msg.timestamp
        })

        // Check if there's an assistant response (at lower index = newer)
        if (i > 0) {
          const prevMsg = messages[i - 1]
          if (prevMsg.role === 'assistant') {
            const assistantContent = extractText(prevMsg.content)
            // Skip nutrition JSON responses (they're data, not chat)
            if (!assistantContent.includes('"entries"') || !assistantContent.includes('"totals"')) {
              chatMessages.push({
                role: 'assistant',
                content: assistantContent,
                timestamp: prevMsg.timestamp
              })
            }
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

// POST - Send a new chat message
export async function POST(request: Request) {
  try {
    const { messages } = await request.json()

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

    // Add unique marker to identify our message
    const uniqueMarker = `VLM${Date.now()}`
    const fullMessage = `[Velum Web UI ${uniqueMarker}] ${messageContent}`

    // Start sending the message (don't await - let it run in parallel)
    const sendPromise = fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GATEWAY_PASSWORD}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tool: 'sessions_send',
        args: { sessionKey: SESSION_KEY, message: fullMessage }
      })
    }).catch(() => null) // Ignore errors

    // Poll for new assistant response (max 25 seconds)
    const startTime = Date.now()
    const maxWait = 25000
    const pollInterval = 1000

    // Wait a bit for the message to be sent
    await new Promise(resolve => setTimeout(resolve, 1500))

    while (Date.now() - startTime < maxWait) {
      const historyAfter = await invokeTool('sessions_history', { sessionKey: SESSION_KEY, limit: 10 })
      const historyData = JSON.parse(historyAfter.result?.content?.[0]?.text || '{}')
      const messagesAfter = historyData.messages || []

      // History is in reverse chronological order (newest first)
      // Find our user message by unique marker, then check if there's a response
      for (let i = 0; i < messagesAfter.length; i++) {
        const msg = messagesAfter[i]
        if (msg.role === 'user') {
          const userText = extractText(msg.content)
          // Found our message by unique marker
          if (userText.includes(uniqueMarker)) {
            // Check if there's an assistant response before it (lower index = newer)
            if (i > 0) {
              const prevMsg = messagesAfter[i - 1]
              if (prevMsg.role === 'assistant') {
                const reply = extractText(prevMsg.content)
                if (reply) {
                  return NextResponse.json({ reply })
                }
              }
            }
            // Our message exists but no response yet - keep polling
            break
          }
        }
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }

    // Timeout - no response received yet
    return NextResponse.json({
      reply: "I'm still thinking... The response is taking longer than expected. Please try again in a moment."
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
