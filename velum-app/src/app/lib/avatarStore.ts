/**
 * Avatar relationship engine.
 * Computes a bond score (0–100) from engagement signals already in the system,
 * and maps it to avatar visual parameters for the mobile SVG component.
 */

import { loadWeek as loadFitnessWeek, getWeekKey, FitnessWeek } from './fitnessStore'
import { loadWeek as loadBudgetWeek, WeekData as BudgetWeek } from './budgetStore'
import { getSessionMessages } from './sessionStore'
import { getAllInsights, Insight } from './insightsStore'
import { getWeekDates } from './weekUtils'

// ==================== TYPES ====================

export type BondLevel = 1 | 2 | 3 | 4 | 5
export type Expression = 'neutral' | 'curious' | 'happy' | 'proud' | 'glowing'

export interface AvatarParams {
  warmth: number    // 0–1
  energy: number    // 0–1
  expression: Expression
  glow: number      // 0–1
}

export interface BondInfo {
  score: number     // 0–100
  level: BondLevel  // 1–5
  label: string
  streak: number
}

export interface HealthSnapshot {
  weight: number | null
  bodyFat: number | null
  vo2max: number | null
  hrv: number | null
  sleepHours: number | null
  sleepScore: number | null
  stressAvg: number | null
  recoveryAvg: number | null
  trainingLoad: number | null
  stepsToday: number | null
  stepsGoal: number
  runsThisWeek: number
  runsGoal: number
  caloriesToday: number | null
  caloriesGoal: number
  proteinToday: number | null
  proteinGoal: number
  budgetSpent: number | null
  budgetTotal: number
}

export interface AvatarState {
  bond: BondInfo
  avatarParams: AvatarParams
  health: HealthSnapshot
  insights: Insight[]
  greeting: string
}

// ==================== BOND LEVEL LABELS ====================

const BOND_LABELS: Record<BondLevel, string> = {
  1: 'Stranger',
  2: 'Acquaintance',
  3: 'Friend',
  4: 'Partner',
  5: 'Bonded',
}

// ==================== SIGNAL WEIGHTS ====================

const WEIGHTS = {
  loggingFrequency: 0.30,
  goalAdherence: 0.25,
  conversationEngagement: 0.15,
  streak: 0.20,
  dataCompleteness: 0.10,
}

// ==================== SCORING FUNCTIONS ====================

/**
 * Count how many of the last 7 days had at least one entry
 * across fitness, nutrition, or budget.
 */
function computeLoggingFrequency(
  fitnessWeek: FitnessWeek,
  budgetWeek: BudgetWeek,
  nutritionDates: Set<string>,
): number {
  const datesWithEntries = new Set<string>()

  for (const entry of fitnessWeek.entries) {
    datesWithEntries.add(entry.date)
  }
  for (const entry of budgetWeek.entries) {
    datesWithEntries.add(entry.date)
  }
  for (const date of nutritionDates) {
    datesWithEntries.add(date)
  }

  return Math.min(datesWithEntries.size / 7, 1)
}

/**
 * Compute goal adherence as % of goals at >=80% completion.
 */
function computeGoalAdherence(
  fitnessWeek: FitnessWeek,
  caloriesToday: number | null,
  caloriesGoal: number,
  proteinToday: number | null,
  proteinGoal: number,
): number {
  const checks: boolean[] = []

  // Fitness goals
  const stepsRatio = fitnessWeek.totals.steps / fitnessWeek.goals.steps
  checks.push(stepsRatio >= 0.8)

  const runsRatio = fitnessWeek.totals.runs / fitnessWeek.goals.runs
  checks.push(runsRatio >= 0.8)

  const swimsRatio = fitnessWeek.totals.swims / fitnessWeek.goals.swims
  checks.push(swimsRatio >= 0.8)

  // Nutrition goals (if data available)
  if (caloriesToday !== null && caloriesGoal > 0) {
    const calRatio = caloriesToday / caloriesGoal
    checks.push(calRatio >= 0.7 && calRatio <= 1.2)
  }
  if (proteinToday !== null && proteinGoal > 0) {
    checks.push(proteinToday / proteinGoal >= 0.8)
  }

  if (checks.length === 0) return 0
  return checks.filter(Boolean).length / checks.length
}

/**
 * Map message count from last 7 days to a 0–1 score.
 * 0 messages = 0, 5+ messages = 0.5, 15+ messages = 1.0
 */
function computeConversationEngagement(messageCount: number): number {
  if (messageCount <= 0) return 0
  if (messageCount >= 15) return 1
  return Math.min(messageCount / 15, 1)
}

/**
 * Count consecutive days with logged data, capped at 14.
 */
function computeStreak(
  fitnessWeek: FitnessWeek,
  budgetWeek: BudgetWeek,
  nutritionDates: Set<string>,
): number {
  const today = new Date()
  let streak = 0

  for (let i = 0; i < 14; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]

    const hasFitness = fitnessWeek.entries.some(e => e.date === dateStr)
    const hasBudget = budgetWeek.entries.some(e => e.date === dateStr)
    const hasNutrition = nutritionDates.has(dateStr)

    if (hasFitness || hasBudget || hasNutrition) {
      streak++
    } else {
      break
    }
  }

  return streak
}

/**
 * Check how many advanced metric types were logged this week.
 * Types: HRV, sleep, VO2max, recovery
 */
function computeDataCompleteness(fitnessWeek: FitnessWeek): number {
  const advancedTypes = new Set<string>()
  for (const entry of fitnessWeek.entries) {
    if (entry.type === 'hrv') advancedTypes.add('hrv')
    if (entry.type === 'sleep') advancedTypes.add('sleep')
    if (entry.type === 'vo2max') advancedTypes.add('vo2max')
    if (entry.type === 'recovery') advancedTypes.add('recovery')
  }
  return Math.min(advancedTypes.size / 4, 1)
}

// ==================== BOND COMPUTATION ====================

export function computeBondScore(signals: {
  loggingFrequency: number
  goalAdherence: number
  conversationEngagement: number
  streak: number
  dataCompleteness: number
}): number {
  const streakNormalized = Math.min(signals.streak / 14, 1)

  const raw =
    signals.loggingFrequency * WEIGHTS.loggingFrequency +
    signals.goalAdherence * WEIGHTS.goalAdherence +
    signals.conversationEngagement * WEIGHTS.conversationEngagement +
    streakNormalized * WEIGHTS.streak +
    signals.dataCompleteness * WEIGHTS.dataCompleteness

  return Math.round(raw * 100)
}

export function getBondLevel(score: number): BondLevel {
  if (score <= 20) return 1
  if (score <= 40) return 2
  if (score <= 60) return 3
  if (score <= 80) return 4
  return 5
}

export function getAvatarParams(score: number, level: BondLevel): AvatarParams {
  const t = score / 100 // 0–1

  const expressions: Expression[] = ['neutral', 'curious', 'happy', 'proud', 'glowing']

  return {
    warmth: t,
    energy: Math.min(t * 1.2, 1),
    expression: expressions[level - 1],
    glow: level >= 3 ? (t - 0.4) / 0.6 : 0,
  }
}

// ==================== GREETING GENERATION ====================

function generateGreeting(level: BondLevel, hour: number): string {
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  const greetings: Record<BondLevel, string[]> = {
    1: [
      `Good ${timeOfDay}. I'm here when you need me.`,
      `Hello. Let's get started.`,
    ],
    2: [
      `Good ${timeOfDay}. What are we working on today?`,
      `Hey. Ready when you are.`,
    ],
    3: [
      `Good ${timeOfDay}! How are you feeling today?`,
      `Hey! Let's check in on how things are going.`,
    ],
    4: [
      `Good ${timeOfDay}! Great to see you back. Let's keep the momentum.`,
      `Hey! You've been consistent — that's showing in the numbers.`,
    ],
    5: [
      `Good ${timeOfDay}! We're in a great rhythm together. What's on your mind?`,
      `Hey! Your consistency is inspiring. Let's make today count.`,
    ],
  }

  const options = greetings[level]
  return options[Math.floor(Math.random() * options.length)]
}

// ==================== HEALTH SNAPSHOT ====================

function buildHealthSnapshot(
  fitnessWeek: FitnessWeek,
  budgetWeek: BudgetWeek,
  nutritionTotals: { calories: number; protein: number } | null,
  nutritionGoals: { calories: number; protein: number },
): HealthSnapshot {
  const adv = fitnessWeek.advanced

  return {
    weight: adv?.latestWeight || null,
    bodyFat: adv?.latestBodyFat || null,
    vo2max: adv?.avgVo2max || null,
    hrv: adv?.latestHrv || null,
    sleepHours: adv?.avgSleepHours || null,
    sleepScore: adv?.avgSleepScore || null,
    stressAvg: adv?.avgStress || null,
    recoveryAvg: adv?.avgRecovery || null,
    trainingLoad: adv?.totalTrainingLoad || null,
    stepsToday: fitnessWeek.totals.steps || null,
    stepsGoal: fitnessWeek.goals.steps,
    runsThisWeek: fitnessWeek.totals.runs,
    runsGoal: fitnessWeek.goals.runs,
    caloriesToday: nutritionTotals?.calories ?? null,
    caloriesGoal: nutritionGoals.calories,
    proteinToday: nutritionTotals?.protein ?? null,
    proteinGoal: nutritionGoals.protein,
    budgetSpent: budgetWeek.totalSpent || null,
    budgetTotal: 70,
  }
}

// ==================== MAIN FUNCTION ====================

/**
 * Compute full avatar state by aggregating data from all existing stores.
 * This is the single function called by the API route.
 */
export async function getAvatarState(
  nutritionData?: { totals: { calories: number; protein: number }; goals: { calories: number; protein: number }; dates: string[] } | null,
): Promise<AvatarState> {
  const now = new Date()
  const weekKey = getWeekKey(now)

  // Fetch data from existing stores in parallel
  const [fitnessWeek, budgetWeek, mainMessages, insights] = await Promise.all([
    loadFitnessWeek(weekKey),
    loadBudgetWeek(weekKey),
    getSessionMessages('main'),
    getAllInsights(),
  ])

  // Count messages from last 7 days
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentMessages = mainMessages.filter(m => {
    const ts = new Date(m.timestamp)
    return ts >= sevenDaysAgo && m.role === 'user'
  })

  // Nutrition dates for streak/logging (passed from route since nutrition has no shared store)
  const nutritionDates = new Set(nutritionData?.dates || [])

  // Compute signals
  const loggingFrequency = computeLoggingFrequency(fitnessWeek, budgetWeek, nutritionDates)
  const goalAdherence = computeGoalAdherence(
    fitnessWeek,
    nutritionData?.totals.calories ?? null,
    nutritionData?.goals.calories ?? 2600,
    nutritionData?.totals.protein ?? null,
    nutritionData?.goals.protein ?? 160,
  )
  const conversationEngagement = computeConversationEngagement(recentMessages.length)
  const streak = computeStreak(fitnessWeek, budgetWeek, nutritionDates)
  const dataCompleteness = computeDataCompleteness(fitnessWeek)

  // Compute bond
  const score = computeBondScore({
    loggingFrequency,
    goalAdherence,
    conversationEngagement,
    streak,
    dataCompleteness,
  })
  const level = getBondLevel(score)
  const avatarParams = getAvatarParams(score, level)

  // Build health snapshot
  const health = buildHealthSnapshot(
    fitnessWeek,
    budgetWeek,
    nutritionData ? { calories: nutritionData.totals.calories, protein: nutritionData.totals.protein } : null,
    { calories: nutritionData?.goals.calories ?? 2600, protein: nutritionData?.goals.protein ?? 160 },
  )

  return {
    bond: {
      score,
      level,
      label: BOND_LABELS[level],
      streak,
    },
    avatarParams,
    health,
    insights,
    greeting: generateGreeting(level, now.getHours()),
  }
}
