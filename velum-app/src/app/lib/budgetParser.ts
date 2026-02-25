/**
 * Shared budget message parser.
 * Used by /api/budget/webhook and /api/coach/chat to parse
 * natural-language expense entries (e.g. "15€ lunch food").
 */

import { inferBudgetCategory, type BudgetCategory } from './budgetCategories'

export interface ParsedExpense {
  amount: number
  description: string
  category: BudgetCategory
  week: number | null // null = current week
  reason?: string
}

/**
 * Parse expense messages from natural language.
 *
 * Supported formats:
 * - "15€ lunch food" → amount: 15, desc: lunch, category: Food
 * - "20€ drinks fun" → amount: 20, desc: drinks, category: Fun
 * - "25€ dinner food week 2" → with explicit week
 * - "30€ movie fun w3" → abbreviated week
 * - "40€ dinner food for team celebration" → with reason
 */
export function parseExpenseMessage(text: string): ParsedExpense | null {
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

  // Determine category — delegate to shared lib
  const category = inferBudgetCategory(remaining)

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
