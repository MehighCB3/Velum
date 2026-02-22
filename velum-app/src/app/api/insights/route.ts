import { NextRequest, NextResponse } from 'next/server'
import { getAllInsights, saveInsight, type Insight } from '../../lib/insightsStore'

export const dynamic = 'force-dynamic'

const INSIGHTS_API_KEY = process.env.INSIGHTS_API_KEY || ''

export async function GET() {
  try {
    const insights = await getAllInsights()
    return NextResponse.json(insights)
  } catch (error) {
    console.error('GET insights error:', error)
    return NextResponse.json({ error: 'Failed to load insights' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate — require Bearer token when INSIGHTS_API_KEY is set.
    // Reject writes if the key is not configured in production to prevent
    // unauthenticated data injection.
    if (!INSIGHTS_API_KEY) {
      console.error('INSIGHTS_API_KEY is not set — rejecting unauthenticated write')
      return NextResponse.json({ error: 'Insights API key not configured' }, { status: 503 })
    }
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (token !== INSIGHTS_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { agent, agentId, emoji, insight, type, section } = body

    if (!agent || !agentId || !insight || !section) {
      return NextResponse.json(
        { error: 'Missing required fields: agent, agentId, insight, section' },
        { status: 400 }
      )
    }

    const entry: Insight = {
      agent,
      agentId,
      emoji: emoji || '',
      insight,
      type: type || 'nudge',
      updatedAt: new Date().toISOString(),
      section,
    }

    await saveInsight(entry)

    return NextResponse.json({ success: true, insight: entry })
  } catch (error) {
    console.error('POST insights error:', error)
    return NextResponse.json({ error: 'Failed to save insight' }, { status: 500 })
  }
}
