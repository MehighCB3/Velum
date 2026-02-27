/**
 * Shared agent routing logic.
 * Determines which OpenClaw agent should handle a message based on keywords.
 *
 * Used by: /api/chat, /api/coach/chat, and the mobile coach screen.
 */

export type AgentId = 'main' | 'nutry' | 'budgy' | 'booky' | 'espanol'

export const NUTRITION_RE = /eat|ate|food|meal|calorie|protein|carb|fat|breakfast|lunch|dinner|snack|cook|recipe|hungry|diet|macro|pizza|chicken|rice|egg|salad|fruit/i
export const BUDGET_RE = /spent|expense|cost|paid|pay|buy|bought|€|euro|budget|money|cash|bill|invoice|price/i
export const FITNESS_RE = /workout|run|swim|cycle|step|sleep|weight|vo2|hrv|stress|recovery|training|bjj|jiu|gym|exercise/i
export const LEARNING_RE = /spanish|book|read|learn|wisdom|principle|flashcard|conjugat|vocab/i

/**
 * Detect which agent should handle a message.
 * Returns the agent ID for routing to OpenClaw.
 */
export function detectAgent(message: string): AgentId {
  if (NUTRITION_RE.test(message)) return 'nutry'
  if (BUDGET_RE.test(message)) return 'budgy'
  if (FITNESS_RE.test(message)) return 'main' // Fitness routes through main for now
  return 'main'
}

export const VALID_AGENTS: AgentId[] = ['main', 'nutry', 'booky', 'espanol', 'budgy']
