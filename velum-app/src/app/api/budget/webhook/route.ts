import { NextRequest, NextResponse } from 'next/server'
import { getISOWeek } from '../../../lib/weekUtils'

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
    
    console.log('Budget webhook received:', messageText)
    
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
    
    // Create entry
    const entry = {
      amount: parsed.amount,
      category: parsed.category,
      description: parsed.description,
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      reason: parsed.reason
    }
    
    // Call the budget API to save
    const budgetApiUrl = new URL('/api/budget', request.url)
    const response = await fetch(budgetApiUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week: weekKey, entry })
    })
    
    if (!response.ok) {
      throw new Error('Failed to save to budget API')
    }
    
    const savedData = await response.json()
    
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