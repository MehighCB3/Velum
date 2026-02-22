/**
 * Bookmarks Store — Postgres-backed storage for X bookmarks
 *
 * Stores bookmarks fetched from X's internal GraphQL API via the
 * scraper script (scripts/fetch-x-bookmarks.ts). Mobile and web
 * clients read from the /api/bookmarks endpoint which queries here.
 */

import { sql } from '@vercel/postgres';

export const usePostgres = !!process.env.POSTGRES_URL;

// ==================== TYPES ====================

export interface Bookmark {
  id: string;
  tweet_id: string;
  author_handle: string;
  author_name: string;
  text: string;
  url: string;
  tags: string[];
  created_at: string;      // when the tweet was posted
  bookmarked_at: string;   // when we fetched/stored it
  dismissed: boolean;
}

// ==================== INIT ====================

let tablesInitialized = false;

export async function initializePostgresTables(): Promise<void> {
  if (tablesInitialized || !usePostgres) return;

  await sql`
    CREATE TABLE IF NOT EXISTS x_bookmarks (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      tweet_id TEXT UNIQUE NOT NULL,
      author_handle TEXT NOT NULL,
      author_name TEXT NOT NULL DEFAULT '',
      text TEXT NOT NULL,
      url TEXT NOT NULL DEFAULT '',
      tags TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      bookmarked_at TIMESTAMPTZ DEFAULT NOW(),
      dismissed BOOLEAN DEFAULT FALSE
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_bookmarks_bookmarked
    ON x_bookmarks (bookmarked_at DESC)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_bookmarks_dismissed
    ON x_bookmarks (dismissed)
  `;

  tablesInitialized = true;
}

// ==================== READ ====================

export async function getBookmarks(opts: {
  includeDismissed?: boolean;
  limit?: number;
  offset?: number;
}): Promise<Bookmark[]> {
  if (!usePostgres) return [];

  await initializePostgresTables();

  const limit = opts.limit || 50;
  const offset = opts.offset || 0;

  let result;
  if (opts.includeDismissed) {
    result = await sql`
      SELECT * FROM x_bookmarks
      ORDER BY bookmarked_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else {
    result = await sql`
      SELECT * FROM x_bookmarks
      WHERE dismissed = FALSE
      ORDER BY bookmarked_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  return result.rows.map(normalizeBookmark);
}

export async function getBookmarkCount(): Promise<{ total: number; active: number }> {
  if (!usePostgres) return { total: 0, active: 0 };

  await initializePostgresTables();

  const total = await sql`SELECT COUNT(*) as count FROM x_bookmarks`;
  const active = await sql`SELECT COUNT(*) as count FROM x_bookmarks WHERE dismissed = FALSE`;

  return {
    total: Number(total.rows[0]?.count || 0),
    active: Number(active.rows[0]?.count || 0),
  };
}

// ==================== WRITE ====================

export interface BookmarkInput {
  tweet_id: string;
  author_handle: string;
  author_name?: string;
  text: string;
  url?: string;
  tags?: string[];
  created_at?: string;
}

export async function upsertBookmarks(bookmarks: BookmarkInput[]): Promise<number> {
  if (!usePostgres || bookmarks.length === 0) return 0;

  await initializePostgresTables();

  let inserted = 0;

  for (const bk of bookmarks) {
    const tags = bk.tags || [];
    const url = bk.url || `https://x.com/${bk.author_handle.replace('@', '')}/status/${bk.tweet_id}`;
    const createdAt = bk.created_at || new Date().toISOString();
    const authorName = bk.author_name || bk.author_handle;

    const result = await sql`
      INSERT INTO x_bookmarks (tweet_id, author_handle, author_name, text, url, tags, created_at, bookmarked_at)
      VALUES (${bk.tweet_id}, ${bk.author_handle}, ${authorName}, ${bk.text}, ${url}, ${tags as unknown as string}, ${createdAt}, NOW())
      ON CONFLICT (tweet_id) DO UPDATE SET
        text = EXCLUDED.text,
        author_name = EXCLUDED.author_name,
        tags = EXCLUDED.tags
      RETURNING id
    `;

    if (result.rowCount && result.rowCount > 0) inserted++;
  }

  return inserted;
}

// ==================== UPDATE ====================

export async function dismissBookmark(tweetId: string): Promise<boolean> {
  if (!usePostgres) return false;

  await initializePostgresTables();

  const result = await sql`
    UPDATE x_bookmarks SET dismissed = TRUE
    WHERE tweet_id = ${tweetId}
  `;

  return (result.rowCount ?? 0) > 0;
}

export async function undismissBookmark(tweetId: string): Promise<boolean> {
  if (!usePostgres) return false;

  await initializePostgresTables();

  const result = await sql`
    UPDATE x_bookmarks SET dismissed = FALSE
    WHERE tweet_id = ${tweetId}
  `;

  return (result.rowCount ?? 0) > 0;
}

// ==================== DELETE ====================

export async function deleteBookmark(tweetId: string): Promise<boolean> {
  if (!usePostgres) return false;

  await initializePostgresTables();

  const result = await sql`
    DELETE FROM x_bookmarks WHERE tweet_id = ${tweetId}
  `;

  return (result.rowCount ?? 0) > 0;
}

// ==================== HELPERS ====================

function normalizeBookmark(row: Record<string, unknown>): Bookmark {
  return {
    id: String(row.id || ''),
    tweet_id: String(row.tweet_id || ''),
    author_handle: String(row.author_handle || ''),
    author_name: String(row.author_name || ''),
    text: String(row.text || ''),
    url: String(row.url || ''),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    created_at: String(row.created_at || ''),
    bookmarked_at: String(row.bookmarked_at || ''),
    dismissed: Boolean(row.dismissed),
  };
}
