import { NextRequest, NextResponse } from 'next/server'

const GATEWAY_URL = process.env.GATEWAY_URL || 'https://rasppi5.tail5b3227.ts.net'
const GATEWAY_PASSWORD = process.env.GATEWAY_PASSWORD

export async function GET(request: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    env: {
      GATEWAY_URL_SET: !!process.env.GATEWAY_URL,
      GATEWAY_URL_VALUE: GATEWAY_URL,
      GATEWAY_PASSWORD_SET: !!GATEWAY_PASSWORD,
      GATEWAY_PASSWORD_LENGTH: GATEWAY_PASSWORD?.length || 0,
    },
    tests: {}
  }
  
  // Test 1: DNS resolution
  try {
    const dnsStart = Date.now()
    const dnsResponse = await fetch(`https://dns.google/resolve?name=rasppi5.tail5b3227.ts.net&type=A`, {
      signal: AbortSignal.timeout(5000)
    })
    const dnsData = await dnsResponse.json()
    results.tests.dns = {
      success: true,
      duration: Date.now() - dnsStart,
      data: dnsData
    }
  } catch (error) {
    results.tests.dns = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
  
  // Test 2: Gateway ping (health check)
  try {
    const pingStart = Date.now()
    const pingResponse = await fetch(`${GATEWAY_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000)
    })
    results.tests.ping = {
      success: pingResponse.ok,
      status: pingResponse.status,
      duration: Date.now() - pingStart
    }
  } catch (error) {
    results.tests.ping = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
  
  // Test 3: Gateway tools/invoke (without auth)
  try {
    const authStart = Date.now()
    const authResponse = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'test', args: {} }),
      signal: AbortSignal.timeout(10000)
    })
    results.tests.invoke_no_auth = {
      success: authResponse.ok,
      status: authResponse.status,
      statusText: authResponse.statusText,
      duration: Date.now() - authStart
    }
  } catch (error) {
    results.tests.invoke_no_auth = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
  
  // Test 4: Gateway tools/invoke (with auth)
  if (GATEWAY_PASSWORD) {
    try {
      const fullAuthStart = Date.now()
      const fullAuthResponse = await fetch(`${GATEWAY_URL}/tools/invoke`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GATEWAY_PASSWORD}`
        },
        body: JSON.stringify({ 
          tool: 'agent_send', 
          args: { message: '[Velum:diagnostic] Test message' }
        }),
        signal: AbortSignal.timeout(30000)
      })
      const responseText = await fullAuthResponse.text()
      results.tests.invoke_with_auth = {
        success: fullAuthResponse.ok,
        status: fullAuthResponse.status,
        statusText: fullAuthResponse.statusText,
        duration: Date.now() - fullAuthStart,
        responseLength: responseText.length,
        responsePreview: responseText.substring(0, 200)
      }
    } catch (error) {
      results.tests.invoke_with_auth = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  return NextResponse.json(results)
}
