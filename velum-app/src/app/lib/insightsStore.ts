import { redis, useRedis } from './redis'

export interface Insight {
  agent: string
  agentId: string
  emoji: string
  insight: string
  type: 'nudge' | 'alert' | 'celebration'
  updatedAt: string
  section: 'nutrition' | 'fitness' | 'budget' | 'tasks' | 'knowledge'
}

// In-memory fallback
const fallbackStore = new Map<string, Insight>()

const REDIS_KEY = 'insights'

export async function getAllInsights(): Promise<Insight[]> {
  if (useRedis) {
    try {
      const data = await redis!.get<Record<string, Insight>>(REDIS_KEY)
      if (data) return Object.values(data)
    } catch (error) {
      console.error('Redis insights read error:', error)
    }
  }
  return Array.from(fallbackStore.values())
}

export async function saveInsight(insight: Insight): Promise<void> {
  // Write to Redis
  if (useRedis) {
    try {
      const existing = await redis!.get<Record<string, Insight>>(REDIS_KEY) || {}
      existing[insight.section] = insight
      await redis!.set(REDIS_KEY, existing)
    } catch (error) {
      console.error('Redis insights write error:', error)
    }
  }

  // Always write to fallback too
  fallbackStore.set(insight.section, insight)
}
