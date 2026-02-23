#!/usr/bin/env npx tsx
/**
 * sync-mymind.ts — Sync mymind.com saved items to Velum
 *
 * Supports two modes:
 *
 *   1. JWT mode (automatic, recommended):
 *      Fetches items directly from mymind's internal API using your session cookies.
 *      MYMIND_JWT=<token> MYMIND_CID=<cid> MYMIND_AUTH_TOKEN=<token> npx tsx scripts/sync-mymind.ts
 *
 *   2. CSV mode (manual export fallback):
 *      Import from a mymind export CSV (Account → Export my mind → cards.csv).
 *      MYMIND_CSV=/path/to/cards.csv npx tsx scripts/sync-mymind.ts
 *
 * Required env vars:
 *   MYMIND_JWT         — _jwt cookie value from access.mymind.com (mode 1)
 *   MYMIND_CID         — _cid cookie value from access.mymind.com (mode 1)
 *   MYMIND_AUTH_TOKEN  — x-authenticity-token header value (mode 1, CSRF token)
 *   MYMIND_CSV         — path to exported cards.csv (mode 2)
 *   VELUM_API_BASE     — e.g. https://velum-five.vercel.app (default)
 *   MYMIND_API_KEY     — optional, must match server-side MYMIND_API_KEY
 *
 * How to get your credentials (mode 1):
 *   1. Open https://access.mymind.com in Chrome, log in
 *   2. DevTools → Application → Cookies → https://access.mymind.com
 *      Copy "_jwt" → MYMIND_JWT
 *      Copy "_cid" → MYMIND_CID
 *   3. DevTools → Network → reload page → pick any XHR to access.mymind.com
 *      Request headers → copy "x-authenticity-token" → MYMIND_AUTH_TOKEN
 *
 * Note: mymind has no official API. This uses the same internal API the web
 * app uses. Tokens expire when your browser session ends; re-extract if you
 * get 401/403 errors.
 */

import { createReadStream } from 'fs';
import { parse } from 'csv-parse';

const MYMIND_JWT = process.env.MYMIND_JWT;
const MYMIND_CID = process.env.MYMIND_CID;
const MYMIND_AUTH_TOKEN = process.env.MYMIND_AUTH_TOKEN;
const MYMIND_CSV = process.env.MYMIND_CSV;
const VELUM_API_BASE = process.env.VELUM_API_BASE || 'https://velum-five.vercel.app';
const MYMIND_API_KEY = process.env.MYMIND_API_KEY || '';

const MYMIND_BASE = 'https://access.mymind.com';

// ==================== TYPES ====================

// Prose node from mymind's ProseMirror-based editor
interface ProseContent {
  type: string;
  text?: string;
  content?: ProseContent[];
}

interface ProseDoc {
  type: string;
  content?: ProseContent[];
}

// Real mymind Card shape from GET /cards.json
// Response is Record<slug, Card> — the key is the card's ID (slug)
interface MymindCard {
  title?: string;
  siteName?: string;      // e.g. "YouTube", "Twitter"
  domain?: string;        // e.g. "youtube.com"
  description?: string;
  brand?: string;
  source?: { url?: string };
  tags?: Array<{ id: string; name: string; flags?: number }>;
  flags?: number;
  created?: string;       // ISO timestamp
  modified?: string;      // ISO timestamp
  bumped?: string;
  ocr?: string;           // OCR text for images
  prose?: ProseDoc;       // Rich text (Notes)
  note?: {
    id: string;
    prose: ProseDoc;
  };
  // type is not reliably present in cards.json — inferred from content
  type?: string;
}

// CSV row shape
interface MymindCsvRow {
  id?: string;
  type?: string;
  title?: string;
  text?: string;
  content?: string;
  url?: string;
  image_url?: string;
  imageUrl?: string;
  source?: string;
  tags?: string;
  created_at?: string;
  createdAt?: string;
  date?: string;
  [key: string]: string | undefined;
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

// ==================== PROSE HELPERS ====================

/** Flatten a ProseMirror doc tree to plain text */
function proseToText(node: ProseDoc | ProseContent): string {
  if (!node) return '';
  const parts: string[] = [];
  if ('text' in node && node.text) parts.push(node.text);
  if (node.content) {
    for (const child of node.content) {
      parts.push(proseToText(child));
    }
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

// ==================== JWT MODE ====================

async function fetchAllJWT(): Promise<{ slug: string; card: MymindCard }[]> {
  if (!MYMIND_JWT) throw new Error('MYMIND_JWT is required for JWT mode');
  if (!MYMIND_CID) throw new Error('MYMIND_CID is required for JWT mode');
  if (!MYMIND_AUTH_TOKEN) throw new Error('MYMIND_AUTH_TOKEN is required for JWT mode');

  const url = `${MYMIND_BASE}/cards.json`;
  console.log(`  GET ${url}`);

  const res = await fetch(url, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      cookie: `_cid=${MYMIND_CID}; _jwt=${MYMIND_JWT}`,
      'x-authenticity-token': MYMIND_AUTH_TOKEN,
      origin: MYMIND_BASE,
      referer: 'https://access.mymind.com/',
      'user-agent': 'Mozilla/5.0 (compatible; velum-sync/1.0)',
    },
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401 || res.status === 403 || res.status === 302) {
      throw new Error(
        `mymind auth failed (${res.status}). Your session tokens may be expired.\n` +
        '  → Open https://access.mymind.com in Chrome\n' +
        '  → DevTools → Application → Cookies → copy fresh _jwt and _cid\n' +
        '  → DevTools → Network → copy x-authenticity-token header from any request'
      );
    }
    throw new Error(`mymind API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json() as Record<string, MymindCard>;

  if (typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`Unexpected mymind response shape: ${typeof data}`);
  }

  return Object.entries(data).map(([slug, card]) => ({ slug, card }));
}

// ==================== CSV MODE ====================

async function parseCsvFile(csvPath: string): Promise<{ slug: string; card: MymindCard }[]> {
  return new Promise((resolve, reject) => {
    const items: { slug: string; card: MymindCard }[] = [];
    const parser = parse({ columns: true, skip_empty_lines: true, trim: true });

    parser.on('readable', () => {
      let record: MymindCsvRow;
      while ((record = parser.read()) !== null) {
        const slug = record.id || `csv-${Date.now()}-${Math.random()}`;
        const tagNames = (record.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
        items.push({
          slug,
          card: {
            title: record.title,
            description: record.text || record.content,
            source: record.url ? { url: record.url } : undefined,
            tags: tagNames.map((name) => ({ id: name, name })),
            created: record.created_at || record.createdAt || record.date,
            type: record.type,
          },
        });
      }
    });

    parser.on('error', reject);
    parser.on('end', () => resolve(items));
    createReadStream(csvPath).pipe(parser);
  });
}

// ==================== NORMALIZE ====================

function inferType(card: MymindCard): VelumMymindItem['type'] {
  const t = (card.type || '').toLowerCase();
  if (t.includes('note')) return 'note';
  if (t.includes('quote')) return 'quote';
  if (t.includes('highlight')) return 'highlight';
  if (t.includes('image') || t.includes('photo')) return 'image';

  // Infer from content when type field absent
  if (card.prose && !card.source?.url) return 'note';
  if (card.source?.url) return 'bookmark';
  if (card.ocr) return 'image';
  return 'bookmark';
}

function normalizeCard(slug: string, card: MymindCard): VelumMymindItem {
  // Extract text content: prefer prose (Notes), then description, then OCR
  let content = '';
  if (card.prose) {
    content = proseToText(card.prose);
  } else if (card.note?.prose) {
    content = proseToText(card.note.prose);
  }
  if (!content && card.description) content = card.description;
  if (!content && card.ocr) content = card.ocr;

  const url = card.source?.url || '';
  const tags = (card.tags || []).map((t) => t.name).filter(Boolean);
  const createdAt = card.created || card.modified || new Date().toISOString();

  // source label: siteName, domain, or extracted from URL
  let source = card.siteName || card.domain || '';
  if (!source && url) {
    try { source = new URL(url).hostname.replace(/^www\./, ''); } catch { /* ignore */ }
  }

  return {
    mymind_id: slug,
    type: inferType(card),
    title: card.title || '',
    content,
    url,
    image_url: '',
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
    console.error('Error: provide either JWT credentials or MYMIND_CSV.\n');
    console.error('JWT mode (recommended):');
    console.error('  1. Open https://access.mymind.com → log in');
    console.error('  2. DevTools → Application → Cookies');
    console.error('     Copy "_jwt" value → MYMIND_JWT');
    console.error('     Copy "_cid" value → MYMIND_CID');
    console.error('  3. DevTools → Network → any XHR to access.mymind.com');
    console.error('     Copy "x-authenticity-token" header → MYMIND_AUTH_TOKEN');
    console.error('  MYMIND_JWT=<jwt> MYMIND_CID=<cid> MYMIND_AUTH_TOKEN=<token> npx tsx scripts/sync-mymind.ts\n');
    console.error('CSV mode (manual export fallback):');
    console.error('  1. mymind.com → Account (cog icon) → Export my mind → cards.csv');
    console.error('  MYMIND_CSV=/path/to/cards.csv npx tsx scripts/sync-mymind.ts');
    process.exit(1);
  }

  console.log(`API target: ${VELUM_API_BASE}`);
  console.log(`Mode: ${MYMIND_JWT ? 'JWT (live sync)' : 'CSV import'}\n`);

  let entries: { slug: string; card: MymindCard }[] = [];

  if (MYMIND_JWT) {
    console.log('1. Fetching items from mymind API...');
    entries = await fetchAllJWT();
  } else if (MYMIND_CSV) {
    console.log(`1. Parsing CSV: ${MYMIND_CSV}...`);
    entries = await parseCsvFile(MYMIND_CSV);
  }

  console.log(`   Total raw items: ${entries.length}\n`);

  const normalized = entries
    .map(({ slug, card }) => normalizeCard(slug, card))
    .filter((i) => i.content || i.url || i.title);

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
