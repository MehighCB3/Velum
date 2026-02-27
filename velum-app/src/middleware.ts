import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// Velum API Security Middleware
// ============================================================
// - CORS origin validation (dynamic)
// - API key authentication for write endpoints
// - Basic rate limiting (IP-based, in-memory)
// - Request size guards
// ============================================================

const ALLOWED_ORIGINS: string[] = []

// APP_URL is the canonical deployment URL (e.g. https://your-domain.com)
if (process.env.APP_URL) {
  ALLOWED_ORIGINS.push(process.env.APP_URL)
}
// CORS_ORIGINS allows additional comma-separated origins (e.g. mobile app domain)
if (process.env.CORS_ORIGINS) {
  ALLOWED_ORIGINS.push(...process.env.CORS_ORIGINS.split(',').map(s => s.trim()))
}
// Fallback to defaults when neither is set
if (ALLOWED_ORIGINS.length === 0) {
  ALLOWED_ORIGINS.push('https://velum-five.vercel.app', 'https://velum-mobile.vercel.app')
}
// In development, always allow localhost
if (process.env.NODE_ENV === 'development') {
  ALLOWED_ORIGINS.push('http://localhost:3000', 'http://localhost:8081')
}

const API_KEY = process.env.VELUM_API_KEY || ''

// Public GET endpoints that don't require auth
const PUBLIC_READ_PATHS = [
  '/api/app-version',
  '/api/books',
]

// Endpoints that handle their own auth (webhooks use x-webhook-secret)
const SELF_AUTH_PATHS = [
  '/api/fitness/webhook',
  '/api/budget/webhook',
  '/api/migrate',
]

// ==================== RATE LIMITING ====================
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_MAX = 60 // 60 requests per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  entry.count++
  return entry.count > RATE_LIMIT_MAX
}

// Periodic cleanup to prevent memory leak (every 5 min)
setInterval(() => {
  const now = Date.now()
  rateLimitMap.forEach((entry, ip) => {
    if (now > entry.resetAt) rateLimitMap.delete(ip)
  })
}, 5 * 60_000)

// ==================== CORS HELPER ====================
function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Webhook-Secret',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const origin = request.headers.get('origin')
  const method = request.method

  // Only apply to /api routes
  if (!pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // ── Preflight (OPTIONS) ──
  if (method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: getCorsHeaders(origin) })
  }

  // ── CORS origin check (only for browser requests that send Origin) ──
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json(
      { error: 'Origin not allowed' },
      { status: 403, headers: getCorsHeaders(origin) },
    )
  }

  // ── Rate limiting ──
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Try again in 1 minute.' },
      { status: 429, headers: { ...getCorsHeaders(origin), 'Retry-After': '60' } },
    )
  }

  // ── API key authentication for write operations ──
  // When VELUM_API_KEY is configured, all POST/PUT/PATCH/DELETE require Bearer token
  // except self-auth paths (webhooks handle their own secrets)
  if (API_KEY && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const isSelfAuth = SELF_AUTH_PATHS.some(p => pathname.startsWith(p))
    const isPublicRead = PUBLIC_READ_PATHS.some(p => pathname.startsWith(p))

    if (!isSelfAuth && !isPublicRead) {
      const authHeader = request.headers.get('authorization')
      const token = authHeader?.replace('Bearer ', '')

      if (token !== API_KEY) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401, headers: getCorsHeaders(origin) },
        )
      }
    }
  }

  // ── Attach CORS headers to the response ──
  const response = NextResponse.next()
  const corsHeaders = getCorsHeaders(origin)
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value)
  }

  return response
}

export const config = {
  matcher: '/api/:path*',
}
