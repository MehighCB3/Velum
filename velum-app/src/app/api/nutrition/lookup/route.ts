import { NextRequest, NextResponse } from 'next/server'

// FatSecret-style food database with your logged foods
const FOOD_DB: Record<string, any> = {
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
  
  // Your logged foods
  'chia raspberry yogurt protein': { calories: 395, protein: 49, carbs: 28, fat: 12, serving: '1 bowl' },
  'tea coffee milk': { calories: 90, protein: 5, carbs: 7, fat: 5, serving: '1 cup' },
  'matcha latte': { calories: 70, protein: 4, carbs: 8, fat: 2, serving: '1 cup' },
  'huevos rancheros': { calories: 203, protein: 12, carbs: 18, fat: 10, serving: '1 plate' },
  'patatas bravas': { calories: 280, protein: 4, carbs: 35, fat: 14, serving: '1 portion' },
  'grilled seafood': { calories: 220, protein: 28, carbs: 5, fat: 8, serving: '1 plate' },
  'fideua seafood': { calories: 420, protein: 24, carbs: 58, fat: 10, serving: '1 plate' },
  'coke can': { calories: 139, protein: 0, carbs: 35, fat: 0, serving: '330ml' },
  'cinnamon roll': { calories: 220, protein: 4, carbs: 32, fat: 8, serving: '1 piece' },
  'pringles salt vinegar': { calories: 850, protein: 6, carbs: 90, fat: 55, serving: '165g tube' },
  'dr pepper': { calories: 140, protein: 0, carbs: 36, fat: 0, serving: '330ml' },
  'toblerone': { calories: 260, protein: 3, carbs: 29, fat: 14, serving: '50g' },
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    
    if (!query) {
      return NextResponse.json({ error: 'Query parameter required' }, { status: 400 })
    }
    
    // Search in database
    const searchTerm = query.toLowerCase()
    const match = Object.entries(FOOD_DB).find(([key]) => 
      key.includes(searchTerm) || searchTerm.includes(key)
    )
    
    if (match) {
      return NextResponse.json({
        source: 'fatsecret_db',
        results: [{
          name: match[0],
          ...match[1]
        }]
      })
    }
    
    // Fallback: estimate
    return NextResponse.json({
      source: 'estimate',
      results: [{
        name: query,
        calories: 100,
        protein: 5,
        carbs: 15,
        fat: 3,
        serving: '100g',
        note: 'Estimated - please verify'
      }]
    })
    
  } catch (error) {
    console.error('Nutrition lookup error:', error)
    return NextResponse.json({ error: 'Failed to lookup nutrition' }, { status: 500 })
  }
}
