import { sql } from '@vercel/postgres'

export interface Memory {
  id: string
  category: MemoryCategory
  key: string
  value: string
  source: 'agent' | 'extracted' | 'user'
  agentId?: string
  confidence: number
  createdAt: string
  updatedAt: string
  expiresAt?: string
}

export type MemoryCategory =
  | 'preference'    // User preferences (food, schedule, communication style)
  | 'fact'          // Facts about the user (name, location, job)
  | 'goal'          // Active goals and aspirations
  | 'relationship'  // People in user's life
  | 'health'        // Health-related info (allergies, conditions, metrics)
  | 'habit'         // Established habits and routines
  | 'context'       // Situational context (current projects, events)

const VALID_CATEGORIES: MemoryCategory[] = [
  'preference', 'fact', 'goal', 'relationship', 'health', 'habit', 'context'
]

// In-memory fallback when Postgres is unavailable
const fallbackStore = new Map<string, Memory>()

const usePostgres = !!process.env.POSTGRES_URL

let tableInitialized = false

export async function initializeMemoryTable(): Promise<void> {
  if (!usePostgres || tableInitialized) return

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS agent_memories (
        id VARCHAR(50) PRIMARY KEY,
        category VARCHAR(50) NOT NULL,
        key VARCHAR(255) NOT NULL,
        value TEXT NOT NULL,
        source VARCHAR(50) DEFAULT 'agent',
        agent_id VARCHAR(50),
        confidence DECIMAL(3,2) DEFAULT 1.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        UNIQUE(category, key)
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_memories_category ON agent_memories(category)`
    await sql`CREATE INDEX IF NOT EXISTS idx_memories_updated ON agent_memories(updated_at DESC)`
    tableInitialized = true
  } catch (error) {
    console.error('Failed to initialize agent_memories table:', error)
  }
}

function generateId(): string {
  return `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export async function saveMemory(input: {
  category: string
  key: string
  value: string
  source?: 'agent' | 'extracted' | 'user'
  agentId?: string
  confidence?: number
  expiresAt?: string
}): Promise<Memory> {
  const category = input.category as MemoryCategory
  if (!VALID_CATEGORIES.includes(category)) {
    throw new Error(`Invalid memory category: ${input.category}`)
  }

  const id = generateId()
  const now = new Date().toISOString()
  const memory: Memory = {
    id,
    category,
    key: input.key,
    value: input.value,
    source: input.source || 'agent',
    agentId: input.agentId,
    confidence: input.confidence ?? 1.0,
    createdAt: now,
    updatedAt: now,
    expiresAt: input.expiresAt,
  }

  if (usePostgres) {
    try {
      await initializeMemoryTable()
      // Upsert: if category+key exists, update value and timestamp
      await sql`
        INSERT INTO agent_memories (id, category, key, value, source, agent_id, confidence, expires_at)
        VALUES (${id}, ${category}, ${input.key}, ${input.value}, ${memory.source}, ${input.agentId || null}, ${memory.confidence}, ${input.expiresAt || null})
        ON CONFLICT (category, key) DO UPDATE SET
          value = EXCLUDED.value,
          source = EXCLUDED.source,
          agent_id = EXCLUDED.agent_id,
          confidence = EXCLUDED.confidence,
          updated_at = CURRENT_TIMESTAMP,
          expires_at = EXCLUDED.expires_at
      `
    } catch (error) {
      console.error('Postgres memory write error:', error)
    }
  }

  // Always write to fallback too
  const fallbackKey = `${category}/${input.key}`
  fallbackStore.set(fallbackKey, memory)
  return memory
}

export async function getMemories(category?: MemoryCategory): Promise<Memory[]> {
  if (usePostgres) {
    try {
      await initializeMemoryTable()
      const result = category
        ? await sql`
            SELECT * FROM agent_memories
            WHERE category = ${category}
              AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
            ORDER BY updated_at DESC
          `
        : await sql`
            SELECT * FROM agent_memories
            WHERE expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP
            ORDER BY category, updated_at DESC
          `

      return result.rows.map((row: Record<string, string>) => ({
        id: row.id,
        category: row.category as MemoryCategory,
        key: row.key,
        value: row.value,
        source: row.source as Memory['source'],
        agentId: row.agent_id,
        confidence: parseFloat(row.confidence),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        expiresAt: row.expires_at,
      }))
    } catch (error) {
      console.error('Postgres memory read error:', error)
    }
  }

  // Fallback
  const memories = Array.from(fallbackStore.values())
  if (category) return memories.filter(m => m.category === category)
  return memories
}

export async function getMemoryByKey(category: string, key: string): Promise<Memory | null> {
  if (usePostgres) {
    try {
      await initializeMemoryTable()
      const result = await sql`
        SELECT * FROM agent_memories
        WHERE category = ${category} AND key = ${key}
          AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      `
      if (result.rows.length === 0) return null
      const row = result.rows[0] as Record<string, string>
      return {
        id: row.id,
        category: row.category as MemoryCategory,
        key: row.key,
        value: row.value,
        source: row.source as Memory['source'],
        agentId: row.agent_id,
        confidence: parseFloat(row.confidence),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        expiresAt: row.expires_at,
      }
    } catch (error) {
      console.error('Postgres memory lookup error:', error)
    }
  }

  return fallbackStore.get(`${category}/${key}`) || null
}

export async function deleteMemory(id: string): Promise<void> {
  if (usePostgres) {
    try {
      await initializeMemoryTable()
      await sql`DELETE FROM agent_memories WHERE id = ${id}`
    } catch (error) {
      console.error('Postgres memory delete error:', error)
    }
  }

  // Remove from fallback by scanning
  const entries = Array.from(fallbackStore.entries())
  for (let i = 0; i < entries.length; i++) {
    if (entries[i][1].id === id) {
      fallbackStore.delete(entries[i][0])
      break
    }
  }
}

export async function deleteMemoryByKey(category: string, key: string): Promise<void> {
  if (usePostgres) {
    try {
      await initializeMemoryTable()
      await sql`DELETE FROM agent_memories WHERE category = ${category} AND key = ${key}`
    } catch (error) {
      console.error('Postgres memory delete error:', error)
    }
  }

  fallbackStore.delete(`${category}/${key}`)
}

/**
 * Build a compact context string from all stored memories.
 * Designed for injection into agent prompts — stays concise to minimize token usage.
 *
 * Output format:
 * [Persistent Memory]
 * - preference/diet: Prefers intermittent fasting, eats between 12pm-8pm
 * - fact/location: Lives in Barcelona, Spain
 * - health/allergy: Allergic to shellfish
 */
export async function getMemoryContext(categories?: MemoryCategory[]): Promise<string> {
  const memories = categories
    ? (await Promise.all(categories.map(c => getMemories(c)))).flat()
    : await getMemories()

  if (memories.length === 0) return ''

  // Sort by category then recency, cap at 60 memories for token budget
  const sorted = memories
    .sort((a, b) => a.category.localeCompare(b.category) ||
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 60)

  const lines = sorted.map(m => `- ${m.category}/${m.key}: ${m.value}`)
  return `[Persistent Memory]\n${lines.join('\n')}`
}

/**
 * Parse memory directives from agent response text.
 * Agents embed these in responses: [MEMORY: category/key = value]
 * Returns the cleaned text (directives removed) and extracted memories.
 */
export function extractMemoriesFromText(text: string): {
  cleaned: string
  memories: Array<{ category: string; key: string; value: string }>
} {
  const memoryPattern = /\[MEMORY:\s*(\w+)\/([a-zA-Z0-9_-]+)\s*=\s*(.+?)\]/g
  const memories: Array<{ category: string; key: string; value: string }> = []

  let match
  while ((match = memoryPattern.exec(text)) !== null) {
    const category = match[1]
    if (VALID_CATEGORIES.includes(category as MemoryCategory)) {
      memories.push({
        category,
        key: match[2],
        value: match[3].trim(),
      })
    }
  }

  const cleaned = text.replace(memoryPattern, '').replace(/\n{3,}/g, '\n\n').trim()
  return { cleaned, memories }
}
