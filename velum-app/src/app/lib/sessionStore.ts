import { redis, useRedis } from './redis'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  source: 'gateway' | 'local' | 'local_fallback'
  metadata?: {
    agent?: string
    memoriesExtracted?: number
  }
}

// In-memory fallback
const fallbackStore = new Map<string, ChatMessage[]>()

const MAX_MESSAGES = 50
const TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days

function redisKey(sessionKey: string): string {
  return `session:${sessionKey}:messages`
}

export async function getSessionMessages(sessionKey: string): Promise<ChatMessage[]> {
  if (useRedis) {
    try {
      const data = await redis!.get<ChatMessage[]>(redisKey(sessionKey))
      if (data) return data
    } catch (error) {
      console.error('Redis session read error:', error)
    }
  }

  return fallbackStore.get(sessionKey) || []
}

export async function appendMessage(sessionKey: string, msg: ChatMessage): Promise<void> {
  // Read existing messages
  let messages = await getSessionMessages(sessionKey)

  // Append and cap at MAX_MESSAGES
  messages.push(msg)
  if (messages.length > MAX_MESSAGES) {
    messages = messages.slice(-MAX_MESSAGES)
  }

  // Write to Redis with TTL
  if (useRedis) {
    try {
      await redis!.set(redisKey(sessionKey), messages, { ex: TTL_SECONDS })
    } catch (error) {
      console.error('Redis session write error:', error)
    }
  }

  // Always write to fallback
  fallbackStore.set(sessionKey, messages)
}

export async function clearSession(sessionKey: string): Promise<void> {
  if (useRedis) {
    try {
      await redis!.del(redisKey(sessionKey))
    } catch (error) {
      console.error('Redis session clear error:', error)
    }
  }
  fallbackStore.delete(sessionKey)
}

/**
 * Build a compact summary of recent messages for injection into agent context.
 * Returns the last `limit` turns formatted as:
 *
 * User: What should I eat?
 * Assistant: How about some grilled chicken with vegetables?
 * User: Sounds good, I had that yesterday too.
 */
export async function getRecentContext(sessionKey: string, limit: number = 8): Promise<string> {
  const messages = await getSessionMessages(sessionKey)
  if (messages.length === 0) return ''

  const recent = messages.slice(-limit)
  const lines = recent.map(m => {
    const role = m.role === 'user' ? 'User' : 'Assistant'
    // Truncate very long messages for context injection
    const content = m.content.length > 300
      ? m.content.slice(0, 297) + '...'
      : m.content
    return `${role}: ${content}`
  })

  return lines.join('\n')
}
