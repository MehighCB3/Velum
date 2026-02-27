import { test, expect } from '@playwright/test'

test.describe('API Health Checks', () => {
  test('GET /api/budget returns valid data', async ({ request }) => {
    const response = await request.get('/api/budget')
    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data).toHaveProperty('totals')
    expect(data.totals).toHaveProperty('budget', 70)
    expect(data).toHaveProperty('storage')
  })

  test('GET /api/fitness returns valid data', async ({ request }) => {
    const response = await request.get('/api/fitness')
    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data).toHaveProperty('totals')
    expect(data).toHaveProperty('goals')
    expect(data).toHaveProperty('entries')
  })

  test('GET /api/nutrition returns valid data', async ({ request }) => {
    const response = await request.get('/api/nutrition')
    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data).toHaveProperty('date')
    expect(data).toHaveProperty('entries')
    expect(data).toHaveProperty('totals')
    expect(data).toHaveProperty('goals')
  })

  test('GET /api/books returns daily content', async ({ request }) => {
    const response = await request.get('/api/books?action=daily')
    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data).toHaveProperty('currentDomain')
    expect(data).toHaveProperty('weekPrinciple')
    expect(data).toHaveProperty('allDomains')
  })

  test('GET /api/insights returns array', async ({ request }) => {
    const response = await request.get('/api/insights')
    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(Array.isArray(data)).toBeTruthy()
  })

  test('POST /api/budget validates required fields', async ({ request }) => {
    const response = await request.post('/api/budget', {
      data: { entry: { description: 'no amount or category' } },
    })
    expect(response.status()).toBe(400)
  })

  test('POST /api/fitness validates entry type', async ({ request }) => {
    const response = await request.post('/api/fitness', {
      data: { entry: { type: 'invalid_type' } },
    })
    expect(response.status()).toBe(400)
  })

  test('POST /api/budget creates entry and GET retrieves it', async ({ request }) => {
    // Create an entry
    const postRes = await request.post('/api/budget', {
      data: {
        week: '2099-W52',
        entry: { amount: 5, category: 'Food', description: 'E2E test coffee' },
      },
    })
    expect(postRes.ok()).toBeTruthy()
    const postData = await postRes.json()
    expect(postData.totalSpent).toBeGreaterThanOrEqual(5)

    // Read it back
    const getRes = await request.get('/api/budget?week=2099-W52')
    expect(getRes.ok()).toBeTruthy()
    const getData = await getRes.json()
    const found = getData.entries.find((e: { description: string }) => e.description === 'E2E test coffee')
    expect(found).toBeTruthy()
    expect(found.amount).toBe(5)
  })

  test('POST /api/fitness creates entry and GET retrieves it', async ({ request }) => {
    const postRes = await request.post('/api/fitness', {
      data: {
        week: '2099-W52',
        entry: { type: 'run', duration: 30, distance: 5, calories: 300, date: '2099-12-22' },
      },
    })
    expect(postRes.ok()).toBeTruthy()

    const getRes = await request.get('/api/fitness?week=2099-W52')
    expect(getRes.ok()).toBeTruthy()
    const getData = await getRes.json()
    expect(getData.totals.runs).toBeGreaterThanOrEqual(1)
  })
})
