import { NextRequest, NextResponse } from 'next/server'
import OAuth from 'oauth-1.0a'
import CryptoJS from 'crypto-js'

export const dynamic = 'force-dynamic'

const FATSECRET_URL = 'https://platform.fatsecret.com/rest/server.api'
const CONSUMER_KEY = process.env.FATSECRET_CONSUMER_KEY
const CONSUMER_SECRET = process.env.FATSECRET_CONSUMER_SECRET

// Food lookup result type
interface FoodResult {
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

// Try FatSecret API first
async function searchFatSecret(query: string): Promise<FoodResult[] | null> {
  if (!CONSUMER_KEY || !CONSUMER_SECRET) {
    console.log('FatSecret credentials not configured')
    return null
  }
  
  try {
    const oauth = new OAuth({
      consumer: { key: CONSUMER_KEY, secret: CONSUMER_SECRET },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string: string, key: string) {
        return CryptoJS.HmacSHA1(base_string, key).toString(CryptoJS.enc.Base64)
      }
    })
    
    const requestData = {
      url: FATSECRET_URL,
      method: 'POST' as const,
      data: {
        method: 'foods.search',
        search_expression: query,
        format: 'json',
        max_results: '3'
      }
    }
    
    const authHeader = oauth.toHeader(oauth.authorize(requestData))
    
    const response = await fetch(FATSECRET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader.Authorization
      },
      body: new URLSearchParams(requestData.data)
    })
    
    if (!response.ok) {
      console.error('FatSecret API error:', response.status)
      return null
    }
    
    const data = await response.json()
    
    if (!data.foods || !data.foods.food) {
      return null
    }
    
    const foods = Array.isArray(data.foods.food) ? data.foods.food : [data.foods.food]
    
    return foods.map((f: { food_name?: string; food_description?: string; serving?: { serving_description?: string }; brand_name?: string }) => {
      // Parse nutrition from description
      const desc = f.food_description || ''
      const calories = parseInt(desc.match(/Calories:\s*(\d+)/)?.[1] || '0')
      const fat = parseFloat(desc.match(/Fat:\s*([\d.]+)g/)?.[1] || '0')
      const carbs = parseFloat(desc.match(/Carbs:\s*([\d.]+)g/)?.[1] || '0')
      const protein = parseFloat(desc.match(/Protein:\s*([\d.]+)g/)?.[1] || '0')

      return {
        name: f.food_name || 'Unknown',
        calories,
        protein,
        carbs,
        fat,
        serving: f.serving?.serving_description || '100g',
        brand: f.brand_name || 'Generic',
        source: 'fatsecret'
      }
    })
    
  } catch (error) {
    console.error('FatSecret error:', error)
    return null
  }
}

// Search local database
function searchLocal(query: string): FoodResult | null {
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

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    
    if (!query) {
      return NextResponse.json({ error: 'Query parameter required' }, { status: 400 })
    }
    
    // 1. Try FatSecret API first
    const fatsecretResults = await searchFatSecret(query)
    
    if (fatsecretResults && fatsecretResults.length > 0) {
      return NextResponse.json({
        source: 'fatsecret',
        query,
        results: fatsecretResults,
        duration: Date.now() - startTime
      })
    }
    
    // 2. Fallback to local database
    const localResult = searchLocal(query)
    
    if (localResult) {
      return NextResponse.json({
        source: 'local',
        query,
        results: [localResult],
        duration: Date.now() - startTime
      })
    }
    
    // 3. Final fallback: estimate
    return NextResponse.json({
      source: 'estimate',
      query,
      results: [{
        name: query,
        calories: 100,
        protein: 5,
        carbs: 15,
        fat: 3,
        serving: '100g',
        note: 'Estimated - please verify'
      }],
      duration: Date.now() - startTime
    })
    
  } catch (error) {
    console.error('Lookup error:', error)
    return NextResponse.json({ error: 'Failed to lookup' }, { status: 500 })
  }
}
