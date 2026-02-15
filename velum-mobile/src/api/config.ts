// Shared API configuration — single source of truth for the base URL.
// Import this instead of redefining API_BASE in each file.
export const API_BASE = __DEV__
  ? 'http://localhost:3000'
  : 'https://velum-five.vercel.app';
