import {
  NutritionDay,
  NutritionEntry,
  NutritionGoals,
  FitnessWeek,
  FitnessEntry,
  BudgetWeek,
  BudgetEntry,
  BudgetCategory,
  Goal,
  GoalHorizon,
  normalizeGoal,
  SpanishCard,
  UserProfile,
  AgentInsight,
} from '../types';

// Base URL of the Velum web app API.
// In production this points to the Vercel deployment.
// For local development, point to localhost:3000.
const API_BASE = __DEV__
  ? 'http://localhost:3000'
  : 'https://velum-five.vercel.app';

// ==================== HTTP HELPERS ====================

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}/api${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API ${response.status}: ${body}`);
  }

  return response.json();
}

function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string] => entry[1] !== undefined,
  );
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries).toString();
}

// ==================== NUTRITION ====================

export const nutritionApi = {
  async getDay(date?: string): Promise<NutritionDay> {
    return request<NutritionDay>(`/nutrition${qs({ date })}`);
  },

  async addEntry(
    date: string,
    entry: Omit<NutritionEntry, 'date'>,
    goals?: NutritionGoals,
  ): Promise<NutritionDay> {
    return request<NutritionDay>('/nutrition', {
      method: 'POST',
      body: JSON.stringify({
        date,
        entries: [{ ...entry, date }],
        goals,
      }),
    });
  },

  async deleteEntry(date: string, entryId: string): Promise<NutritionDay> {
    return request<NutritionDay>(
      `/nutrition${qs({ date, entryId })}`,
      { method: 'DELETE' },
    );
  },

  async getWeek(date?: string): Promise<NutritionDay[]> {
    const res = await request<{ days?: NutritionDay[] }>(`/nutrition/week${qs({ date })}`);
    return res.days || [];
  },
};

// ==================== FITNESS ====================

export const fitnessApi = {
  async getWeek(week?: string): Promise<FitnessWeek> {
    return request<FitnessWeek>(`/fitness${qs({ week })}`);
  },

  async addEntry(
    entry: Partial<FitnessEntry> & { type: FitnessEntry['type'] },
    week?: string,
  ): Promise<FitnessWeek> {
    return request<FitnessWeek>('/fitness', {
      method: 'POST',
      body: JSON.stringify({ week, entry }),
    });
  },

  async updateGoals(
    goals: Partial<FitnessWeek['goals']>,
    week?: string,
  ): Promise<FitnessWeek> {
    return request<FitnessWeek>('/fitness', {
      method: 'POST',
      body: JSON.stringify({ week, goals }),
    });
  },

  async deleteEntry(
    entryId: string,
    week?: string,
  ): Promise<FitnessWeek> {
    return request<FitnessWeek>(
      `/fitness${qs({ week, entryId })}`,
      { method: 'DELETE' },
    );
  },
};

// ==================== BUDGET ====================

export const budgetApi = {
  async getWeek(week?: string): Promise<BudgetWeek> {
    return request<BudgetWeek>(`/budget${qs({ week })}`);
  },

  async addEntry(
    entry: {
      amount: number;
      category: BudgetCategory;
      description?: string;
      reason?: string;
      date?: string;
      time?: string;
    },
    week?: string,
  ): Promise<BudgetWeek> {
    return request<BudgetWeek>('/budget', {
      method: 'POST',
      body: JSON.stringify({ week, entry }),
    });
  },

  async deleteEntry(
    entryId: string,
    week?: string,
  ): Promise<BudgetWeek> {
    return request<BudgetWeek>(
      `/budget${qs({ week, entryId })}`,
      { method: 'DELETE' },
    );
  },
};

// ==================== GOALS ====================

export const goalsApi = {
  async getAll(horizon?: GoalHorizon): Promise<Goal[]> {
    const data = await request<{ goals: Record<string, unknown>[] }>(
      `/goals${qs({ horizon })}`,
    );
    return (data.goals || []).map(normalizeGoal);
  },

  async getById(id: string): Promise<Goal | null> {
    const data = await request<{ goal: Record<string, unknown> | null }>(
      `/goals${qs({ id })}`,
    );
    return data.goal ? normalizeGoal(data.goal) : null;
  },

  async create(goal: Partial<Goal>): Promise<Goal> {
    const data = await request<{ goal: Record<string, unknown> }>('/goals', {
      method: 'POST',
      body: JSON.stringify(goal),
    });
    return normalizeGoal(data.goal);
  },

  async updateProgress(
    id: string,
    currentValue: number,
  ): Promise<Goal> {
    const data = await request<{ goal: Record<string, unknown> }>('/goals', {
      method: 'PATCH',
      body: JSON.stringify({ id, currentValue }),
    });
    return normalizeGoal(data.goal);
  },

  async markComplete(id: string): Promise<Goal> {
    const data = await request<{ goal: Record<string, unknown> }>('/goals', {
      method: 'PATCH',
      body: JSON.stringify({ id, completed: true }),
    });
    return normalizeGoal(data.goal);
  },

  async remove(id: string): Promise<void> {
    await request(`/goals${qs({ id })}`, { method: 'DELETE' });
  },
};

// ==================== SPANISH ====================

export const spanishApi = {
  async getCards(): Promise<{ cards: SpanishCard[]; stats: Record<string, number> }> {
    return request('/spanish');
  },

  async getDueCards(): Promise<{ cards: SpanishCard[] }> {
    return request('/spanish?filter=due');
  },

  async reviewCard(
    cardId: string,
    result: 'again' | 'hard' | 'good' | 'easy',
  ): Promise<{ card: SpanishCard }> {
    return request('/spanish', {
      method: 'POST',
      body: JSON.stringify({ cardId, result }),
    });
  },
};

// ==================== PROFILE ====================

export const profileApi = {
  async get(): Promise<UserProfile | null> {
    const data = await request<{ profile: UserProfile | null }>('/profile');
    return data.profile;
  },

  async update(profile: {
    birthDate: string;
    country?: string;
    lifeExpectancy?: number;
  }): Promise<void> {
    await request('/profile', {
      method: 'POST',
      body: JSON.stringify(profile),
    });
  },
};

// ==================== INSIGHTS ====================

export const insightsApi = {
  async getAll(section?: string): Promise<AgentInsight[]> {
    const data = await request<AgentInsight[]>('/insights');
    return section ? data.filter((i) => i.section === section) : data;
  },
};
