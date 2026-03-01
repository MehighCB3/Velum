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
  ChatMessage,
  ChatResponse,
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

  async getWeek(): Promise<NutritionDay[]> {
    return request<NutritionDay[]>('/nutrition/week');
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

// ==================== COACH / CHAT ====================

export interface CoachMessage {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
  timestamp?: string;
}

export interface StreamingCallbacks {
  onTyping?: () => void;
  onChunk?: (chunk: string, fullText: string) => void;
  onDone?: (response: ChatResponse) => void;
  onError?: (error: Error) => void;
}

export const coachApi = {
  /**
   * Send a message to the coach with streaming support.
   * For optimistic UI, add the user message to the UI before calling this.
   * 
   * @param message - The user message
   * @param opts - Optional context, agent, and streaming callbacks
   * @returns Promise that resolves when streaming is complete
   */
  async sendMessage(
    message: string,
    opts?: {
      context?: string;
      agent?: string;
      stream?: boolean;
    } & StreamingCallbacks
  ): Promise<ChatResponse> {
    const { onTyping, onChunk, onDone, onError, ...apiOpts } = opts || {};
    const useStreaming = apiOpts.stream !== false; // Default to streaming

    const url = `${API_BASE}/api/coach/chat`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          ...apiOpts,
          stream: useStreaming,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API ${response.status}: ${errorText}`);
      }

      // Handle streaming response
      if (useStreaming && response.headers.get('content-type')?.includes('stream')) {
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body for streaming');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';
        let finalSource = 'gateway';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.trim()) continue;
            
            try {
              const event = JSON.parse(line);
              
              switch (event.type) {
                case 'status':
                  if (event.status === 'typing' && onTyping) {
                    onTyping();
                  }
                  break;
                case 'chunk':
                  fullContent = event.content || '';
                  if (onChunk) {
                    onChunk(event.content || '', fullContent);
                  }
                  break;
                case 'done':
                  finalSource = event.source || 'gateway';
                  fullContent = event.content || fullContent;
                  break;
                case 'error':
                  throw new Error(event.error || 'Streaming error');
              }
            } catch (parseErr) {
              console.warn('[coachApi] Failed to parse stream chunk:', line);
            }
          }
        }

        const result: ChatResponse = {
          content: fullContent,
          source: finalSource,
        };

        if (onDone) {
          onDone(result);
        }

        return result;
      }

      // Non-streaming response
      const data: ChatResponse = await response.json();
      
      if (onDone) {
        onDone(data);
      }
      
      return data;
    } catch (error) {
      console.error('[coachApi] sendMessage error:', error);
      if (onError && error instanceof Error) {
        onError(error);
      }
      throw error;
    }
  },

  /**
   * Send message without streaming - for simple use cases
   */
  async sendMessageSimple(
    message: string,
    opts?: { context?: string; agent?: string }
  ): Promise<ChatResponse> {
    return this.sendMessage(message, { ...opts, stream: false });
  },
};
