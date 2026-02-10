// Velum design system — Notion-inspired palette adapted for mobile
// Matches the web app's tailwind.config.js color scheme

export const colors = {
  // Core Notion palette
  bg: '#ffffff',
  sidebar: '#f7f6f3',
  hover: '#ebebea',
  border: '#e3e2e0',
  text: '#37352f',
  textLight: '#9b9a97',
  accent: '#2eaadc',

  // Dark surfaces (hero cards, headers)
  dark: '#1c1917',
  darkSecondary: '#292524',
  darkTertiary: '#44403c',

  // Semantic colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Macro colors (nutrition)
  calories: '#f59e0b',
  protein: '#3b82f6',
  carbs: '#10b981',
  fat: '#f97316',

  // Category colors (budget)
  food: '#f97316',
  fun: '#8b5cf6',

  // Fitness colors
  steps: '#10b981',
  run: '#3b82f6',
  swim: '#06b6d4',
  cycle: '#f59e0b',
  jiujitsu: '#ef4444',

  // Recovery status
  recoveryGood: '#10b981',
  recoveryFair: '#f59e0b',
  recoveryPoor: '#ef4444',

  // Tab bar
  tabActive: '#2eaadc',
  tabInactive: '#9b9a97',
} as const;

export type ColorKey = keyof typeof colors;
