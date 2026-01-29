import { NextRequest, NextResponse } from 'next/server'

const GATEWAY_URL = process.env.GATEWAY_URL || 'https://rasppi5.tail5b3227.ts.net'
const GATEWAY_PASSWORD = process.env.GATEWAY_PASSWORD
const SESSION_KEY = 'agent:main:main'

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

export async function POST(request: NextRequest) {
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
    const fullMessage = `[Velum Web UI] ${messageContent}`

    // Get current message count to detect new response
    const historyBefore = await invokeTool('sessions_history', { sessionKey: SESSION_KEY, limit: 1 })
    const messagesBefore = JSON.parse(historyBefore.result?.content?.[0]?.text || '{}').messages || []
    const lastTimestamp = messagesBefore[0]?.timestamp || 0

    // Send the message (this may timeout, which is OK)
    await invokeTool('sessions_send', { sessionKey: SESSION_KEY, message: fullMessage })

    // Poll for new assistant response (max 25 seconds to stay under Vercel 30s limit)
    const startTime = Date.now()
    const maxWait = 25000
    const pollInterval = 1000

    while (Date.now() - startTime < maxWait) {
      await new Promise(resolve => setTimeout(resolve, pollInterval))

      const historyAfter = await invokeTool('sessions_history', { sessionKey: SESSION_KEY, limit: 5 })
      const historyData = JSON.parse(historyAfter.result?.content?.[0]?.text || '{}')
      const messagesAfter = historyData.messages || []

      // Look for new assistant message after our user message
      for (const msg of messagesAfter) {
        if (msg.role === 'assistant' && msg.timestamp > lastTimestamp) {
          const reply = extractText(msg.content)
          if (reply) {
            return NextResponse.json({ reply })
          }
        }
      }
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
