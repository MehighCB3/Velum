/**
 * Integration tests for /api/fitness route handlers.
 * Tests run against in-memory fallback storage (no Postgres needed).
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, DELETE } from '../fitness/route'
import { writeToFallback, calculateWeekData, type FitnessEntry } from '../../lib/fitnessStore'

const BASE_URL = 'http://localhost:3000'

function makeRequest(path: string, options?: { method?: string; body?: string }): NextRequest {
  return new NextRequest(`${BASE_URL}${path}`, options)
}

async function json(response: Response) {
  return response.json()
}

const TEST_WEEK = '2099-W01'

describe('GET /api/fitness', () => {
  beforeEach(() => {
    writeToFallback(TEST_WEEK, calculateWeekData(TEST_WEEK, []))
  })

  it('returns empty week data', async () => {
    const res = await GET(makeRequest(`/api/fitness?week=${TEST_WEEK}`))
    const data = await json(res)

    expect(res.status).toBe(200)
    expect(data.entries).toHaveLength(0)
    expect(data.totals.steps).toBe(0)
    expect(data.totals.runs).toBe(0)
  })

  it('returns week data with entries', async () => {
    // 2099-W01 is Mon 2098-12-29 through Sun 2099-01-04
    // Use a date within that week range
    const entries: FitnessEntry[] = [
      { id: 'r1', date: '2098-12-29', timestamp: '', type: 'run', distance: 5, duration: 30, calories: 300 },
    ]
    writeToFallback(TEST_WEEK, calculateWeekData(TEST_WEEK, entries))

    const res = await GET(makeRequest(`/api/fitness?week=${TEST_WEEK}`))
    const data = await json(res)

    expect(data.totals.runs).toBe(1)
    expect(data.totals.runDistance).toBe(5)
  })
})

describe('POST /api/fitness', () => {
  beforeEach(() => {
    writeToFallback(TEST_WEEK, calculateWeekData(TEST_WEEK, []))
  })

  it('adds a run entry', async () => {
    const res = await POST(makeRequest('/api/fitness', {
      method: 'POST',
      body: JSON.stringify({
        week: TEST_WEEK,
        entry: { type: 'run', duration: 30, distance: 5, calories: 300, date: '2098-12-29' },
      }),
    }))
    const data = await json(res)

    expect(res.status).toBe(200)
    expect(data.storage).toBe('fallback')
    expect(data.totals.runs).toBe(1)
  })

  it('adds a steps entry', async () => {
    const res = await POST(makeRequest('/api/fitness', {
      method: 'POST',
      body: JSON.stringify({
        week: TEST_WEEK,
        entry: { type: 'steps', steps: 8000, date: '2098-12-29' },
      }),
    }))
    const data = await json(res)
    expect(data.totals.steps).toBe(8000)
  })

  it('rejects entry without type', async () => {
    const res = await POST(makeRequest('/api/fitness', {
      method: 'POST',
      body: JSON.stringify({
        week: TEST_WEEK,
        entry: { duration: 30 },
      }),
    }))
    expect(res.status).toBe(400)
  })

  it('rejects invalid type', async () => {
    const res = await POST(makeRequest('/api/fitness', {
      method: 'POST',
      body: JSON.stringify({
        week: TEST_WEEK,
        entry: { type: 'flying' },
      }),
    }))
    expect(res.status).toBe(400)
    const data = await json(res)
    expect(data.error).toContain('Type must be one of')
  })

  it('accepts flat body format (no entry wrapper)', async () => {
    const res = await POST(makeRequest('/api/fitness', {
      method: 'POST',
      body: JSON.stringify({
        week: TEST_WEEK,
        type: 'swim',
        duration: 40,
        distance: 1.5,
        date: '2098-12-29',
      }),
    }))
    const data = await json(res)
    expect(res.status).toBe(200)
    expect(data.totals.swims).toBe(1)
  })

  it('updates goals when goals object is provided', async () => {
    const res = await POST(makeRequest('/api/fitness', {
      method: 'POST',
      body: JSON.stringify({
        week: TEST_WEEK,
        goals: { steps: 12000, runs: 4, swims: 3 },
      }),
    }))
    const data = await json(res)
    expect(res.status).toBe(200)
    expect(data.goals.steps).toBe(12000)
    expect(data.goals.runs).toBe(4)
    expect(data.goals.swims).toBe(3)
  })

  it('replaces step entry for same date (deduplication)', async () => {
    // Add steps for a date
    await POST(makeRequest('/api/fitness', {
      method: 'POST',
      body: JSON.stringify({
        week: TEST_WEEK,
        entry: { type: 'steps', steps: 5000, date: '2098-12-29' },
      }),
    }))

    // Add more steps for same date — should replace
    const res = await POST(makeRequest('/api/fitness', {
      method: 'POST',
      body: JSON.stringify({
        week: TEST_WEEK,
        entry: { type: 'steps', steps: 10000, date: '2098-12-29' },
      }),
    }))
    const data = await json(res)

    // Steps should be 10000, not 15000 (replaced, not accumulated)
    expect(data.totals.steps).toBe(10000)
  })
})

describe('DELETE /api/fitness', () => {
  it('returns 400 without entryId', async () => {
    const res = await DELETE(makeRequest(`/api/fitness?week=${TEST_WEEK}`))
    expect(res.status).toBe(400)
  })
})
