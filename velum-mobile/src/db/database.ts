import * as SQLite from 'expo-sqlite';
import { PendingChange } from '../types';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('velum.db');
  await initializeSchema(db);
  return db;
}

async function initializeSchema(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    -- Nutrition entries cache
    CREATE TABLE IF NOT EXISTS nutrition_entries (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      name TEXT NOT NULL,
      calories INTEGER DEFAULT 0,
      protein REAL DEFAULT 0,
      carbs REAL DEFAULT 0,
      fat REAL DEFAULT 0,
      time TEXT NOT NULL,
      synced INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_nutrition_date ON nutrition_entries(date);

    -- Nutrition goals cache
    CREATE TABLE IF NOT EXISTS nutrition_goals (
      date TEXT PRIMARY KEY,
      calories INTEGER DEFAULT 2000,
      protein INTEGER DEFAULT 150,
      carbs INTEGER DEFAULT 200,
      fat INTEGER DEFAULT 65
    );

    -- Fitness entries cache
    CREATE TABLE IF NOT EXISTS fitness_entries (
      id TEXT PRIMARY KEY,
      week TEXT NOT NULL,
      date TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT,
      data_json TEXT,
      synced INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_fitness_week ON fitness_entries(week);

    -- Budget entries cache
    CREATE TABLE IF NOT EXISTS budget_entries (
      id TEXT PRIMARY KEY,
      week TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      reason TEXT,
      synced INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_budget_week ON budget_entries(week);

    -- Goals cache
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      area TEXT NOT NULL,
      objective TEXT,
      key_metric TEXT,
      target_value REAL DEFAULT 0,
      current_value REAL DEFAULT 0,
      unit TEXT,
      horizon TEXT DEFAULT 'year',
      created_at TEXT,
      completed_at TEXT,
      synced INTEGER DEFAULT 0
    );

    -- Spanish cards cache
    CREATE TABLE IF NOT EXISTS spanish_cards (
      id TEXT PRIMARY KEY,
      spanish_word TEXT NOT NULL,
      english_translation TEXT NOT NULL,
      example_sentence_spanish TEXT,
      example_sentence_english TEXT,
      word_type TEXT,
      tags_json TEXT,
      status TEXT DEFAULT 'new',
      ease_factor REAL DEFAULT 2.5,
      interval INTEGER DEFAULT 0,
      repetitions INTEGER DEFAULT 0,
      next_review TEXT,
      last_reviewed TEXT,
      synced INTEGER DEFAULT 0
    );

    -- Profile cache
    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY DEFAULT 1,
      birth_date TEXT,
      country TEXT,
      life_expectancy INTEGER DEFAULT 85
    );

    -- Pending changes queue (offline sync)
    CREATE TABLE IF NOT EXISTS pending_changes (
      id TEXT PRIMARY KEY,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      body_json TEXT,
      params_json TEXT,
      created_at TEXT NOT NULL
    );

    -- Sync metadata
    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

// ==================== PENDING CHANGES (OFFLINE QUEUE) ====================

export async function addPendingChange(change: PendingChange): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO pending_changes (id, endpoint, method, body_json, params_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    change.id,
    change.endpoint,
    change.method,
    change.body ? JSON.stringify(change.body) : null,
    change.params ? JSON.stringify(change.params) : null,
    change.createdAt,
  );
}

export async function getPendingChanges(): Promise<PendingChange[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    id: string;
    endpoint: string;
    method: string;
    body_json: string | null;
    params_json: string | null;
    created_at: string;
  }>('SELECT * FROM pending_changes ORDER BY created_at ASC');

  return rows.map((row) => ({
    id: row.id,
    endpoint: row.endpoint,
    method: row.method as PendingChange['method'],
    body: row.body_json ? JSON.parse(row.body_json) : undefined,
    params: row.params_json ? JSON.parse(row.params_json) : undefined,
    createdAt: row.created_at,
  }));
}

export async function removePendingChange(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM pending_changes WHERE id = ?', id);
}

export async function getPendingChangeCount(): Promise<number> {
  const database = await getDatabase();
  const result = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM pending_changes',
  );
  return result?.count ?? 0;
}

// ==================== SYNC METADATA ====================

export async function setSyncMeta(key: string, value: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)',
    key,
    value,
  );
}

export async function getSyncMeta(key: string): Promise<string | null> {
  const database = await getDatabase();
  const result = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_meta WHERE key = ?',
    key,
  );
  return result?.value ?? null;
}

// ==================== NUTRITION CACHE ====================

export async function cacheNutritionDay(
  date: string,
  entries: Array<{
    id: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    time: string;
  }>,
  goals: { calories: number; protein: number; carbs: number; fat: number },
): Promise<void> {
  const database = await getDatabase();

  // Clear existing entries for date
  await database.runAsync('DELETE FROM nutrition_entries WHERE date = ?', date);

  // Insert new entries
  for (const entry of entries) {
    await database.runAsync(
      `INSERT OR REPLACE INTO nutrition_entries (id, date, name, calories, protein, carbs, fat, time, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      entry.id,
      date,
      entry.name,
      entry.calories,
      entry.protein,
      entry.carbs,
      entry.fat,
      entry.time,
    );
  }

  // Cache goals
  await database.runAsync(
    `INSERT OR REPLACE INTO nutrition_goals (date, calories, protein, carbs, fat)
     VALUES (?, ?, ?, ?, ?)`,
    date,
    goals.calories,
    goals.protein,
    goals.carbs,
    goals.fat,
  );
}

export async function getCachedNutritionDay(date: string): Promise<{
  entries: Array<{
    id: string;
    date: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    time: string;
  }>;
  goals: { calories: number; protein: number; carbs: number; fat: number };
} | null> {
  const database = await getDatabase();

  const entries = await database.getAllAsync<{
    id: string;
    date: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    time: string;
  }>('SELECT * FROM nutrition_entries WHERE date = ? ORDER BY time', date);

  const goals = await database.getFirstAsync<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>('SELECT * FROM nutrition_goals WHERE date = ?', date);

  if (entries.length === 0 && !goals) return null;

  return {
    entries,
    goals: goals || { calories: 2000, protein: 150, carbs: 200, fat: 65 },
  };
}

// ==================== FITNESS CACHE ====================

export async function cacheFitnessWeek(
  week: string,
  entries: Array<Record<string, unknown>>,
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM fitness_entries WHERE week = ?', week);

  for (const entry of entries) {
    await database.runAsync(
      `INSERT OR REPLACE INTO fitness_entries (id, week, date, timestamp, type, name, data_json, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      entry.id as string,
      week,
      entry.date as string,
      entry.timestamp as string,
      entry.type as string,
      (entry.name as string) || null,
      JSON.stringify(entry),
    );
  }
}

// ==================== BUDGET CACHE ====================

export async function cacheBudgetWeek(
  week: string,
  entries: Array<{
    id: string;
    amount: number;
    category: string;
    description: string;
    date: string;
    timestamp: string;
    reason?: string;
  }>,
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM budget_entries WHERE week = ?', week);

  for (const entry of entries) {
    await database.runAsync(
      `INSERT OR REPLACE INTO budget_entries (id, week, amount, category, description, date, timestamp, reason, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      entry.id,
      week,
      entry.amount,
      entry.category,
      entry.description,
      entry.date,
      entry.timestamp,
      entry.reason || null,
    );
  }
}

// ==================== GOALS CACHE ====================

export async function cacheGoals(
  goals: Array<Record<string, unknown>>,
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM goals');

  for (const goal of goals) {
    await database.runAsync(
      `INSERT OR REPLACE INTO goals (id, title, area, objective, key_metric, target_value, current_value, unit, horizon, created_at, completed_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      (goal.id as string) || '',
      (goal.title as string) || '',
      (goal.area as string) || '',
      (goal.objective as string) || '',
      (goal.keyMetric as string) || (goal.key_metric as string) || '',
      Number(goal.targetValue ?? goal.target_value ?? 0),
      Number(goal.currentValue ?? goal.current_value ?? 0),
      (goal.unit as string) || '',
      (goal.horizon as string) || 'year',
      (goal.createdAt as string) || (goal.created_at as string) || '',
      (goal.completedAt as string) || (goal.completed_at as string) || null,
    );
  }
}
