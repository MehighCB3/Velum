/**
 * Shared budget category definitions.
 *
 * Single source of truth — used by both the budget webhook parser and the
 * budget API route. Keeps category keyword matching in sync so that the
 * Telegram Budgy bot and the OpenClaw budget agent classify expenses the
 * same way.
 *
 * The skill file (skills/budget/SKILL.md) references these same category
 * names — if you add a category here, update that file too.
 */

export type BudgetCategory = 'Food' | 'Fun' | 'Transport' | 'Subscriptions' | 'Other'

export const BUDGET_CATEGORIES: BudgetCategory[] = [
  'Food',
  'Fun',
  'Transport',
  'Subscriptions',
  'Other',
]

/**
 * Infer a budget category from free-form expense text.
 * Tests patterns in priority order; falls back to "Other".
 */
export function inferBudgetCategory(text: string): BudgetCategory {
  const t = text.toLowerCase()

  if (/\b(transport|uber|taxi|metro|bus|train|fuel|gas|parking|bolt|cabify|renfe|tram)\b/.test(t)) {
    return 'Transport'
  }

  if (/\b(sub(?:scription)?|netflix|spotify|amazon|prime|apple|google|gym\s*membership|monthly|annual|membership)\b/.test(t)) {
    return 'Subscriptions'
  }

  if (/\b(fun|drinks?|bar|beer|wine|cocktail|cinema|movie|concert|show|entertainment|party|fiesta|club|disco)\b/.test(t)) {
    return 'Fun'
  }

  if (/\b(food|eat|lunch|dinner|breakfast|meal|restaurant|cafe|coffee|groceries?|supermarket|mercadona|carrefour|lidl|aldi|croissant|bocadillo|tapas|pizza|burger|sushi)\b/.test(t)) {
    return 'Food'
  }

  return 'Other'
}
