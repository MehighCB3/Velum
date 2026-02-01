import { NextRequest, NextResponse } from 'next/server'

const GATEWAY_URL = process.env.GATEWAY_URL || 'https://rasppi5.tail5b3227.ts.net'
const GATEWAY_PASSWORD = process.env.GATEWAY_PASSWORD

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { message, context } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Build diagnostics
    const diagnostics: any = {
      env_check: {
        GATEWAY_URL_SET: !!process.env.GATEWAY_URL,
        GATEWAY_URL_VALUE: GATEWAY_URL,
        GATEWAY_PASSWORD_SET: !!GATEWAY_PASSWORD,
        GATEWAY_PASSWORD_LENGTH: GATEWAY_PASSWORD?.length || 0,
      }
    }

    if (!GATEWAY_PASSWORD) {
      return NextResponse.json(
        { 
          error: 'Gateway not configured - GATEWAY_PASSWORD missing',
          diagnostics
        },
        { status: 500 }
      )
    }

    // Build the message with context if provided
    const fullMessage = context
      ? `[Velum] Context: ${context}\n\nUser: ${message}`
      : `[Velum] ${message}`

    diagnostics.message = {
      original: message,
      full: fullMessage,
      length: fullMessage.length
    }

    // Try to connect to gateway
    let fetchResult: any = {}
    try {
      const fetchStart = Date.now()
      // Try sessions_send instead of agent_send (correct OpenClaw tool)
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
      
      fetchResult = {
        status: response.status,
        statusText: response.statusText,
        duration: Date.now() - fetchStart,
        headers: Object.fromEntries(response.headers.entries())
      }
      
      diagnostics.fetch = fetchResult

      if (!response.ok) {
        const errorText = await response.text()
        fetchResult.errorBody = errorText.substring(0, 500)
        
        return NextResponse.json(
          { 
            error: `Gateway error: ${response.status}`,
            diagnostics
          },
          { status: response.status }
        )
      }

      const data = await response.json()
      
      return NextResponse.json({
        content: data.response || data.message || data.content || 'No response received',
        diagnostics: {
          ...diagnostics,
          total_duration: Date.now() - startTime,
          gateway_response_type: typeof data
        }
      })
      
    } catch (fetchError) {
      fetchResult.error = fetchError instanceof Error ? {
        name: fetchError.name,
        message: fetchError.message,
        stack: fetchError.stack?.substring(0, 500)
      } : 'Unknown error'
      
      diagnostics.fetch = fetchResult
      
      return NextResponse.json(
        { 
          error: 'Failed to connect to gateway',
          diagnostics
        },
        { status: 500 }
      )
    }
    
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Internal server error',
        errorDetails: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
