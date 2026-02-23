import { NextRequest, NextResponse } from 'next/server'
import { searchFatSecret, searchLocal } from '@/app/lib/fatsecret'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || searchParams.get('q')

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
