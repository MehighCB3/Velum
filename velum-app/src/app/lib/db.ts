/**
 * Shared Postgres client — standard `pg` driver.
 *
 * Works with any Postgres instance (self-hosted, Docker, Neon, Supabase,
 * Vercel Postgres, etc.). Connection is configured via DATABASE_URL or
 * the legacy POSTGRES_URL env var.
 *
 * When neither is set, `pool` is null and `usePostgres` is false —
 * callers fall back to in-memory storage.
 */

import { Pool, QueryResult } from 'pg'

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL

export const pool: Pool | null = connectionString
  ? new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      ssl: connectionString.includes('sslmode=require') || connectionString.includes('vercel')
        ? { rejectUnauthorized: false }
        : undefined,
    })
  : null

export const usePostgres = !!pool

/**
 * Execute a parameterised SQL query.
 *
 * Usage:
 *   const result = await query('SELECT * FROM users WHERE id = $1', [userId])
 *   result.rows  // typed as any[] — cast at the call site
 *
 * All `@vercel/postgres` sql`` tagged-template calls should be migrated to
 * this function. The migration is mechanical:
 *
 *   BEFORE: await sql`SELECT * FROM t WHERE id = ${id}`
 *   AFTER:  await query('SELECT * FROM t WHERE id = $1', [id])
 */
export async function query(text: string, params?: unknown[]): Promise<QueryResult> {
  if (!pool) throw new Error('Database not configured (set DATABASE_URL)')
  return pool.query(text, params)
}
