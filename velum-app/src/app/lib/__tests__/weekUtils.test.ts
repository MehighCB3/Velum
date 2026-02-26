import { describe, it, expect } from 'vitest'
import { getISOWeek, getWeekKey, parseWeekKey, getWeekDates } from '../weekUtils'

describe('getISOWeek', () => {
  it('returns correct week number for a known date', () => {
    // 2026-01-05 is a Monday in week 2
    expect(getISOWeek(new Date('2026-01-05'))).toBe(2)
  })

  it('handles week 1 of the year', () => {
    // 2025-12-29 is Monday of ISO week 1 of 2026
    expect(getISOWeek(new Date('2025-12-29'))).toBe(1)
  })

  it('handles last week of year', () => {
    expect(getISOWeek(new Date('2025-12-28'))).toBe(52)
  })
})

describe('getWeekKey', () => {
  it('returns YYYY-Www format', () => {
    const key = getWeekKey(new Date('2026-02-26'))
    expect(key).toMatch(/^\d{4}-W\d{2}$/)
  })

  it('pads single-digit weeks', () => {
    const key = getWeekKey(new Date('2026-01-05'))
    expect(key).toBe('2026-W02')
  })

  it('handles mid-year dates', () => {
    const key = getWeekKey(new Date('2026-06-15'))
    expect(key).toMatch(/^2026-W\d{2}$/)
  })
})

describe('parseWeekKey', () => {
  it('returns a Monday for a valid week key', () => {
    const date = parseWeekKey('2026-W09')
    expect(date.getUTCDay()).toBe(1) // Monday
  })

  it('returns current date for invalid input', () => {
    const date = parseWeekKey('invalid')
    expect(date).toBeInstanceOf(Date)
  })

  it('round-trips with getWeekKey', () => {
    const original = '2026-W09'
    const parsed = parseWeekKey(original)
    const roundTripped = getWeekKey(parsed)
    expect(roundTripped).toBe(original)
  })
})

describe('getWeekDates', () => {
  it('returns 7 dates', () => {
    const dates = getWeekDates('2026-W09')
    expect(dates).toHaveLength(7)
  })

  it('returns dates in YYYY-MM-DD format', () => {
    const dates = getWeekDates('2026-W09')
    for (const d of dates) {
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('starts on Monday', () => {
    const dates = getWeekDates('2026-W09')
    const firstDay = new Date(dates[0])
    expect(firstDay.getUTCDay()).toBe(1) // Monday
  })

  it('ends on Sunday', () => {
    const dates = getWeekDates('2026-W09')
    const lastDay = new Date(dates[6])
    expect(lastDay.getUTCDay()).toBe(0) // Sunday
  })

  it('has consecutive dates', () => {
    const dates = getWeekDates('2026-W09')
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]).getTime()
      const curr = new Date(dates[i]).getTime()
      expect(curr - prev).toBe(86400000) // exactly 1 day
    }
  })
})
