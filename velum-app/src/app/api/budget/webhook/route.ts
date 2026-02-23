import { NextRequest, NextResponse } from 'next/server'
import { getISOWeek, parseWeekKey } from '../../../lib/weekUtils'
import { addBudgetEntry, BudgetEntry, Category } from '../../../lib/budgetStore'
import { saveInsight } from '../../../lib/insightsStore'
import { generateAIInsight } from '../../../lib/aiInsights'

export const dynamic = 'force-dynamic'

// Budget webhook handler for Telegram "Budgy" topic
// Parses messages like: "15€ lunch food week 2" or "20€ drinks fun"

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET

interface ParsedExpense {
  amount: number
  description: string
  category: 'Food' | 'Fun' | 'Transport' | 'Subscriptions' | 'Other'
  week: number | null // null = current week
  reason?: string
}

function parseExpenseMessage(text: string): ParsedExpense | null {
  // Patterns:
  // "15€ lunch food week 2" -> amount: 15, desc: lunch, category: Food, week: 2
  // "20€ drinks fun" -> amount: 20, desc: drinks, category: Fun, week: current
  // "25€ dinner food" -> amount: 25, desc: dinner, category: Food, week: current
  // "30€ movie fun w3" -> amount: 30, desc: movie, category: Fun, week: 3
  // "40€ dinner food for team celebration" -> reason: "team celebration"
  
  // Extract amount (€ symbol or just number at start)
  const amountMatch = text.match(/^(\d+(?:\.\d{1,2})?)\s*(?:€|eur|euros?)?/i)
  if (!amountMatch) return null
  
  const amount = parseFloat(amountMatch[1])
  let remaining = text.slice(amountMatch[0].length).trim()
  
  // Extract reason (after "for" or similar keywords)
  let reason: string | undefined
  const reasonMatch = remaining.match(/\b(?:for|because|reason)\s+(.+)$/i)
  if (reasonMatch) {
    reason = reasonMatch[1].trim()
    remaining = remaining.replace(reasonMatch[0], '').trim()
  }
  
  // Extract week if specified
  let week: number | null = null
  const weekMatch = remaining.match(/\b(?:week|w)\s*(\d{1,2})\b/i)
  if (weekMatch) {
    week = parseInt(weekMatch[1])
    remaining = remaining.replace(weekMatch[0], '').trim()
  }
  
  // Determine category
  let category: ParsedExpense['category']
  if (/\b(?:transport|uber|taxi|metro|bus|train|fuel|gas|parking)\b/i.test(remaining)) {
    category = 'Transport'
  } else if (/\b(?:sub|subscription|netflix|spotify|gym\s*membership|monthly|annual)\b/i.test(remaining)) {
    category = 'Subscriptions'
  } else if (/\b(?:food|eat|lunch|dinner|breakfast|meal|restaurant|groceries|mercadona|carrefour)\b/i.test(remaining)) {
    category = 'Food'
  } else if (/\b(?:fun|drink|bar|movie|game|entertainment|concert|party)\b/i.test(remaining)) {
    category = 'Fun'
  } else if (/\b(?:other)\b/i.test(remaining)) {
    category = 'Other'
  } else {
    // Default to Food if contains eating keywords, otherwise Other
    category = /\b(?:lunch|dinner|breakfast|coffee|snack)\b/i.test(remaining) ? 'Food' : 'Other'
  }
  
  // Clean up description (remove category words for cleaner description)
  let description = remaining
    .replace(/\b(?:food|fun|transport|subscriptions|other)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!description) {
    description = `${category} expense`
  }
  
  return { amount, description, category, week, reason }
}

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
    // Verify webhook secret when configured
    if (WEBHOOK_SECRET) {
      const secret = request.headers.get('x-webhook-secret')
      if (secret !== WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
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

    console.log('Budget webhook received:', messageText, 'Topic:', topicName)
    
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
      details: error instanceof Error ? error.message : 'Unknown error'
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