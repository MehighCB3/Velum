import { Redis } from '@upstash/redis'

// Shared Redis client — one instance across the entire server.
// Returns null when credentials are not configured (dev/local).
export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null

export const useRedis = !!redis
