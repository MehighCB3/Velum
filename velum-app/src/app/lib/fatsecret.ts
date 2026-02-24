// Shared FatSecret API client — OAuth 2.0 client credentials flow
// Import this instead of duplicating token logic in each route.

const FATSECRET_TOKEN_URL = 'https://oauth.fatsecret.com/connect/token'
const FATSECRET_API_URL = 'https://platform.fatsecret.com/rest/server.api'
const CLIENT_ID = process.env.FATSECRET_CONSUMER_KEY
const CLIENT_SECRET = process.env.FATSECRET_CONSUMER_SECRET

export interface FoodResult {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  serving: string
  brand?: string
  source?: string
  note?: string
}

// ── OAuth 2.0 token cache ──────────────────────────────────
let cachedToken: string | null = null
let tokenExpiresAt = 0

async function getAccessToken(): Promise<string | null> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    // FatSecret credentials not configured
    return null
  }

  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken
  }

  try {
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')

    const response = await fetch(FATSECRET_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: 'grant_type=client_credentials&scope=basic',
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('FatSecret token error:', response.status, errorText)
      return null
    }

    const data = await response.json()
    cachedToken = data.access_token
    tokenExpiresAt = Date.now() + (data.expires_in || 86400) * 1000

    return cachedToken
  } catch (error) {
    console.error('FatSecret token fetch error:', error)
    return null
  }
}

// ── FatSecret API search (OAuth 2.0) ───────────────────────
export async function searchFatSecret(query: string, maxResults = 3): Promise<FoodResult[] | null> {
  const token = await getAccessToken()
  if (!token) return null

  try {
    const params = new URLSearchParams({
      method: 'foods.search',
      search_expression: query,
      format: 'json',
      max_results: String(maxResults),
    })

    const response = await fetch(`${FATSECRET_API_URL}?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('FatSecret API error:', response.status, errorText)
      if (response.status === 401 || response.status === 403) {
        cachedToken = null
        tokenExpiresAt = 0
      }
      return null
    }

    const data = await response.json()

    if (!data.foods || !data.foods.food) {
      return null
    }

    const foods = Array.isArray(data.foods.food) ? data.foods.food : [data.foods.food]

    return foods.map((f: { food_name?: string; food_description?: string; brand_name?: string }) => {
      const desc = f.food_description || ''
      const calories = parseInt(desc.match(/Calories:\s*(\d+)/)?.[1] || '0')
      const fat = parseFloat(desc.match(/Fat:\s*([\d.]+)g/)?.[1] || '0')
      const carbs = parseFloat(desc.match(/Carbs:\s*([\d.]+)g/)?.[1] || '0')
      const protein = parseFloat(desc.match(/Protein:\s*([\d.]+)g/)?.[1] || '0')
      const servingMatch = desc.match(/^Per\s+(.+?)\s*-/)
      const serving = servingMatch?.[1] || '100g'

      return {
        name: f.food_name || 'Unknown',
        calories,
        protein,
        carbs,
        fat,
        serving,
        brand: f.brand_name || 'Generic',
        source: 'fatsecret'
      }
    })

  } catch (error) {
    console.error('FatSecret error:', error)
    return null
  }
}

// Local fallback database
const LOCAL_DB: Record<string, Omit<FoodResult, 'name'>> = {
  'banana': { calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, serving: '100g' },
  'apple': { calories: 52, protein: 0.3, carbs: 14, fat: 0.2, serving: '100g' },
  'egg': { calories: 155, protein: 13, carbs: 1.1, fat: 11, serving: '100g' },
  'chicken breast': { calories: 165, protein: 31, carbs: 0, fat: 3.6, serving: '100g' },
  'rice': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, serving: '100g' },
  'pasta': { calories: 131, protein: 5, carbs: 25, fat: 1.1, serving: '100g' },
  'salmon': { calories: 208, protein: 20, carbs: 0, fat: 13, serving: '100g' },
  'avocado': { calories: 160, protein: 2, carbs: 8.5, fat: 15, serving: '100g' },
  'oats': { calories: 389, protein: 16.9, carbs: 66, fat: 6.9, serving: '100g' },
  'greek yogurt': { calories: 59, protein: 10, carbs: 3.6, fat: 0.4, serving: '100g' },
  'almonds': { calories: 579, protein: 21, carbs: 22, fat: 50, serving: '100g' },
  'broccoli': { calories: 34, protein: 2.8, carbs: 7, fat: 0.4, serving: '100g' },
  'sweet potato': { calories: 86, protein: 1.6, carbs: 20, fat: 0.1, serving: '100g' },
  'tuna': { calories: 132, protein: 28, carbs: 0, fat: 1, serving: '100g' },
  'quinoa': { calories: 120, protein: 4.4, carbs: 21, fat: 1.9, serving: '100g' },
  'blueberries': { calories: 57, protein: 0.7, carbs: 14, fat: 0.3, serving: '100g' },
  'chia seeds': { calories: 486, protein: 17, carbs: 42, fat: 31, serving: '100g' },
  'peanut butter': { calories: 588, protein: 25, carbs: 20, fat: 50, serving: '100g' },
  'spinach': { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, serving: '100g' },
  'carrot': { calories: 41, protein: 0.9, carbs: 10, fat: 0.2, serving: '100g' },
}

export function searchLocal(query: string): FoodResult | null {
  const searchTerm = query.toLowerCase()
  const match = Object.entries(LOCAL_DB).find(([key]) =>
    key.includes(searchTerm) || searchTerm.includes(key)
  )

  if (match) {
    return {
      name: match[0],
      ...match[1],
      source: 'local'
    }
  }

  return null
}
