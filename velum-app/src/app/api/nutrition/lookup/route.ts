import { NextRequest, NextResponse } from 'next/server'

const API_NINJAS_KEY = process.env.API_NINJAS_KEY
const API_NINJAS_URL = 'https://api.api-ninjas.com/v1/nutrition'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    
    if (!query) {
      return NextResponse.json({ error: 'Query parameter required' }, { status: 400 })
    }
    
    if (!API_NINJAS_KEY) {
      return NextResponse.json({ error: 'API Ninjas key not configured' }, { status: 500 })
    }
    
    const response = await fetch(`${API_NINJAS_URL}?query=${encodeURIComponent(query)}`, {
      headers: {
        'X-Api-Key': API_NINJAS_KEY
      }
    })
    
    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error: 'API Ninjas error', details: error }, { status: response.status })
    }
    
    const data = await response.json()
    
    // Format the response
    const formatted = data.map((item: any) => ({
      name: item.name,
      calories: item.calories,
      protein: item.protein_g,
      carbs: item.carbohydrates_total_g,
      fat: item.fat_total_g,
      serving: `${item.serving_size_g}g`
    }))
    
    return NextResponse.json({ results: formatted })
    
  } catch (error) {
    console.error('Nutrition lookup error:', error)
    return NextResponse.json({ error: 'Failed to lookup nutrition' }, { status: 500 })
  }
}
