/**
 * Shared Redis client — works with either:
 *   1. Standard Redis (REDIS_URL) — self-hosted, Docker, Redis Cloud, etc.
 *   2. Upstash REST Redis (UPSTASH_REDIS_REST_URL + TOKEN) — serverless
 *
 * Returns null when neither is configured (falls back to in-memory).
 */

interface RedisClient {
  get<T>(key: string): Promise<T | null>
  set(key: string, value: unknown, options?: { ex?: number }): Promise<void>
  del(key: string): Promise<void>
  scan?(cursor: string, options: { match: string; count: number }): Promise<[string, string[]]>
}

function createStandardRedis(url: string): RedisClient {
  // Lazy-load ioredis to avoid crashes when it's not installed (Upstash-only setups)
  // eslint-disable-next-line
  const IORedis = require('ioredis')
  const client = new IORedis(url, { maxRetriesPerRequest: 3, lazyConnect: true })
  client.connect().catch((err: Error) => console.error('[redis] Connection error:', err.message))

  return {
    async get<T>(key: string): Promise<T | null> {
      const raw = await client.get(key)
      if (!raw) return null
      try { return JSON.parse(raw) as T } catch { return raw as T }
    },
    async set(key: string, value: unknown, options?: { ex?: number }): Promise<void> {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value)
      if (options?.ex) {
        await client.set(key, serialized, 'EX', options.ex)
      } else {
        await client.set(key, serialized)
      }
    },
    async del(key: string): Promise<void> {
      await client.del(key)
    },
    async scan(cursor: string, options: { match: string; count: number }): Promise<[string, string[]]> {
      const [next, keys] = await client.scan(cursor, 'MATCH', options.match, 'COUNT', options.count)
      return [String(next), keys]
    },
  }
}

function createUpstashRedis(url: string, token: string): RedisClient {
  // eslint-disable-next-line
  const { Redis } = require('@upstash/redis')
  const client = new Redis({ url, token })

  return {
    async get<T>(key: string): Promise<T | null> {
      return client.get(key) as Promise<T | null>
    },
    async set(key: string, value: unknown, options?: { ex?: number }): Promise<void> {
      if (options?.ex) {
        await client.set(key, value, { ex: options.ex })
      } else {
        await client.set(key, value)
      }
    },
    async del(key: string): Promise<void> {
      await client.del(key)
    },
  }
}

// Prefer standard Redis, fall back to Upstash REST
export const redis: RedisClient | null = (() => {
  if (process.env.REDIS_URL) {
    return createStandardRedis(process.env.REDIS_URL)
  }
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return createUpstashRedis(process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN)
  }
  return null
})()

export const useRedis = !!redis
