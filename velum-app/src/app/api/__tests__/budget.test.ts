/**
 * Integration tests for /api/budget route handlers.
 * Tests run against in-memory fallback storage (no Postgres needed).
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, DELETE } from '../budget/route'
import { writeToFallback, calculateWeekData, type BudgetEntry } from '../../lib/budgetStore'

const BASE_URL = 'http://localhost:3000'

function makeRequest(path: string, options?: { method?: string; body?: string }): NextRequest {
  return new NextRequest(`${BASE_URL}${path}`, options)
}

async function json(response: Response) {
  return response.json()
}

// Use a unique week key for test isolation
const TEST_WEEK = '2099-W01'

describe('GET /api/budget', () => {
  beforeEach(() => {
    // Reset storage for this week
    writeToFallback(TEST_WEEK, calculateWeekData(TEST_WEEK, []))
  })

  it('returns empty data for a week with no entries', async () => {
    const res = await GET(makeRequest(`/api/budget?week=${TEST_WEEK}`))
    const data = await json(res)

    expect(res.status).toBe(200)
    expect(data.entries).toHaveLength(0)
    expect(data.totals.spent).toBe(0)
    expect(data.totals.budget).toBe(70)
    expect(data.totals.remaining).toBe(70)
    expect(data.storage).toBe('fallback')
  })

  it('returns data for a week with entries', async () => {
    const entries: BudgetEntry[] = [
      { id: 'e1', amount: 15, category: 'Food', description: 'Lunch', date: '2099-01-01', timestamp: '' },
    ]
    writeToFallback(TEST_WEEK, calculateWeekData(TEST_WEEK, entries))

    const res = await GET(makeRequest(`/api/budget?week=${TEST_WEEK}`))
    const data = await json(res)

    expect(data.entries).toHaveLength(1)
    expect(data.totals.spent).toBe(15)
    expect(data.totals.remaining).toBe(55)
  })

  it('accepts date param to resolve week', async () => {
    const res = await GET(makeRequest('/api/budget?date=2025-01-06'))
    expect(res.status).toBe(200)
    const data = await json(res)
    expect(data.totals).toBeDefined()
  })
})

describe('POST /api/budget', () => {
  beforeEach(() => {
    writeToFallback(TEST_WEEK, calculateWeekData(TEST_WEEK, []))
  })

  it('adds an entry successfully', async () => {
    const res = await POST(makeRequest('/api/budget', {
      method: 'POST',
      body: JSON.stringify({
        week: TEST_WEEK,
        entry: { amount: 12, category: 'Food', description: 'Coffee' },
      }),
    }))
    const data = await json(res)

    expect(res.status).toBe(200)
    expect(data.entries).toHaveLength(1)
    expect(data.totalSpent).toBe(12)
    expect(data.storage).toBe('fallback')
  })

  it('rejects entry without amount', async () => {
    const res = await POST(makeRequest('/api/budget', {
      method: 'POST',
      body: JSON.stringify({
        week: TEST_WEEK,
        entry: { category: 'Food', description: 'No amount' },
      }),
    }))
    expect(res.status).toBe(400)
  })

  it('rejects entry without category', async () => {
    const res = await POST(makeRequest('/api/budget', {
      method: 'POST',
      body: JSON.stringify({
        week: TEST_WEEK,
        entry: { amount: 10, description: 'No category' },
      }),
    }))
    expect(res.status).toBe(400)
  })

  it('rejects invalid category', async () => {
    const res = await POST(makeRequest('/api/budget', {
      method: 'POST',
      body: JSON.stringify({
        week: TEST_WEEK,
        entry: { amount: 10, category: 'InvalidCat', description: 'Bad cat' },
      }),
    }))
    expect(res.status).toBe(400)
    const data = await json(res)
    expect(data.error).toContain('Category must be')
  })

  it('accumulates multiple entries', async () => {
    await POST(makeRequest('/api/budget', {
      method: 'POST',
      body: JSON.stringify({ week: TEST_WEEK, entry: { amount: 10, category: 'Food', description: 'A' } }),
    }))
    const res = await POST(makeRequest('/api/budget', {
      method: 'POST',
      body: JSON.stringify({ week: TEST_WEEK, entry: { amount: 20, category: 'Fun', description: 'B' } }),
    }))
    const data = await json(res)

    expect(data.entries).toHaveLength(2)
    expect(data.totalSpent).toBe(30)
    expect(data.categories.Food).toBe(10)
    expect(data.categories.Fun).toBe(20)
  })
})

describe('DELETE /api/budget', () => {
  const entryId = 'del-test-1'

  beforeEach(() => {
    const entries: BudgetEntry[] = [
      { id: entryId, amount: 25, category: 'Fun', description: 'Movie', date: '2099-01-01', timestamp: '' },
      { id: 'keep-1', amount: 10, category: 'Food', description: 'Snack', date: '2099-01-01', timestamp: '' },
    ]
    writeToFallback(TEST_WEEK, calculateWeekData(TEST_WEEK, entries))
  })

  it('deletes an entry by id', async () => {
    const res = await DELETE(makeRequest(`/api/budget?week=${TEST_WEEK}&entryId=${entryId}`))
    const data = await json(res)

    expect(res.status).toBe(200)
    expect(data.entries).toHaveLength(1)
    expect(data.totalSpent).toBe(10)
  })

  it('returns 400 without entryId', async () => {
    const res = await DELETE(makeRequest(`/api/budget?week=${TEST_WEEK}`))
    expect(res.status).toBe(400)
    const data = await json(res)
    expect(data.error).toContain('entryId')
  })

  it('succeeds even when entryId not found (no-op)', async () => {
    const res = await DELETE(makeRequest(`/api/budget?week=${TEST_WEEK}&entryId=nonexistent`))
    const data = await json(res)
    expect(res.status).toBe(200)
    // Original 2 entries still present since "nonexistent" didn't match
    expect(data.entries).toHaveLength(2)
  })
})
