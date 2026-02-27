/** @type {import('next').NextConfig} */

// Canonical app URL — set APP_URL in env for self-hosted deployments
const APP_URL = process.env.APP_URL || 'https://velum-five.vercel.app';

const nextConfig = {
  reactStrictMode: true,
  // Standalone output for Docker deployments
  output: process.env.DOCKER_BUILD === '1' ? 'standalone' : undefined,
  // Allow pg and ioredis native Node modules in server components
  serverExternalPackages: ['pg', 'ioredis'],
  async headers() {
    return [
      {
        // CORS for API routes — origin controlled by middleware,
        // this is a fallback for static responses
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: APP_URL },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Webhook-Secret' },
        ],
      },
      {
        // Security headers for all routes
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
