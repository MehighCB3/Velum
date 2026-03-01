// ==================== NUTRITION ====================

export interface NutritionEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  time: string;
  date: string;
  photoUrl?: string;
}

export interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionDay {
  date: string;
  entries: NutritionEntry[];
  totals: NutritionGoals;
  goals: NutritionGoals;
}

// ==================== FITNESS ====================

export type FitnessEntryType =
  | 'steps'
  | 'run'
  | 'swim'
  | 'cycle'
  | 'jiujitsu'
  | 'gym'
  | 'other'
  | 'vo2max'
  | 'training_load'
  | 'stress'
  | 'recovery'
  | 'hrv'
  | 'weight'
  | 'body_fat';

export interface FitnessEntry {
  id: string;
  date: string;
  timestamp: string;
  type: FitnessEntryType;
  name?: string;
  steps?: number;
  distanceKm?: number;
  duration?: number;
  distance?: number;
  pace?: number;
  calories?: number;
  vo2max?: number;
  trainingLoad?: number;
  stressLevel?: number;
  recoveryScore?: number;
  hrv?: number;
  weight?: number;
  bodyFat?: number;
  notes?: string;
}

export interface FitnessWeekTotals {
  steps: number;
  runs: number;
  swims: number;
  cycles: number;
  jiujitsu: number;
  totalDistance: number;
  totalCalories: number;
  runDistance: number;
  swimDistance: number;
  cycleDistance: number;
}

export interface FitnessAdvanced {
  avgVo2max: number;
  totalTrainingLoad: number;
  avgStress: number;
  avgRecovery: number;
  recoveryStatus: 'good' | 'fair' | 'poor';
  latestHrv: number;
  latestWeight: number;
  latestBodyFat: number;
}

export interface FitnessWeek {
  week: string;
  entries: FitnessEntry[];
  totals: FitnessWeekTotals;
  goals: {
    steps: number;
    runs: number;
    swims: number;
  };
  advanced?: FitnessAdvanced;
}

// ==================== BUDGET ====================

export type BudgetCategory = 'Food' | 'Fun' | 'Transport' | 'Subscriptions' | 'Other';

export interface BudgetEntry {
  id: string;
  amount: number;
  category: BudgetCategory;
  description: string;
  date: string;
  timestamp: string;
  reason?: string;
}

export interface BudgetWeek {
  week: string;
  entries: BudgetEntry[];
  totalSpent: number;
  remaining: number;
  categories: Record<BudgetCategory, number>;
}

// ==================== GOALS ====================

export type GoalHorizon = 'year' | '3years' | '5years' | '10years' | 'bucket';

// Clean camelCase interface — normalizeGoal handles API translation
export interface Goal {
  id: string;
  title: string;
  area: string;
  objective: string;
  keyMetric: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  horizon: GoalHorizon;
  createdAt?: string;
  completedAt?: string;
}

// Normalize API response (Postgres returns snake_case) to clean camelCase
export function normalizeGoal(raw: Record<string, unknown>): Goal {
  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? ''),
    area: String(raw.area ?? ''),
    objective: String(raw.objective ?? ''),
    keyMetric: String(raw.keyMetric ?? raw.key_metric ?? ''),
    targetValue: Number(raw.targetValue ?? raw.target_value ?? 0),
    currentValue: Number(raw.currentValue ?? raw.current_value ?? 0),
    unit: String(raw.unit ?? ''),
    horizon: (raw.horizon as GoalHorizon) || 'year',
    createdAt: String(raw.createdAt ?? raw.created_at ?? ''),
    completedAt: raw.completedAt || raw.completed_at
      ? String(raw.completedAt ?? raw.completed_at)
      : undefined,
  };
}

// ==================== SPANISH ====================

export interface SpanishCard {
  id: string;
  spanish_word: string;
  english_translation: string;
  example_sentence_spanish: string;
  example_sentence_english: string;
  word_type: string;
  tags: string[];
  status: 'new' | 'learning' | 'review' | 'parked' | 'relearning';
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review: string;
  last_reviewed?: string;
}

export interface SpanishDeckStats {
  total: number;
  new: number;
  learning: number;
  review: number;
  dueToday: number;
}

// ==================== PROFILE ====================

export interface UserProfile {
  id?: number;
  birth_date: string;
  country?: string;
  life_expectancy: number;
  ageInWeeks?: number;
  totalWeeks?: number;
  weeksRemaining?: number;
  currentAge?: number;
  percentLived?: number;
  yearsRemaining?: number;
}

// ==================== INSIGHTS ====================

export interface AgentInsight {
  agent: string;
  agentId: string;
  emoji: string;
  insight: string;
  type: 'nudge' | 'alert' | 'celebration';
  updatedAt: string;
  section: 'nutrition' | 'fitness' | 'budget' | 'tasks' | 'knowledge';
}

// ==================== BOOKS / KNOWLEDGE ====================

export interface BookPrinciple {
  id: string;
  domain: string;
  title: string;
  principle: string;
  source: string;
  actionPrompt: string;
}

export interface RawCapture {
  id: string;
  domain: string;
  text: string;
  source: string;
  type: 'quote' | 'passage' | 'note';
}

export interface DailyWisdom {
  currentDomain: string;
  domainIndex: number;
  totalDomains: number;
  weekPrinciple: BookPrinciple;
  contextInsight: string;
  rawCapture: RawCapture;
  allDomains: string[];
  source: 'notion' | 'seed';
}

// ==================== AVATAR ====================

export type BondLevel = 1 | 2 | 3 | 4 | 5;
export type AvatarExpression = 'neutral' | 'curious' | 'happy' | 'proud' | 'glowing';

export interface AvatarParams {
  warmth: number;
  energy: number;
  expression: AvatarExpression;
  glow: number;
}

export interface BondInfo {
  score: number;
  level: BondLevel;
  label: string;
  streak: number;
}

export interface HealthSnapshot {
  weight: number | null;
  bodyFat: number | null;
  vo2max: number | null;
  hrv: number | null;
  sleepHours: number | null;
  sleepScore: number | null;
  stressAvg: number | null;
  recoveryAvg: number | null;
  trainingLoad: number | null;
  stepsToday: number | null;
  stepsGoal: number;
  runsThisWeek: number;
  runsGoal: number;
  caloriesToday: number | null;
  caloriesGoal: number;
  proteinToday: number | null;
  proteinGoal: number;
  budgetSpent: number | null;
  budgetTotal: number;
}

export interface AvatarState {
  bond: BondInfo;
  avatarParams: AvatarParams;
  health: HealthSnapshot;
  insights: AgentInsight[];
  greeting: string;
}

// ==================== SYNC ====================

export interface SyncStatus {
  lastSynced: string | null;
  isSyncing: boolean;
  isOnline: boolean;
  pendingChanges: number;
}

export interface PendingChange {
  id: string;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  createdAt: string;
}

// ==================== CHAT / COACH ====================

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
  timestamp?: string;
  source?: string;
}

export interface ChatResponse {
  content: string;
  source: string;
  memoriesSaved?: number;
  logged?: { type: 'fitness' | 'budget'; summary: string };
}
