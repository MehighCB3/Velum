// Velum v4 design system — warm terracotta palette from redesign spec
// Reference: velum-app/src/app/redesign/

export const colors = {
  // Core palette — warmer cream tones
  bg: '#f7f4f0',
  card: '#ffffff',
  sidebar: '#f7f4f0',
  hover: '#f0ece6',
  border: '#e8e2d8',
  borderSubtle: '#f0ece6',
  borderLight: '#f0ece6',
  subtle: '#f0ece6',
  text: '#1a1814',
  textLight: '#a09890',
  textMuted: '#a09890',
  textSub: '#6b6560',
  muted: '#a09890',
  dimmed: '#6b6560',
  faint: '#6b6560',
  accent: '#b86a3a',
  accentWarm: '#d4854d',
  accentLight: '#f0e0d0',

  // Dark surfaces (hero cards)
  dark: '#1a1814',
  darkMid: '#242220',
  darkInner: '#2a2825',
  darkSecondary: '#242220',
  darkTertiary: '#2a2825',
  darkText: '#ffffff',
  darkTextSecondary: '#a09890',
  darkTextMuted: '#706b63',

  // Semantic colors
  success: '#6fcf97',
  warning: '#e8a85c',
  error: '#eb5757',
  danger: '#eb5757',
  info: '#4a9eed',
  purple: '#7c6ae0',
  blue: '#4a9eed',
  green: '#4a7c59',
  greenLight: '#e8f3ec',
  red: '#c0392b',
  redLight: '#fdecea',

  // Macro colors (nutrition)
  calories: '#b86a3a',
  protein: '#d4854d',
  carbsGreen: '#8aab6e',
  carbs: '#8aab6e',
  fatBlue: '#6ab3c8',
  fat: '#6ab3c8',

  // Category colors (budget)
  food: '#d4854d',
  fun: '#7c6ae0',
  transport: '#4a9eed',
  subscriptions: '#6b6560',
  other: '#a09890',

  // Fitness extra
  gym: '#7c6ae0',

  // Fitness colors
  steps: '#b86a3a',
  run: '#4a9eed',
  swim: '#6ab3c8',
  cycle: '#d4854d',
  jiujitsu: '#eb5757',

  // Recovery status
  recoveryGood: '#6fcf97',
  recoveryFair: '#d4854d',
  recoveryPoor: '#eb5757',

  // Tab bar
  tabActive: '#b86a3a',
  tabInactive: '#a09890',
} as const;

export type ColorKey = keyof typeof colors;
