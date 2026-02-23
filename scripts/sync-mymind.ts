#!/usr/bin/env npx tsx
/**
 * sync-mymind.ts — Sync mymind.com saved items to Velum
 *
 * Supports two modes:
 *
 *   1. JWT mode (automatic, recommended):
 *      Fetches items directly from mymind's internal API using your session JWT.
 *      MYMIND_JWT=<token> npx tsx scripts/sync-mymind.ts
 *
 *   2. CSV mode (manual export fallback):
 *      Import from a mymind export CSV (Account → Export my mind → cards.csv).
 *      MYMIND_CSV=/path/to/cards.csv npx tsx scripts/sync-mymind.ts
 *
 * Required env vars:
 *   MYMIND_JWT     — _jwt cookie value from access.mymind.com (mode 1)
 *   MYMIND_CSV     — path to exported cards.csv (mode 2)
 *   VELUM_API_BASE — e.g. https://velum-five.vercel.app (default)
 *   MYMIND_API_KEY — optional, must match server-side MYMIND_API_KEY
 *
 * How to get your JWT (mode 1):
 *   1. Open mymind.com in Chrome, log in
 *   2. DevTools → Application → Cookies → https://access.mymind.com
 *   3. Copy the "_jwt" cookie value → MYMIND_JWT
 *
 * If the JWT endpoint returns 404/403, inspect mymind's network traffic:
 *   DevTools → Network → filter "access.mymind.com" → find the GET request
 *   loading your items → note the URL path → set MYMIND_API_PATH env var.
 */

import { createReadStream } from 'fs';
import { parse } from 'csv-parse';

const MYMIND_JWT = process.env.MYMIND_JWT;
const MYMIND_CSV = process.env.MYMIND_CSV;
const VELUM_API_BASE = process.env.VELUM_API_BASE || 'https://velum-five.vercel.app';
const MYMIND_API_KEY = process.env.MYMIND_API_KEY || '';

// mymind's internal API base — adjust MYMIND_API_PATH if they change it
const MYMIND_BASE = 'https://access.mymind.com';
const MYMIND_API_PATH = process.env.MYMIND_API_PATH || '/objects';

// ==================== TYPES ====================

interface MymindRawItem {
  id?: string;
  _id?: string;
  type?: string;
  title?: string;
  note?: string;       // note text
  text?: string;       // quote / highlight text
  content?: string;    // alternative field name
  url?: string;
  link?: string;
  imageUrl?: string;
  image_url?: string;
  thumbnail?: string;
  description?: string;
  author?: string;
  source?: string;
  tags?: string[];
  labels?: string[];
  createdAt?: string;
  created_at?: string;
  savedAt?: string;
}

interface VelumMymindItem {
  mymind_id: string;
  type: 'bookmark' | 'note' | 'quote' | 'highlight' | 'image';
  title: string;
  content: string;
  url: string;
  image_url: string;
  source: string;
  tags: string[];
  created_at: string;
}

// ==================== JWT MODE ====================

async function fetchMymindPage(cursor?: string): Promise<{
  items: MymindRawItem[];
  nextCursor: string | null;
}> {
  if (!MYMIND_JWT) throw new Error('MYMIND_JWT is required for JWT mode');

  const url = new URL(`${MYMIND_BASE}${MYMIND_API_PATH}`);
  if (cursor) url.searchParams.set('cursor', cursor);
  url.searchParams.set('limit', '100');

  const res = await fetch(url.toString(), {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      cookie: `_jwt=${MYMIND_JWT}`,
      origin: MYMIND_BASE,
      referer: 'https://access.mymind.com/',
      'user-agent': 'velum-sync/1.0',
    },
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `mymind auth failed (${res.status}). Your _jwt token may be expired.\n` +
        '  → Open mymind.com → DevTools → Application → Cookies → copy fresh _jwt value'
      );
    }
    if (res.status === 404) {
      throw new Error(
        `mymind API path not found (${MYMIND_API_PATH}).\n` +
        '  → Open mymind.com → DevTools → Network → filter "access.mymind.com" →\n' +
        '    find the GET request that loads your items → copy the path →\n' +
        '    re-run with: MYMIND_API_PATH=<new_path> npx tsx scripts/sync-mymind.ts'
      );
    }
    throw new Error(`mymind API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();

  // Handle different response shapes mymind might use
  let rawItems: MymindRawItem[] = [];
  let nextCursor: string | null = null;

  if (Array.isArray(data)) {
    rawItems = data;
  } else if (Array.isArray(data.items)) {
    rawItems = data.items;
    nextCursor = data.nextCursor || data.cursor || data.next || null;
  } else if (Array.isArray(data.objects)) {
    rawItems = data.objects;
    nextCursor = data.nextCursor || null;
  } else if (Array.isArray(data.data)) {
    rawItems = data.data;
    nextCursor = data.meta?.nextCursor || null;
  }

  return { items: rawItems, nextCursor };
}

async function fetchAllJWT(): Promise<MymindRawItem[]> {
  const all: MymindRawItem[] = [];
  let cursor: string | undefined;
  let page = 0;
  const MAX_PAGES = 20;

  while (page < MAX_PAGES) {
    console.log(`  Fetching page ${page + 1}...`);
    const { items, nextCursor } = await fetchMymindPage(cursor);

    all.push(...items);
    console.log(`  Got ${items.length} items (total: ${all.length})`);

    if (!nextCursor || items.length === 0) break;
    cursor = nextCursor;
    page++;

    await new Promise((r) => setTimeout(r, 1000));
  }

  return all;
}

// ==================== CSV MODE ====================

async function parseCsvFile(csvPath: string): Promise<MymindRawItem[]> {
  return new Promise((resolve, reject) => {
    const items: MymindRawItem[] = [];
    const parser = parse({ columns: true, skip_empty_lines: true, trim: true });

    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        // Normalize common CSV column names mymind might use
        items.push({
          id: record.id || record.ID || record.uuid,
          type: record.type || record.Type || record.kind,
          title: record.title || record.Title || record.name,
          text: record.text || record.Text || record.quote || record.content || record.Content,
          url: record.url || record.URL || record.link || record.href,
          image_url: record.image_url || record.imageUrl || record.image || record.thumbnail,
          source: record.source || record.Source || record.author || record.Author,
          tags: (record.tags || record.Tags || record.labels || '')
            .split(',').map((t: string) => t.trim()).filter(Boolean),
          created_at: record.created_at || record.createdAt || record.date || record.Date,
        });
      }
    });

    parser.on('error', reject);
    parser.on('end', () => resolve(items));
    createReadStream(csvPath).pipe(parser);
  });
}

// ==================== NORMALIZE ====================

function normalizeType(raw?: string): VelumMymindItem['type'] {
  const t = (raw || '').toLowerCase();
  if (t.includes('note')) return 'note';
  if (t.includes('quote')) return 'quote';
  if (t.includes('highlight')) return 'highlight';
  if (t.includes('image') || t.includes('photo')) return 'image';
  return 'bookmark';
}

function normalizeItem(raw: MymindRawItem): VelumMymindItem {
  const id = raw.id || raw._id || `mm-${Date.now()}-${Math.random()}`;
  const type = normalizeType(raw.type);
  const content = raw.note || raw.text || raw.content || raw.description || '';
  const url = raw.url || raw.link || '';
  const imageUrl = raw.imageUrl || raw.image_url || raw.thumbnail || '';
  const source = raw.author || raw.source || '';
  const tags = Array.isArray(raw.tags) ? raw.tags : Array.isArray(raw.labels) ? raw.labels : [];
  const createdAt = raw.createdAt || raw.created_at || raw.savedAt || new Date().toISOString();

  return {
    mymind_id: String(id),
    type,
    title: raw.title || '',
    content,
    url,
    image_url: imageUrl,
    source,
    tags,
    created_at: createdAt,
  };
}

// ==================== PUSH TO VELUM ====================

async function pushToVelum(items: VelumMymindItem[]): Promise<void> {
  if (items.length === 0) {
    console.log('  No items to push.');
    return;
  }

  const BATCH_SIZE = 50;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (MYMIND_API_KEY) headers['Authorization'] = `Bearer ${MYMIND_API_KEY}`;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    console.log(`  Pushing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} items)...`);

    const res = await fetch(`${VELUM_API_BASE}/api/mymind`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ items: batch }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`  Push failed: ${res.status} ${body.slice(0, 200)}`);
    } else {
      const result = await res.json();
      console.log(`  Stored: ${result.inserted} new/updated`);
    }
  }
}

// ==================== MAIN ====================

async function main() {
  console.log('=== Velum mymind Sync ===\n');

  if (!MYMIND_JWT && !MYMIND_CSV) {
    console.error('Error: provide either MYMIND_JWT or MYMIND_CSV.\n');
    console.error('JWT mode (recommended):');
    console.error('  1. Open mymind.com → log in');
    console.error('  2. DevTools → Application → Cookies → https://access.mymind.com');
    console.error('  3. Copy "_jwt" cookie value');
    console.error('  MYMIND_JWT=<token> npx tsx scripts/sync-mymind.ts\n');
    console.error('CSV mode (manual export fallback):');
    console.error('  1. mymind.com → Account (cog icon) → Export my mind → cards.csv');
    console.error('  MYMIND_CSV=/path/to/cards.csv npx tsx scripts/sync-mymind.ts');
    process.exit(1);
  }

  console.log(`API target: ${VELUM_API_BASE}`);
  console.log(`Mode: ${MYMIND_JWT ? 'JWT (live sync)' : 'CSV import'}\n`);

  let rawItems: MymindRawItem[] = [];

  if (MYMIND_JWT) {
    console.log('1. Fetching items from mymind API...');
    rawItems = await fetchAllJWT();
  } else if (MYMIND_CSV) {
    console.log(`1. Parsing CSV: ${MYMIND_CSV}...`);
    rawItems = await parseCsvFile(MYMIND_CSV);
  }

  console.log(`   Total raw items: ${rawItems.length}\n`);

  const normalized = rawItems.map(normalizeItem).filter((i) => i.content || i.url || i.title);
  console.log(`   Valid items: ${normalized.length}`);

  const byType = normalized.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  Object.entries(byType).forEach(([t, n]) => console.log(`     ${t}: ${n}`));
  console.log('');

  if (normalized.length > 0) {
    console.log('   Sample:');
    normalized.slice(0, 3).forEach((item) => {
      const preview = (item.title || item.content).slice(0, 70);
      console.log(`     [${item.type}] ${preview}`);
    });
    console.log('');
  }

  console.log('2. Pushing to Velum API...');
  await pushToVelum(normalized);
  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
