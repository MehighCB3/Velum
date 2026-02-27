// Shared API configuration — single source of truth for the base URL.
// Import this instead of redefining API_BASE in each file.
//
// For self-hosted deployments, set EXPO_PUBLIC_API_URL in your .env
// to point at your own Velum instance (e.g. http://192.168.1.50:3000).
export const API_BASE = __DEV__
  ? (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000')
  : (process.env.EXPO_PUBLIC_API_URL || 'https://velum-five.vercel.app');
