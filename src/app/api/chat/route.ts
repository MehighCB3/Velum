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

    // Create stable session key for this user
    const sessionUser = userId ? `velum:${userId}` : 'velum:anonymous'

    const response = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GATEWAY_PASSWORD}`,
        'Content-Type': 'application/json',
        'x-moltbot-agent-id': 'main'
      },
      body: JSON.stringify({
        model: 'moltbot',
        user: sessionUser,
        stream: true,
        messages: messages
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

    // Stream the response back to the client
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
