// Velum v3 spacing constants — single source of truth for layout values
import { Dimensions } from 'react-native';

export const SCREEN_WIDTH = Dimensions.get('window').width;

export const spacing = {
  /** Standard horizontal padding for screen content */
  screenPadding: 16,
  /** Wider horizontal padding (dashboard, feed, profile) */
  screenPaddingLarge: 20,
  /** Standard top padding for scroll content */
  screenPaddingTop: 12,
  /** Tighter top padding (dashboard) */
  screenPaddingTopCompact: 8,
  /** Card border radius */
  cardRadius: 16,
  /** Bottom spacer to clear tab bar + FAB */
  bottomSpacer: 100,
  /** FAB bottom offset */
  fabBottom: 24,
  /** FAB right offset */
  fabRight: 20,
} as const;
