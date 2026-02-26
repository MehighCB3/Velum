import { describe, it, expect } from 'vitest'
import { parseExpenseMessage } from '../budgetParser'

describe('parseExpenseMessage', () => {
  describe('basic parsing', () => {
    it('parses "15€ lunch food"', () => {
      const result = parseExpenseMessage('15€ lunch food')
      expect(result).not.toBeNull()
      expect(result!.amount).toBe(15)
      expect(result!.category).toBe('Food')
    })

    it('parses "20€ drinks fun"', () => {
      const result = parseExpenseMessage('20€ drinks fun')
      expect(result).not.toBeNull()
      expect(result!.amount).toBe(20)
      expect(result!.category).toBe('Fun')
    })

    it('parses amount without € symbol', () => {
      const result = parseExpenseMessage('30 taxi transport')
      expect(result).not.toBeNull()
      expect(result!.amount).toBe(30)
      expect(result!.category).toBe('Transport')
    })

    it('parses decimal amounts', () => {
      const result = parseExpenseMessage('12.50€ coffee food')
      expect(result).not.toBeNull()
      expect(result!.amount).toBe(12.50)
    })
  })

  describe('category inference', () => {
    it('infers Food for food-related words', () => {
      const result = parseExpenseMessage('15€ groceries')
      expect(result!.category).toBe('Food')
    })

    it('infers Transport for transport-related words', () => {
      const result = parseExpenseMessage('8€ uber')
      expect(result!.category).toBe('Transport')
    })

    it('infers Subscriptions for subscription words', () => {
      const result = parseExpenseMessage('15€ netflix subscription')
      expect(result!.category).toBe('Subscriptions')
    })

    it('infers Fun for entertainment words', () => {
      const result = parseExpenseMessage('25€ cinema')
      expect(result!.category).toBe('Fun')
    })

    it('defaults to Other for unknown text', () => {
      const result = parseExpenseMessage('50€ random stuff')
      expect(result!.category).toBe('Other')
    })
  })

  describe('week extraction', () => {
    it('extracts explicit week number', () => {
      const result = parseExpenseMessage('25€ dinner food week 2')
      expect(result!.week).toBe(2)
    })

    it('extracts abbreviated week', () => {
      const result = parseExpenseMessage('30€ movie fun w3')
      expect(result!.week).toBe(3)
    })

    it('defaults to null week when not specified', () => {
      const result = parseExpenseMessage('15€ lunch food')
      expect(result!.week).toBeNull()
    })
  })

  describe('reason extraction', () => {
    it('extracts reason after "for"', () => {
      const result = parseExpenseMessage('40€ dinner food for team celebration')
      expect(result!.reason).toBe('team celebration')
    })

    it('no reason when not specified', () => {
      const result = parseExpenseMessage('15€ lunch food')
      expect(result!.reason).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    it('returns null for non-numeric start', () => {
      expect(parseExpenseMessage('hello world')).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(parseExpenseMessage('')).toBeNull()
    })

    it('generates description from category when text is empty', () => {
      const result = parseExpenseMessage('15€ food')
      expect(result!.description).toBeTruthy()
    })
  })
})
