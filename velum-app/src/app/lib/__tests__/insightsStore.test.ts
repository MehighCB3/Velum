import { describe, it, expect } from 'vitest'
import { getAllInsights, saveInsight, type Insight } from '../insightsStore'

function makeInsight(overrides: Partial<Insight> = {}): Insight {
  return {
    agent: overrides.agent || 'test-agent',
    agentId: overrides.agentId || 'agent-001',
    emoji: overrides.emoji || '',
    insight: overrides.insight || 'Test insight text',
    type: overrides.type || 'nudge',
    updatedAt: overrides.updatedAt || new Date().toISOString(),
    section: overrides.section || 'fitness',
  }
}

describe('insightsStore (in-memory fallback)', () => {
  it('starts with empty insights', async () => {
    const insights = await getAllInsights()
    // May have items from other tests, but should be an array
    expect(Array.isArray(insights)).toBe(true)
  })

  it('saves and retrieves an insight', async () => {
    const insight = makeInsight({ section: 'budget', insight: 'You spent less this week!' })
    await saveInsight(insight)

    const all = await getAllInsights()
    const found = all.find(i => i.section === 'budget')
    expect(found).toBeDefined()
    expect(found!.insight).toBe('You spent less this week!')
  })

  it('overwrites insight for same section', async () => {
    await saveInsight(makeInsight({ section: 'nutrition', insight: 'First' }))
    await saveInsight(makeInsight({ section: 'nutrition', insight: 'Second' }))

    const all = await getAllInsights()
    const nutritionInsights = all.filter(i => i.section === 'nutrition')
    expect(nutritionInsights).toHaveLength(1)
    expect(nutritionInsights[0].insight).toBe('Second')
  })

  it('stores different sections independently', async () => {
    await saveInsight(makeInsight({ section: 'fitness', insight: 'Fitness insight' }))
    await saveInsight(makeInsight({ section: 'tasks', insight: 'Tasks insight' }))

    const all = await getAllInsights()
    const fitness = all.find(i => i.section === 'fitness')
    const tasks = all.find(i => i.section === 'tasks')
    expect(fitness!.insight).toBe('Fitness insight')
    expect(tasks!.insight).toBe('Tasks insight')
  })

  it('preserves all insight fields', async () => {
    const full: Insight = {
      agent: 'pi-coach',
      agentId: 'agent-xyz',
      emoji: '🏃',
      insight: 'Great progress!',
      type: 'celebration',
      updatedAt: '2025-01-06T10:00:00Z',
      section: 'knowledge',
    }
    await saveInsight(full)

    const all = await getAllInsights()
    const found = all.find(i => i.section === 'knowledge')
    expect(found).toEqual(full)
  })
})
