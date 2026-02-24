#!/usr/bin/env npx tsx
/**
 * fetch-x-bookmarks.ts — Scrape X bookmarks using session cookies
 *
 * Uses X's internal GraphQL API (same one the browser uses) to fetch
 * your bookmarked tweets, then pushes them to the Velum API.
 *
 * Required env vars:
 *   X_AUTH_TOKEN    — your auth_token cookie from x.com
 *   X_CSRF_TOKEN    — your ct0 cookie from x.com
 *   VELUM_API_BASE  — e.g. https://velum-five.vercel.app (default)
 *   BOOKMARKS_API_KEY — optional, must match server-side key
 *
 * How to get your cookies:
 *   1. Open x.com in Chrome/Firefox, log in
 *   2. Open DevTools → Application → Cookies → https://x.com
 *   3. Copy the value of "auth_token" → X_AUTH_TOKEN
 *   4. Copy the value of "ct0" → X_CSRF_TOKEN
 *
 * Usage:
 *   npx tsx scripts/fetch-x-bookmarks.ts
 *   # or with env vars inline:
 *   X_AUTH_TOKEN=xxx X_CSRF_TOKEN=yyy npx tsx scripts/fetch-x-bookmarks.ts
 */

const X_AUTH_TOKEN = process.env.X_AUTH_TOKEN;
const X_CSRF_TOKEN = process.env.X_CSRF_TOKEN;
const VELUM_API_BASE = process.env.VELUM_API_BASE || 'https://velum-five.vercel.app';
const BOOKMARKS_API_KEY = process.env.BOOKMARKS_API_KEY || '';

// X's internal GraphQL endpoint for bookmarks
// X rotates query IDs on deploys — override via env var when stale
const BOOKMARKS_QUERY_ID = process.env.X_BOOKMARKS_QUERY_ID || 'eylgGMXVNrFjYg2UGPhV4g';
const BOOKMARKS_URL = `https://x.com/i/api/graphql/${BOOKMARKS_QUERY_ID}/Bookmarks`;

// Features param required by X's GraphQL API
const FEATURES = {
  graphql_timeline_v2_bookmark_timeline: true,
  rweb_tipjar_consumption_enabled: true,
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  communities_web_enable_tweet_community_results_my_community: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  articles_preview_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  tweetypie_unmention_optimization_enabled: true,
  responsive_web_uc_gql_enabled: true,
  vibe_api_enabled: true,
  responsive_web_text_conversations_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  responsive_web_enhance_cards_enabled: false,
  responsive_web_media_download_video_enabled: false,
  premium_content_api_read_enabled: false,
};

interface TweetResult {
  tweet_id: string;
  author_handle: string;
  author_name: string;
  text: string;
  url: string;
  created_at: string;
}

async function fetchBookmarksPage(cursor?: string): Promise<{
  tweets: TweetResult[];
  nextCursor: string | null;
}> {
  if (!X_AUTH_TOKEN || !X_CSRF_TOKEN) {
    throw new Error('X_AUTH_TOKEN and X_CSRF_TOKEN are required');
  }

  const variables: Record<string, unknown> = { count: 100 };
  if (cursor) variables.cursor = cursor;

  const params = new URLSearchParams({
    variables: JSON.stringify(variables),
    features: JSON.stringify(FEATURES),
  });

  const res = await fetch(`${BOOKMARKS_URL}?${params}`, {
    headers: {
      authorization: `Bearer ${process.env.X_BEARER_TOKEN || ''}`,
      cookie: `auth_token=${X_AUTH_TOKEN}; ct0=${X_CSRF_TOKEN}`,
      'x-csrf-token': X_CSRF_TOKEN,
      'x-twitter-auth-type': 'OAuth2Session',
      'x-twitter-active-user': 'yes',
      'content-type': 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 404) {
      throw new Error(
        `X API 404 — the GraphQL query ID is likely stale (current: ${BOOKMARKS_QUERY_ID}).\n` +
        `  Fix: open x.com/i/bookmarks → DevTools → Network → filter "graphql" →\n` +
        `  copy the ID from the Bookmarks request URL, then re-run with:\n` +
        `  X_BOOKMARKS_QUERY_ID=<new_id> npx tsx scripts/fetch-x-bookmarks.ts`
      );
    }
    throw new Error(`X API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const tweets: TweetResult[] = [];
  let nextCursor: string | null = null;

  // Navigate the GraphQL response structure
  const timeline =
    data?.data?.bookmark_timeline_v2?.timeline?.instructions || [];

  for (const instruction of timeline) {
    const entries = instruction.entries || [];

    for (const entry of entries) {
      // Cursor entries for pagination
      if (entry.entryId?.startsWith('cursor-bottom-')) {
        nextCursor = entry.content?.value || null;
        continue;
      }

      // Tweet entries
      const tweetResult =
        entry.content?.itemContent?.tweet_results?.result;
      if (!tweetResult) continue;

      // Handle tweets that might be wrapped in a tombstone or restricted tweet
      const tweet = tweetResult.__typename === 'TweetWithVisibilityResults'
        ? tweetResult.tweet
        : tweetResult;

      if (!tweet?.legacy || !tweet?.core?.user_results?.result?.legacy) continue;

      const user = tweet.core.user_results.result.legacy;
      const legacy = tweet.legacy;

      tweets.push({
        tweet_id: legacy.id_str || tweet.rest_id || '',
        author_handle: `@${user.screen_name}`,
        author_name: user.name || user.screen_name,
        text: legacy.full_text || '',
        url: `https://x.com/${user.screen_name}/status/${legacy.id_str || tweet.rest_id}`,
        created_at: legacy.created_at || '',
      });
    }
  }

  return { tweets, nextCursor };
}

async function fetchAllBookmarks(maxPages = 5): Promise<TweetResult[]> {
  const allTweets: TweetResult[] = [];
  let cursor: string | undefined;
  let page = 0;

  while (page < maxPages) {
    console.log(`  Fetching page ${page + 1}...`);
    const { tweets, nextCursor } = await fetchBookmarksPage(cursor);

    allTweets.push(...tweets);
    console.log(`  Got ${tweets.length} tweets (total: ${allTweets.length})`);

    if (!nextCursor || tweets.length === 0) break;
    cursor = nextCursor;
    page++;

    // Rate limiting: wait 2s between pages
    await new Promise((r) => setTimeout(r, 2000));
  }

  return allTweets;
}

async function pushToVelum(tweets: TweetResult[]): Promise<void> {
  if (tweets.length === 0) {
    console.log('  No tweets to push.');
    return;
  }

  const bookmarks = tweets.map((t) => ({
    tweet_id: t.tweet_id,
    author_handle: t.author_handle,
    author_name: t.author_name,
    text: t.text,
    url: t.url,
    created_at: t.created_at,
    tags: [],
  }));

  // Push in batches of 50
  const BATCH_SIZE = 50;
  for (let i = 0; i < bookmarks.length; i += BATCH_SIZE) {
    const batch = bookmarks.slice(i, i + BATCH_SIZE);
    console.log(`  Pushing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} items)...`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (BOOKMARKS_API_KEY) {
      headers['Authorization'] = `Bearer ${BOOKMARKS_API_KEY}`;
    }

    const res = await fetch(`${VELUM_API_BASE}/api/bookmarks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ bookmarks: batch }),
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
  console.log('=== Velum X Bookmarks Sync ===\n');

  if (!X_AUTH_TOKEN || !X_CSRF_TOKEN) {
    console.error('Error: X_AUTH_TOKEN and X_CSRF_TOKEN environment variables are required.');
    console.error('\nHow to get them:');
    console.error('  1. Open x.com in your browser, log in');
    console.error('  2. DevTools → Application → Cookies → https://x.com');
    console.error('  3. Copy "auth_token" → X_AUTH_TOKEN');
    console.error('  4. Copy "ct0" → X_CSRF_TOKEN');
    console.error('\nUsage:');
    console.error('  X_AUTH_TOKEN=xxx X_CSRF_TOKEN=yyy npx tsx scripts/fetch-x-bookmarks.ts');
    process.exit(1);
  }

  console.log(`API target: ${VELUM_API_BASE}`);
  console.log('');

  console.log('1. Fetching bookmarks from X...');
  const tweets = await fetchAllBookmarks();
  console.log(`   Total: ${tweets.length} bookmarks\n`);

  if (tweets.length > 0) {
    console.log('   Sample:');
    tweets.slice(0, 3).forEach((t) => {
      console.log(`   ${t.author_handle}: ${t.text.slice(0, 80)}...`);
    });
    console.log('');
  }

  console.log('2. Pushing to Velum API...');
  await pushToVelum(tweets);
  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
