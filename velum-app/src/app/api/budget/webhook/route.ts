import { NextRequest, NextResponse } from 'next/server'
import { getISOWeek, parseWeekKey } from '../../../lib/weekUtils'
import { addBudgetEntry, BudgetEntry, Category } from '../../../lib/budgetStore'
import { saveInsight } from '../../../lib/insightsStore'
import { generateAIInsight } from '../../../lib/aiInsights'
import { parseExpenseMessage } from '../../../lib/budgetParser'

export const dynamic = 'force-dynamic'

// Budget webhook handler for Telegram "Budgy" topic
// parseExpenseMessage imported from shared lib/budgetParser

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET

function getWeekKeyForBudget(weekNum: number | null): string {
  const now = new Date()
  const year = now.getFullYear()

  if (weekNum) {
    return `${year}-W${String(weekNum).padStart(2, '0')}`
  }

  const weekNumber = getISOWeek(now)
  return `${year}-W${String(weekNumber).padStart(2, '0')}`
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret — REQUIRED in production
    const secret = request.headers.get('x-webhook-secret')
    if (!WEBHOOK_SECRET) {
      console.error('TELEGRAM_WEBHOOK_SECRET is not set — rejecting webhook request')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
    }
    if (secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Extract message text from Telegram format
    const messageText = body.message?.text || body.text

    if (!messageText) {
      return NextResponse.json({ error: 'No message text' }, { status: 400 })
    }

    // Topic detection — same multi-level pattern as fitness webhook
    const topicName =
      body.message?.forum_topic_created?.name ||
      body.message?.reply_to_message?.forum_topic_created?.name ||
      body.message?.reply_to_message?.reply_to_message?.forum_topic_created?.name ||
      body.message?.message_thread_name ||
      body.topic_name // OpenClaw may set this when forwarding

    const BUDGY_THREAD_ID = process.env.BUDGY_THREAD_ID
      ? parseInt(process.env.BUDGY_THREAD_ID)
      : null

    const isBudgyTopic =
      topicName === 'Budgy' ||
      messageText.toLowerCase().includes('#budgy') ||
      messageText.toLowerCase().startsWith('budgy:') ||
      (BUDGY_THREAD_ID !== null && body.message?.message_thread_id === BUDGY_THREAD_ID)

    if (!isBudgyTopic) {
      return NextResponse.json({
        ignored: true,
        reason: 'Message not in Budgy topic or missing #budgy tag',
      })
    }

    // Parse the expense
    const parsed = parseExpenseMessage(messageText)
    if (!parsed) {
      return NextResponse.json({ 
        error: 'Could not parse expense. Format: "15€ lunch food week 2"',
        received: messageText
      }, { status: 400 })
    }
    
    // Get week key
    const weekKey = getWeekKeyForBudget(parsed.week)

    // Derive the correct entry date from the week key so past-week entries
    // (e.g. "15€ lunch food week 2") land on the Monday of that week, not today.
    const entryDate = parsed.week
      ? parseWeekKey(weekKey).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]

    // Create entry and save directly to storage — eliminates the
    // self-referencing fetch that was causing Vercel serverless timeouts
    const entry: BudgetEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      amount: parsed.amount,
      category: parsed.category as Category,
      description: parsed.description,
      date: entryDate,
      timestamp: new Date().toISOString(),
      reason: parsed.reason
    }

    const savedData = await addBudgetEntry(weekKey, entry)

    // ==================== PUSH INSIGHT TO BUDGY AGENT ====================
    // Non-blocking: don't fail the webhook if insight push fails.
    try {
      const contextLines = [
        `Expense logged: €${parsed.amount} ${parsed.description} (${parsed.category})`,
        `Week: ${weekKey}`,
        `Total spent this week: €${savedData.totalSpent?.toFixed(2) ?? parsed.amount}`,
        `Remaining budget: €${savedData.remaining?.toFixed(2) ?? 'unknown'}`,
      ]
      if (parsed.reason) contextLines.push(`Reason: ${parsed.reason}`)

      const aiResult = await generateAIInsight(contextLines.join('\n'), 'Budgy')
      if (aiResult) {
        await saveInsight({
          agent: 'Budgy',
          agentId: 'budget-agent',
          emoji: '💰',
          insight: aiResult.insight,
          type: aiResult.type,
          updatedAt: new Date().toISOString(),
          section: 'budget',
        })
      }
    } catch (insightErr) {
      console.warn('Failed to push budget insight:', insightErr)
    }

    return NextResponse.json({
      success: true,
      message: `✅ Logged: €${parsed.amount} ${parsed.description} (${parsed.category}) - Week ${parsed.week || 'current'}${parsed.reason ? ` for "${parsed.reason}"` : ''}`,
      data: {
        amount: parsed.amount,
        description: parsed.description,
        category: parsed.category,
        week: weekKey,
        remaining: savedData.remaining,
        totalSpent: savedData.totalSpent,
        reason: parsed.reason
      }
    })
    
  } catch (error) {
    console.error('Budget webhook error:', error)
    return NextResponse.json({
      error: 'Failed to process expense',
    }, { status: 500 })
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ 
    status: 'Budget webhook ready',
    examples: [
      '15€ lunch food week 2',
      '20€ drinks fun',
      '25€ dinner food',
      '30€ movie fun w3',
      '40€ dinner food for team celebration',
      '12€ coffee food for energy boost'
    ]
  })
}