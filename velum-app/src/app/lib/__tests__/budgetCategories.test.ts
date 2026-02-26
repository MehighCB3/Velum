import { describe, it, expect } from 'vitest'
import { inferBudgetCategory, BUDGET_CATEGORIES } from '../budgetCategories'

describe('BUDGET_CATEGORIES', () => {
  it('contains exactly 5 categories', () => {
    expect(BUDGET_CATEGORIES).toHaveLength(5)
  })

  it('includes expected categories', () => {
    expect(BUDGET_CATEGORIES).toContain('Food')
    expect(BUDGET_CATEGORIES).toContain('Fun')
    expect(BUDGET_CATEGORIES).toContain('Transport')
    expect(BUDGET_CATEGORIES).toContain('Subscriptions')
    expect(BUDGET_CATEGORIES).toContain('Other')
  })
})

describe('inferBudgetCategory', () => {
  describe('Transport', () => {
    const transportWords = ['uber', 'taxi', 'metro', 'bus', 'train', 'fuel', 'parking', 'bolt']
    for (const word of transportWords) {
      it(`classifies "${word}" as Transport`, () => {
        expect(inferBudgetCategory(word)).toBe('Transport')
      })
    }
  })

  describe('Subscriptions', () => {
    const subWords = ['netflix', 'spotify', 'amazon prime', 'gym membership']
    for (const word of subWords) {
      it(`classifies "${word}" as Subscriptions`, () => {
        expect(inferBudgetCategory(word)).toBe('Subscriptions')
      })
    }
  })

  describe('Fun', () => {
    const funWords = ['drinks', 'bar', 'beer', 'cinema', 'movie', 'concert', 'party']
    for (const word of funWords) {
      it(`classifies "${word}" as Fun`, () => {
        expect(inferBudgetCategory(word)).toBe('Fun')
      })
    }
  })

  describe('Food', () => {
    const foodWords = ['lunch', 'dinner', 'breakfast', 'groceries', 'coffee', 'mercadona', 'pizza']
    for (const word of foodWords) {
      it(`classifies "${word}" as Food`, () => {
        expect(inferBudgetCategory(word)).toBe('Food')
      })
    }
  })

  describe('priority order', () => {
    it('Transport beats Food (e.g. "uber eats")', () => {
      // transport regex is tested first
      expect(inferBudgetCategory('uber eats')).toBe('Transport')
    })
  })

  describe('fallback', () => {
    it('returns Other for unrecognized text', () => {
      expect(inferBudgetCategory('random stuff')).toBe('Other')
    })

    it('returns Other for empty string', () => {
      expect(inferBudgetCategory('')).toBe('Other')
    })
  })
})
