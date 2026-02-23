import { NextRequest, NextResponse } from 'next/server';
import {
  getMymindItems,
  getMymindCount,
  upsertMymindItems,
  dismissMymindItem,
  undismissMymindItem,
  MymindItemInput,
} from '../../lib/mymindStore';

const MYMIND_API_KEY = process.env.MYMIND_API_KEY || '';

// GET /api/mymind?limit=50&offset=0&all=false&type=bookmark
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');
  const includeDismissed = searchParams.get('all') === 'true';
  const type = searchParams.get('type') as Parameters<typeof getMymindItems>[0]['type'];

  const [items, counts] = await Promise.all([
    getMymindItems({ limit, offset, includeDismissed, type }),
    getMymindCount(),
  ]);

  return NextResponse.json({ items, total: counts.total, active: counts.active });
}

// POST /api/mymind — batch upsert from sync script
export async function POST(req: NextRequest) {
  if (MYMIND_API_KEY) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${MYMIND_API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const body = await req.json();
  const items: MymindItemInput[] = body.items || [];

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ inserted: 0 });
  }

  const inserted = await upsertMymindItems(items);
  return NextResponse.json({ inserted });
}

// PATCH /api/mymind — dismiss or undismiss
export async function PATCH(req: NextRequest) {
  const { mymind_id, dismissed } = await req.json();

  if (!mymind_id) {
    return NextResponse.json({ error: 'mymind_id required' }, { status: 400 });
  }

  const ok = dismissed
    ? await dismissMymindItem(mymind_id)
    : await undismissMymindItem(mymind_id);

  return NextResponse.json({ success: ok });
}
