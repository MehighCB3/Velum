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
  storage?: string;
}

// ==================== FITNESS ====================

export type FitnessEntryType =
  | 'steps'
  | 'run'
  | 'swim'
  | 'cycle'
  | 'jiujitsu'
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
  storage?: string;
}

// ==================== BUDGET ====================

export type BudgetCategory = 'Food' | 'Fun';

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
  storage?: string;
}

// ==================== GOALS ====================

export type GoalHorizon = 'year' | '3years' | '5years' | '10years' | 'bucket';

export interface Goal {
  id: string;
  title: string;
  area: string;
  objective: string;
  keyMetric: string;
  key_metric?: string;
  targetValue: number;
  target_value?: number;
  currentValue: number;
  current_value?: number;
  unit: string;
  horizon: GoalHorizon;
  createdAt?: string;
  created_at?: string;
  completedAt?: string;
  completed_at?: string;
}

// Normalize Postgres snake_case to camelCase
export function normalizeGoal(raw: Record<string, unknown>): Goal {
  return {
    id: (raw.id as string) || '',
    title: (raw.title as string) || '',
    area: (raw.area as string) || '',
    objective: (raw.objective as string) || '',
    keyMetric: (raw.keyMetric as string) || (raw.key_metric as string) || '',
    targetValue: Number(raw.targetValue ?? raw.target_value ?? 0),
    currentValue: Number(raw.currentValue ?? raw.current_value ?? 0),
    unit: (raw.unit as string) || '',
    horizon: (raw.horizon as GoalHorizon) || 'year',
    createdAt: (raw.createdAt as string) || (raw.created_at as string) || '',
    completedAt: (raw.completedAt as string) || (raw.completed_at as string) || undefined,
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
