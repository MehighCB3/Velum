import { redis, useRedis } from './redis'
import { query, usePostgres } from './db'

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

const MAX_REDIS_MESSAGES = 50
const REDIS_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days

function redisKey(sessionKey: string): string {
  return `session:${sessionKey}:messages`
}

// ==================== POSTGRES PERSISTENCE ====================

let pgTableInitialized = false

async function initChatTable(): Promise<void> {
  if (!usePostgres || pgTableInitialized) return
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id VARCHAR(100) PRIMARY KEY,
        session_key VARCHAR(50) NOT NULL,
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        source VARCHAR(30) DEFAULT 'gateway',
        agent VARCHAR(50),
        memories_extracted INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await query('CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_messages(session_key, created_at)')
    pgTableInitialized = true
  } catch (error) {
    console.error('Failed to initialize chat_messages table:', error)
  }
}

async function saveMessageToPostgres(sessionKey: string, msg: ChatMessage): Promise<void> {
  if (!usePostgres) return
  try {
    await initChatTable()
    await query(
      `INSERT INTO chat_messages (id, session_key, role, content, source, agent, memories_extracted, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [
        msg.id,
        sessionKey,
        msg.role,
        msg.content,
        msg.source,
        msg.metadata?.agent || null,
        msg.metadata?.memoriesExtracted || 0,
        msg.timestamp,
      ]
    )
  } catch (error) {
    console.error('Postgres chat write error:', error)
  }
}

async function getMessagesFromPostgres(sessionKey: string, limit = 50): Promise<ChatMessage[]> {
  if (!usePostgres) return []
  try {
    await initChatTable()
    const result = await query(
      `SELECT id, role, content, source, agent, memories_extracted, created_at
       FROM chat_messages
       WHERE session_key = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [sessionKey, limit]
    )
    return result.rows.reverse().map((row: Record<string, unknown>) => ({
      id: row.id as string,
      role: row.role as 'user' | 'assistant',
      content: row.content as string,
      timestamp: (row.created_at as string) || new Date().toISOString(),
      source: (row.source as ChatMessage['source']) || 'gateway',
      metadata: {
        agent: (row.agent as string) || undefined,
        memoriesExtracted: Number(row.memories_extracted) || undefined,
      },
    }))
  } catch (error) {
    console.error('Postgres chat read error:', error)
    return []
  }
}

// ==================== MAIN API ====================

export async function getSessionMessages(sessionKey: string): Promise<ChatMessage[]> {
  // Try Redis first (fast cache)
  if (useRedis) {
    try {
      const data = await redis!.get<ChatMessage[]>(redisKey(sessionKey))
      if (data && data.length > 0) return data
    } catch (error) {
      console.error('Redis session read error:', error)
    }
  }

  // Fall back to Postgres (permanent store)
  if (usePostgres) {
    const pgMessages = await getMessagesFromPostgres(sessionKey)
    if (pgMessages.length > 0) {
      // Re-populate Redis cache
      if (useRedis) {
        try {
          await redis!.set(redisKey(sessionKey), pgMessages.slice(-MAX_REDIS_MESSAGES), { ex: REDIS_TTL_SECONDS })
        } catch { /* ignore */ }
      }
      return pgMessages
    }
  }

  return fallbackStore.get(sessionKey) || []
}

export async function appendMessage(sessionKey: string, msg: ChatMessage): Promise<void> {
  // 1. Save permanently to Postgres
  await saveMessageToPostgres(sessionKey, msg)

  // 2. Update Redis cache
  let messages = await getSessionMessages(sessionKey)
  messages.push(msg)
  if (messages.length > MAX_REDIS_MESSAGES) {
    messages = messages.slice(-MAX_REDIS_MESSAGES)
  }

  if (useRedis) {
    try {
      await redis!.set(redisKey(sessionKey), messages, { ex: REDIS_TTL_SECONDS })
    } catch (error) {
      console.error('Redis session write error:', error)
    }
  }

  // 3. Always write to fallback
  fallbackStore.set(sessionKey, messages)
}

export async function clearSession(sessionKey: string): Promise<void> {
  // Only clear Redis cache, NOT Postgres (permanent archive)
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
 * Get full chat history from Postgres (all messages, not just cached).
 * Used for history endpoints that need the full archive.
 */
export async function getFullHistory(sessionKey: string, limit = 200): Promise<ChatMessage[]> {
  if (usePostgres) {
    const messages = await getMessagesFromPostgres(sessionKey, limit)
    if (messages.length > 0) return messages
  }
  // Fall back to Redis/memory if Postgres unavailable
  return getSessionMessages(sessionKey)
}

/**
 * Build a compact summary of recent messages for injection into agent context.
 */
export async function getRecentContext(sessionKey: string, limit: number = 8): Promise<string> {
  const messages = await getSessionMessages(sessionKey)
  if (messages.length === 0) return ''

  const recent = messages.slice(-limit)
  const lines = recent.map(m => {
    const role = m.role === 'user' ? 'User' : 'Assistant'
    const content = m.content.length > 300
      ? m.content.slice(0, 297) + '...'
      : m.content
    return `${role}: ${content}`
  })

  return lines.join('\n')
}
