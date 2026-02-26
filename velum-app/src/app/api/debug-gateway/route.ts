import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const GATEWAY_URL = process.env.GATEWAY_URL
  const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || process.env.GATEWAY_PASSWORD

  const report: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      GATEWAY_URL: GATEWAY_URL ? `${GATEWAY_URL.slice(0, 30)}...` : 'NOT SET',
      OPENCLAW_GATEWAY_TOKEN: GATEWAY_TOKEN ? `${GATEWAY_TOKEN.slice(0, 4)}...` : 'NOT SET',
    },
  }

  if (!GATEWAY_URL || !GATEWAY_TOKEN) {
    report.error = 'Missing env vars'
    return NextResponse.json(report)
  }

  const url = `${GATEWAY_URL}/tools/invoke`
  report.targetUrl = url

  try {
    const start = Date.now()
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        tool: 'sessions_send',
        args: {
          sessionKey: 'main',
          message: 'ping',
          timeoutSeconds: 15,
        },
      }),
      signal: AbortSignal.timeout(20000),
    })

    report.latencyMs = Date.now() - start
    report.httpStatus = response.status
    report.httpOk = response.ok

    const body = await response.text()
    try {
      report.body = JSON.parse(body)
    } catch {
      report.body = body.slice(0, 500)
    }
  } catch (err: unknown) {
    report.fetchError = err instanceof Error ? err.message : String(err)
  }

  return NextResponse.json(report)
}
