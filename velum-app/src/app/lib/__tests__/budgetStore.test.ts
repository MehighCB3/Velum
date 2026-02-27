import { describe, it, expect } from 'vitest'
import {
  calculateWeekData,
  readFromFallback,
  writeToFallback,
  WEEKLY_BUDGET,
  CATEGORIES,
  type BudgetEntry,
  type Category,
} from '../budgetStore'

function makeEntry(overrides: Partial<BudgetEntry> = {}): BudgetEntry {
  return {
    id: overrides.id || `test-${Date.now()}`,
    amount: overrides.amount ?? 10,
    category: overrides.category || 'Food',
    description: overrides.description || 'test item',
    date: overrides.date || '2025-01-06',
    timestamp: overrides.timestamp || new Date().toISOString(),
    reason: overrides.reason,
  }
}

describe('WEEKLY_BUDGET', () => {
  it('is 70', () => {
    expect(WEEKLY_BUDGET).toBe(70)
  })
})

describe('CATEGORIES', () => {
  it('has all five categories initialized to zero', () => {
    expect(Object.keys(CATEGORIES)).toEqual(['Food', 'Fun', 'Transport', 'Subscriptions', 'Other'])
    for (const val of Object.values(CATEGORIES)) {
      expect(val).toBe(0)
    }
  })
})

describe('calculateWeekData', () => {
  const week = '2025-W02'

  it('returns empty data for no entries', () => {
    const result = calculateWeekData(week, [])
    expect(result.week).toBe(week)
    expect(result.entries).toHaveLength(0)
    expect(result.totalSpent).toBe(0)
    expect(result.remaining).toBe(WEEKLY_BUDGET)
    expect(result.categories).toEqual({ Food: 0, Fun: 0, Transport: 0, Subscriptions: 0, Other: 0 })
  })

  it('sums entries by category', () => {
    const entries: BudgetEntry[] = [
      makeEntry({ id: '1', amount: 15, category: 'Food' }),
      makeEntry({ id: '2', amount: 8, category: 'Food' }),
      makeEntry({ id: '3', amount: 12, category: 'Fun' }),
      makeEntry({ id: '4', amount: 5, category: 'Transport' }),
    ]
    const result = calculateWeekData(week, entries)
    expect(result.totalSpent).toBe(40)
    expect(result.remaining).toBe(30)
    expect(result.categories.Food).toBe(23)
    expect(result.categories.Fun).toBe(12)
    expect(result.categories.Transport).toBe(5)
    expect(result.categories.Subscriptions).toBe(0)
    expect(result.categories.Other).toBe(0)
  })

  it('handles negative remaining (over budget)', () => {
    const entries: BudgetEntry[] = [
      makeEntry({ id: '1', amount: 50, category: 'Food' }),
      makeEntry({ id: '2', amount: 30, category: 'Fun' }),
    ]
    const result = calculateWeekData(week, entries)
    expect(result.totalSpent).toBe(80)
    expect(result.remaining).toBe(-10)
  })

  it('handles decimal amounts', () => {
    const entries: BudgetEntry[] = [
      makeEntry({ id: '1', amount: 4.5, category: 'Food' }),
      makeEntry({ id: '2', amount: 3.75, category: 'Transport' }),
    ]
    const result = calculateWeekData(week, entries)
    expect(result.totalSpent).toBeCloseTo(8.25, 2)
  })
})

describe('fallback storage', () => {
  it('returns empty week for unknown key', () => {
    const data = readFromFallback('8888-W01')
    expect(data.week).toBe('8888-W01')
    expect(data.entries).toHaveLength(0)
    expect(data.remaining).toBe(WEEKLY_BUDGET)
  })

  it('round-trips data through write/read', () => {
    const week = '8888-W02'
    const entries = [makeEntry({ id: 'rt-1', amount: 20, category: 'Fun' })]
    const data = calculateWeekData(week, entries)
    writeToFallback(week, data)

    const read = readFromFallback(week)
    expect(read.week).toBe(week)
    expect(read.entries).toHaveLength(1)
    expect(read.totalSpent).toBe(20)
  })

  it('overwrites existing data on write', () => {
    const week = '8888-W03'
    const data1 = calculateWeekData(week, [makeEntry({ id: '1', amount: 10 })])
    writeToFallback(week, data1)
    expect(readFromFallback(week).totalSpent).toBe(10)

    const data2 = calculateWeekData(week, [makeEntry({ id: '2', amount: 25 })])
    writeToFallback(week, data2)
    expect(readFromFallback(week).totalSpent).toBe(25)
  })
})
