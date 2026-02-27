/**
 * Shared nutrition message parser.
 * Used by /api/coach/chat to parse natural-language food entries
 * (e.g. "had chicken and rice for lunch", "ate 2 eggs for breakfast").
 *
 * Returns a food description string that can be looked up via FatSecret.
 * Does NOT do the lookup itself — callers handle that.
 */

export interface ParsedNutritionEntry {
  foodDescription: string
  mealHint?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  date?: string
}

// Patterns that indicate someone is logging food
const ATE_RE = /\b(?:i\s+)?(?:ate|had|eating|just\s+ate|just\s+had|logged?)\b/i
const MEAL_RE = /\b(?:for\s+)?(?:breakfast|lunch|dinner|snack|brunch|supper)\b/i
const FOOD_LOGGING_RE = /\b(?:ate|had|eating|breakfast|lunch|dinner|snack|log\s+(?:my\s+)?(?:food|meal|lunch|dinner|breakfast))\b/i

// Meal time detection
const MEAL_HINT_RE = /\b(breakfast|lunch|dinner|snack|brunch|supper)\b/i

// Common non-food words to strip
const STRIP_WORDS = /\b(?:for|my|today|just|had|ate|eating|i|and|with|some|a|the|about|around|log|logged)\b/gi

/**
 * Parse a chat message for food logging intent.
 * Returns null if the message doesn't appear to be logging food.
 */
export function parseNutritionMessage(text: string): ParsedNutritionEntry | null {
  const lower = text.toLowerCase().trim()

  // Must match food-logging intent
  if (!FOOD_LOGGING_RE.test(lower)) return null

  // Don't match questions about food or meal suggestions
  if (/\b(?:what\s+should|suggest|recommend|recipe|how\s+many|how\s+much)\b/i.test(lower)) return null

  // Extract meal hint
  const mealMatch = lower.match(MEAL_HINT_RE)
  const mealHint = mealMatch
    ? (mealMatch[1] === 'brunch' ? 'breakfast' : mealMatch[1] === 'supper' ? 'dinner' : mealMatch[1]) as ParsedNutritionEntry['mealHint']
    : undefined

  // Extract food description by stripping noise words
  let food = text
    .replace(MEAL_RE, '')
    .replace(STRIP_WORDS, '')
    .replace(/[,.]$/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  // If nothing meaningful remains, skip
  if (food.length < 3) return null

  // Extract date if mentioned (yesterday, etc.)
  let date: string | undefined
  if (/\byesterday\b/i.test(lower)) {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    date = d.toISOString().split('T')[0]
    food = food.replace(/\byesterday\b/i, '').trim()
  }

  return {
    foodDescription: food,
    mealHint,
    date,
  }
}

/**
 * Estimate the time string for a meal.
 */
export function mealTimeEstimate(hint?: ParsedNutritionEntry['mealHint']): string {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const currentTime = `${hh}:${mm}`

  if (!hint) return currentTime

  switch (hint) {
    case 'breakfast': return '08:30'
    case 'lunch': return '13:00'
    case 'dinner': return '20:00'
    case 'snack': return currentTime
    default: return currentTime
  }
}
