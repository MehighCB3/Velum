import { NextRequest, NextResponse } from 'next/server'

const GATEWAY_URL = process.env.GATEWAY_URL || 'https://rasppi5.tail5b3227.ts.net'
const GATEWAY_PASSWORD = process.env.GATEWAY_PASSWORD

export async function POST(request: NextRequest) {
  try {
    const { messages, userId } = await request.json()

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

    // Add context about Velum source for the bot
    const fullMessage = `[Velum Web UI] ${messageContent}`

    // Use the main session - Moltbot doesn't support creating new sessions via API
    // All Velum users share the main session (same as Telegram)
    const sessionKey = 'agent:main:main'

    // Use the /tools/invoke endpoint with sessions_send tool
    const response = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GATEWAY_PASSWORD}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tool: 'sessions_send',
        args: {
          sessionKey: sessionKey,
          message: fullMessage
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Gateway error: ${response.status} - ${errorText}`)
      return NextResponse.json(
        {
          error: 'Failed to get response from assistant',
          debug: {
            status: response.status,
            gatewayResponse: errorText,
            gatewayUrl: GATEWAY_URL
          }
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Extract reply from Moltbot response structure
    const reply = data.result?.details?.reply ||
                  data.result?.reply ||
                  data.response ||
                  data.message ||
                  JSON.stringify(data)

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
