// Velum v2 design system — warm palette from redesign spec
// Reference: VELUM-V2-SPEC.md + velum-redesign.jsx

export const colors = {
  // Core v2 palette
  bg: '#faf8f5',
  card: '#ffffff',
  sidebar: '#faf8f5',
  hover: '#f5f3ef',
  border: '#f0ece6',
  borderSubtle: '#f5f3ef',
  text: '#2d2a26',
  textLight: '#b5b0a8',
  textMuted: '#a09b93',
  accent: '#c4956a',

  // Dark surfaces (hero cards)
  dark: '#1e1c19',
  darkInner: '#2a2825',
  darkSecondary: '#2a2825',
  darkTertiary: '#2a2825',
  darkText: '#ffffff',
  darkTextSecondary: '#a09b93',
  darkTextMuted: '#706b63',

  // Semantic colors
  success: '#6ec87a',
  warning: '#e8a85c',
  error: '#e85c5c',
  info: '#6ba3d6',
  purple: '#9b8ed6',

  // Macro colors (nutrition)
  calories: '#c4956a',
  protein: '#6ba3d6',
  carbs: '#6ec87a',
  fat: '#e8a85c',

  // Category colors (budget)
  food: '#e8a85c',
  fun: '#9b8ed6',
  transport: '#6ba3d6',
  subscriptions: '#6ec87a',
  other: '#b5b0a8',

  // Fitness extra
  gym: '#9b8ed6',

  // Fitness colors
  steps: '#c4956a',
  run: '#6ba3d6',
  swim: '#6ec87a',
  cycle: '#e8a85c',
  jiujitsu: '#e85c5c',

  // Recovery status
  recoveryGood: '#6ec87a',
  recoveryFair: '#e8a85c',
  recoveryPoor: '#e85c5c',

  // Tab bar
  tabActive: '#c4956a',
  tabInactive: '#b5b0a8',
} as const;

export type ColorKey = keyof typeof colors;
