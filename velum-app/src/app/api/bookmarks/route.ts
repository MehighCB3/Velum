/**
 * /api/bookmarks — X bookmarks CRUD endpoint
 *
 * GET  ?limit=50&offset=0&all=false  → list bookmarks
 * POST { bookmarks: [...] }           → upsert batch of bookmarks (from scraper)
 * PATCH { tweet_id, dismissed }       → dismiss / undismiss a bookmark
 * DELETE ?tweet_id=...                → remove a bookmark
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getBookmarks,
  getBookmarkCount,
  upsertBookmarks,
  dismissBookmark,
  undismissBookmark,
  deleteBookmark,
  BookmarkInput,
} from '../../lib/bookmarksStore';

export const dynamic = 'force-dynamic';

// ==================== GET ====================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit')) || 50;
    const offset = Number(searchParams.get('offset')) || 0;
    const includeDismissed = searchParams.get('all') === 'true';

    const [bookmarks, counts] = await Promise.all([
      getBookmarks({ limit, offset, includeDismissed }),
      getBookmarkCount(),
    ]);

    return NextResponse.json({
      bookmarks,
      total: counts.total,
      active: counts.active,
    });
  } catch (error) {
    console.error('GET /api/bookmarks error:', error);
    return NextResponse.json(
      { error: 'Failed to load bookmarks' },
      { status: 500 },
    );
  }
}

// ==================== POST (batch upsert from scraper) ====================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate API key if set (protects the write endpoint)
    const apiKey = process.env.BOOKMARKS_API_KEY;
    if (apiKey) {
      const auth = request.headers.get('authorization');
      if (auth !== `Bearer ${apiKey}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const bookmarks: BookmarkInput[] = body.bookmarks;
    if (!Array.isArray(bookmarks) || bookmarks.length === 0) {
      return NextResponse.json(
        { error: 'Body must include bookmarks array' },
        { status: 400 },
      );
    }

    const inserted = await upsertBookmarks(bookmarks);

    return NextResponse.json({
      success: true,
      processed: bookmarks.length,
      inserted,
    });
  } catch (error) {
    console.error('POST /api/bookmarks error:', error);
    return NextResponse.json(
      { error: 'Failed to store bookmarks' },
      { status: 500 },
    );
  }
}

// ==================== PATCH (dismiss / undismiss) ====================

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { tweet_id, dismissed } = body;

    if (!tweet_id) {
      return NextResponse.json(
        { error: 'tweet_id is required' },
        { status: 400 },
      );
    }

    const success = dismissed
      ? await dismissBookmark(tweet_id)
      : await undismissBookmark(tweet_id);

    return NextResponse.json({ success });
  } catch (error) {
    console.error('PATCH /api/bookmarks error:', error);
    return NextResponse.json(
      { error: 'Failed to update bookmark' },
      { status: 500 },
    );
  }
}

// ==================== DELETE ====================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tweetId = searchParams.get('tweet_id');

    if (!tweetId) {
      return NextResponse.json(
        { error: 'tweet_id query param is required' },
        { status: 400 },
      );
    }

    const success = await deleteBookmark(tweetId);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('DELETE /api/bookmarks error:', error);
    return NextResponse.json(
      { error: 'Failed to delete bookmark' },
      { status: 500 },
    );
  }
}
