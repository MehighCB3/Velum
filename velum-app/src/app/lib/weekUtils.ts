/**
 * Shared ISO-week utilities.
 * All week keys follow the format "YYYY-Www" (e.g. "2026-W07").
 */

/** Return the ISO-week number for a date. */
export function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

/** Return the week key for a date in "YYYY-Www" format. */
export function getWeekKey(date: Date): string {
  const year = date.getFullYear()
  const week = getISOWeek(date)
  return `${year}-W${String(week).padStart(2, '0')}`
}

/** Parse a week key ("YYYY-Www") into the Monday start date. */
export function parseWeekKey(weekKey: string): Date {
  const match = weekKey.match(/^(\d{4})-W(\d{2})$/)
  if (!match) return new Date()

  const yearNum = parseInt(match[1])
  const weekNum = parseInt(match[2])

  const yearStart = new Date(Date.UTC(yearNum, 0, 1))
  const dayNum = yearStart.getUTCDay() || 7
  const weekStart = new Date(yearStart)
  weekStart.setUTCDate(yearStart.getUTCDate() + (weekNum - 1) * 7 - dayNum + 1)

  return weekStart
}

/** Return all 7 date strings (YYYY-MM-DD) in a given week. */
export function getWeekDates(weekKey: string): string[] {
  const startDate = parseWeekKey(weekKey)
  const dates: string[] = []

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate)
    date.setUTCDate(startDate.getUTCDate() + i)
    dates.push(date.toISOString().split('T')[0])
  }

  return dates
}
