/**
 * Returns a human-readable relative time string (e.g. "3m ago", "2h ago", "5d ago").
 * Handles both ISO and date-parseable strings.
 */
export function timeAgo(dateString: string): string {
  if (!dateString) return '';
  const then = new Date(dateString).getTime();
  if (isNaN(then)) return '';
  const now = Date.now();
  const diffMin = Math.floor((now - then) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  return `${diffWeeks}w ago`;
}
