/**
 * mymind Store — Postgres-backed storage for mymind.com saved items
 *
 * Stores items synced from mymind via scripts/sync-mymind.ts.
 * Supports all mymind content types: bookmark, note, quote, highlight, image.
 */

import { sql } from '@vercel/postgres';

export const usePostgres = !!process.env.POSTGRES_URL;

// ==================== TYPES ====================

export type MymindItemType = 'bookmark' | 'note' | 'quote' | 'highlight' | 'image';

export interface MymindItem {
  id: string;
  mymind_id: string;
  type: MymindItemType;
  title: string;
  content: string;   // main text: note body, quote text, highlight text, bookmark description
  url: string;       // page URL for bookmarks and highlights
  image_url: string; // cover image or direct image URL
  source: string;    // attribution / publication for quotes and highlights
  tags: string[];
  created_at: string;
  saved_at: string;
  dismissed: boolean;
}

// ==================== INIT ====================

let tablesInitialized = false;

export async function initializePostgresTables(): Promise<void> {
  if (tablesInitialized || !usePostgres) return;

  await sql`
    CREATE TABLE IF NOT EXISTS mymind_items (
      id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      mymind_id  TEXT UNIQUE NOT NULL,
      type       TEXT NOT NULL DEFAULT 'bookmark',
      title      TEXT NOT NULL DEFAULT '',
      content    TEXT NOT NULL DEFAULT '',
      url        TEXT NOT NULL DEFAULT '',
      image_url  TEXT NOT NULL DEFAULT '',
      source     TEXT NOT NULL DEFAULT '',
      tags       TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      saved_at   TIMESTAMPTZ DEFAULT NOW(),
      dismissed  BOOLEAN DEFAULT FALSE
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_mymind_saved_at ON mymind_items (saved_at DESC)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_mymind_dismissed ON mymind_items (dismissed)
  `;

  tablesInitialized = true;
}

// ==================== READ ====================

export async function getMymindItems(opts: {
  includeDismissed?: boolean;
  type?: MymindItemType;
  limit?: number;
  offset?: number;
}): Promise<MymindItem[]> {
  if (!usePostgres) return [];
  await initializePostgresTables();

  const limit = opts.limit || 50;
  const offset = opts.offset || 0;

  let result;
  if (opts.type) {
    if (opts.includeDismissed) {
      result = await sql`
        SELECT * FROM mymind_items WHERE type = ${opts.type}
        ORDER BY saved_at DESC LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      result = await sql`
        SELECT * FROM mymind_items WHERE type = ${opts.type} AND dismissed = FALSE
        ORDER BY saved_at DESC LIMIT ${limit} OFFSET ${offset}
      `;
    }
  } else {
    if (opts.includeDismissed) {
      result = await sql`
        SELECT * FROM mymind_items ORDER BY saved_at DESC LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      result = await sql`
        SELECT * FROM mymind_items WHERE dismissed = FALSE
        ORDER BY saved_at DESC LIMIT ${limit} OFFSET ${offset}
      `;
    }
  }

  return result.rows.map(normalizeItem);
}

export async function getMymindCount(): Promise<{ total: number; active: number }> {
  if (!usePostgres) return { total: 0, active: 0 };
  await initializePostgresTables();

  const total = await sql`SELECT COUNT(*) as count FROM mymind_items`;
  const active = await sql`SELECT COUNT(*) as count FROM mymind_items WHERE dismissed = FALSE`;

  return {
    total: Number(total.rows[0]?.count || 0),
    active: Number(active.rows[0]?.count || 0),
  };
}

// ==================== WRITE ====================

export interface MymindItemInput {
  mymind_id: string;
  type?: MymindItemType;
  title?: string;
  content?: string;
  url?: string;
  image_url?: string;
  source?: string;
  tags?: string[];
  created_at?: string;
}

export async function upsertMymindItems(items: MymindItemInput[]): Promise<number> {
  if (!usePostgres || items.length === 0) return 0;
  await initializePostgresTables();

  let inserted = 0;

  for (const item of items) {
    const type = item.type || 'bookmark';
    const title = item.title || '';
    const content = item.content || '';
    const url = item.url || '';
    const imageUrl = item.image_url || '';
    const source = item.source || '';
    const tags = item.tags || [];
    const createdAt = item.created_at || new Date().toISOString();

    const result = await sql`
      INSERT INTO mymind_items (mymind_id, type, title, content, url, image_url, source, tags, created_at, saved_at)
      VALUES (
        ${item.mymind_id}, ${type}, ${title}, ${content},
        ${url}, ${imageUrl}, ${source},
        ${tags as unknown as string}, ${createdAt}, NOW()
      )
      ON CONFLICT (mymind_id) DO UPDATE SET
        title     = EXCLUDED.title,
        content   = EXCLUDED.content,
        image_url = EXCLUDED.image_url,
        source    = EXCLUDED.source,
        tags      = EXCLUDED.tags
      RETURNING id
    `;

    if (result.rowCount && result.rowCount > 0) inserted++;
  }

  return inserted;
}

// ==================== UPDATE ====================

export async function dismissMymindItem(mymindId: string): Promise<boolean> {
  if (!usePostgres) return false;
  await initializePostgresTables();
  const result = await sql`
    UPDATE mymind_items SET dismissed = TRUE WHERE mymind_id = ${mymindId}
  `;
  return (result.rowCount ?? 0) > 0;
}

export async function undismissMymindItem(mymindId: string): Promise<boolean> {
  if (!usePostgres) return false;
  await initializePostgresTables();
  const result = await sql`
    UPDATE mymind_items SET dismissed = FALSE WHERE mymind_id = ${mymindId}
  `;
  return (result.rowCount ?? 0) > 0;
}

// ==================== HELPERS ====================

function normalizeItem(row: Record<string, unknown>): MymindItem {
  return {
    id: String(row.id || ''),
    mymind_id: String(row.mymind_id || ''),
    type: (String(row.type || 'bookmark')) as MymindItemType,
    title: String(row.title || ''),
    content: String(row.content || ''),
    url: String(row.url || ''),
    image_url: String(row.image_url || ''),
    source: String(row.source || ''),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    created_at: String(row.created_at || ''),
    saved_at: String(row.saved_at || ''),
    dismissed: Boolean(row.dismissed),
  };
}
