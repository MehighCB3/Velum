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
  AvatarState,
  DailyWisdom,
  BookPrinciple,
} from '../types';

import { API_BASE } from './config';

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
    const [allData, progressData] = await Promise.all([
      request<{ cards: SpanishCard[] }>('/spanish?action=all'),
      request<{ stats: Record<string, number>; reviewedToday: number }>(
        '/spanish?action=progress',
      ),
    ]);
    return { cards: allData.cards || [], stats: progressData.stats || {} };
  },

  async getDueCards(limit = 20): Promise<{ cards: SpanishCard[]; total: number }> {
    return request(`/spanish?action=due&limit=${limit}`);
  },

  async reviewCard(
    cardId: string,
    result: 'again' | 'hard' | 'good' | 'easy',
  ): Promise<{ success: boolean; nextReview: string; interval: number }> {
    return request('/spanish', {
      method: 'POST',
      body: JSON.stringify({ action: 'review', cardId, result }),
    });
  },

  async parkCard(cardId: string): Promise<{ success: boolean }> {
    return request('/spanish', {
      method: 'POST',
      body: JSON.stringify({ action: 'park', cardId }),
    });
  },

  async unparkCard(cardId: string): Promise<{ success: boolean }> {
    return request('/spanish', {
      method: 'POST',
      body: JSON.stringify({ action: 'unpark', cardId }),
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

// ==================== QUICK LOG ====================

export type QuickLogType = 'steps' | 'expense' | 'meal' | 'weight';

export const quickLogApi = {
  async log(entry: {
    type: QuickLogType;
    value?: number;
    description?: string;
    category?: string;
  }): Promise<{ success: boolean }> {
    return request('/quick-log', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  },
};

// ==================== CHAT ====================

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  content: string;
  source: string;
  memoriesSaved?: number;
}

export const chatApi = {
  /** Send a message to the OpenClaw gateway.
   *  @param agent  One of 'main' | 'nutry' | 'booky' | 'espanol' | 'budgy'.
   *                Defaults to 'main' on the server when omitted.
   */
  async send(
    message: string,
    opts?: { context?: string; agent?: string },
  ): Promise<ChatResponse> {
    return request<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, ...opts }),
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

// ==================== AVATAR ====================

export const avatarApi = {
  async getState(): Promise<AvatarState> {
    return request<AvatarState>('/avatar');
  },
};

// ==================== BOOKS / KNOWLEDGE ====================

export const booksApi = {
  async getDaily(): Promise<DailyWisdom> {
    return request<DailyWisdom>('/books?action=daily');
  },

  async getDomains(): Promise<{ domains: string[] }> {
    return request('/books?action=domains');
  },

  async getPrinciples(domain?: string): Promise<{ principles: BookPrinciple[] }> {
    const q = domain ? `?action=principles&domain=${encodeURIComponent(domain)}` : '?action=principles';
    return request(`/books${q}`);
  },

  async getCaptures(): Promise<{ captures: Array<{ id: string; domain: string; text: string; source: string; type: string }> }> {
    return request('/books?action=captures');
  },
};

// ==================== BOOKMARKS ====================

export interface XBookmark {
  id: string;
  tweet_id: string;
  author_handle: string;
  author_name: string;
  text: string;
  url: string;
  tags: string[];
  created_at: string;
  bookmarked_at: string;
  dismissed: boolean;
}

export const bookmarksApi = {
  async getAll(opts?: { limit?: number; offset?: number; all?: boolean }): Promise<{
    bookmarks: XBookmark[];
    total: number;
    active: number;
  }> {
    const params = new URLSearchParams();
    if (opts?.limit) params.set('limit', String(opts.limit));
    if (opts?.offset) params.set('offset', String(opts.offset));
    if (opts?.all) params.set('all', 'true');
    const qs = params.toString();
    return request(`/bookmarks${qs ? `?${qs}` : ''}`);
  },

  async dismiss(tweetId: string): Promise<{ success: boolean }> {
    return request('/bookmarks', {
      method: 'PATCH',
      body: JSON.stringify({ tweet_id: tweetId, dismissed: true }),
    });
  },

  async undismiss(tweetId: string): Promise<{ success: boolean }> {
    return request('/bookmarks', {
      method: 'PATCH',
      body: JSON.stringify({ tweet_id: tweetId, dismissed: false }),
    });
  },

};

