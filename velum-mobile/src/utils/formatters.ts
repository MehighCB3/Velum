/**
 * Shared number formatters.
 *
 * React Native's Hermes engine crashes on toLocaleString() on some Android
 * versions, so we use plain regex-based thousand separators instead.
 */

/**
 * Format an integer with thousand separators.
 * Returns '0' for non-finite values (NaN, Infinity).
 *
 * Usage: fmt(12345) → "12,345"
 */
export function fmt(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1000 || n <= -1000) return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return String(n);
}

/**
 * Format a number with optional decimal places and thousand separators.
 * Handles negative values. Designed for currency display (€).
 *
 * Usage: fmtDecimal(1234.5, 2) → "1,234.50"
 */
export function fmtDecimal(n: number, decimals = 0): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const fixed = abs.toFixed(decimals);
  const [whole, frac] = fixed.split('.');
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac !== undefined ? `${sign}${withCommas}.${frac}` : `${sign}${withCommas}`;
}
