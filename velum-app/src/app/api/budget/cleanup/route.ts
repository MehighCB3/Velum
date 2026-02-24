import { NextRequest, NextResponse } from 'next/server'
import { redis } from '../../../lib/redis'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Require auth for destructive operation
    const CLEANUP_SECRET = process.env.MIGRATE_SECRET || process.env.VELUM_API_KEY
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!CLEANUP_SECRET || token !== CLEANUP_SECRET) {
      return NextResponse.json({ error: 'Unauthorized — destructive operation requires auth' }, { status: 401 })
    }

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
