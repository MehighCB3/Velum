import { NextRequest, NextResponse } from 'next/server'

const GATEWAY_URL = process.env.GATEWAY_URL || 'https://rasppi5.tail5b3227.ts.net'
const GATEWAY_PASSWORD = process.env.GATEWAY_PASSWORD

export async function POST(request: NextRequest) {
  try {
    const { message, context } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
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

    // Build the message with context if provided
    const fullMessage = context
      ? `Context: ${context}\n\nUser: ${message}`
      : message

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
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Gateway error: ${response.status} - ${errorText}`)
      return NextResponse.json(
        { error: 'Failed to get response from assistant' },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Extract reply from Moltbot response structure
    const reply = data.result?.details?.reply ||
                  data.result?.reply ||
                  data.response ||
                  data.message ||
                  data.content ||
                  'No response received'

    return NextResponse.json({
      content: reply,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
