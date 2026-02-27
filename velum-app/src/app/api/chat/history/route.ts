import { NextRequest, NextResponse } from 'next/server'
import { getFullHistory, clearSession } from '../../../lib/sessionStore'

export const dynamic = 'force-dynamic'

// GET /api/chat/history?sessionKey=main&limit=50
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionKey = searchParams.get('sessionKey') || 'main'
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const messages = await getFullHistory(sessionKey, limit)

    return NextResponse.json({
      messages,
      sessionKey,
      total: messages.length,
      returned: messages.length,
    })
  } catch (error) {
    console.error('Chat history GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch chat history' }, { status: 500 })
  }
}

// DELETE /api/chat/history?sessionKey=main — clear session cache (Postgres archive preserved)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionKey = searchParams.get('sessionKey') || 'main'

    await clearSession(sessionKey)
    return NextResponse.json({ cleared: true, sessionKey })
  } catch (error) {
    console.error('Chat history DELETE error:', error)
    return NextResponse.json({ error: 'Failed to clear chat history' }, { status: 500 })
  }
}
