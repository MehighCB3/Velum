import { NextResponse } from 'next/server';

const GITHUB_OWNER = 'MehighCB3';
const GITHUB_REPO = 'Velum';
const GITHUB_RELEASES_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

// In-memory cache (5-minute TTL)
let cached: { data: Record<string, unknown>; ts: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

// Fallback when GitHub is unreachable
const FALLBACK_VERSION = '1.6.0';

// CORS is handled by middleware — these are kept for OPTIONS preflight only
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://velum-five.vercel.app',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=300',
};

async function fetchLatestRelease() {
  // Return cache if fresh
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const res = await fetch(GITHUB_RELEASES_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Velum-API',
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      throw new Error(`GitHub API returned ${res.status}`);
    }

    const release = await res.json();
    const version = (release.tag_name || '').replace(/^v/, '') || FALLBACK_VERSION;

    const apkAsset = (release.assets || []).find(
      (a: { name?: string }) => a.name?.endsWith('.apk'),
    );

    const data = {
      version,
      apkUrl: apkAsset?.browser_download_url || null,
      apkSize: apkAsset?.size || null,
      releaseNotes: release.body || null,
      releaseUrl: release.html_url || null,
    };

    cached = { data, ts: Date.now() };
    return data;
  } catch (err) {
    console.warn('Failed to fetch GitHub release:', err);

    // Return stale cache if available
    if (cached) return cached.data;

    // Final fallback
    return {
      version: FALLBACK_VERSION,
      apkUrl: null,
      apkSize: null,
      releaseNotes: null,
      releaseUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`,
    };
  }
}

export async function GET() {
  const data = await fetchLatestRelease();
  return NextResponse.json(data, { headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
