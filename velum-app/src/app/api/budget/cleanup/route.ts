import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const confirm = searchParams.get('confirm')
    
    if (confirm !== 'yes') {
      return NextResponse.json(
        { error: 'Add ?confirm=yes to confirm budget data deletion' },
        { status: 400 }
      )
    }

    // Find and delete all budget keys from Redis
    let deletedCount = 0
    if (redis) {
      try {
        // Scan for budget:* keys
        let cursor = '0'
        do {
          const result = await redis.scan(cursor, { match: 'budget:*', count: 100 })
          cursor = result[0]
          const keys = result[1]
          
          for (const key of keys) {
            await redis.del(key)
            deletedCount++
          }
        } while (cursor !== '0')
      } catch (error) {
        console.error('Redis scan/delete error:', error)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'All budget data has been cleared',
      redisKeysDeleted: deletedCount,
      note: 'In-memory fallback data will reset on next server restart'
    })

  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      { error: 'Failed to clean budget data' },
      { status: 500 }
    )
  }
}
