import { describe, it, expect } from 'vitest'
import { parseFitnessMessage, buildEntryData } from '../fitnessParser'

describe('parseFitnessMessage', () => {
  describe('steps', () => {
    it('parses "8000 steps"', () => {
      const result = parseFitnessMessage('8000 steps')
      expect(result).not.toBeNull()
      expect(result!.type).toBe('steps')
      expect(result!.steps).toBe(8000)
    })

    it('parses "steps 12000"', () => {
      const result = parseFitnessMessage('steps 12000')
      expect(result).not.toBeNull()
      expect(result!.type).toBe('steps')
      expect(result!.steps).toBe(12000)
    })
  })

  describe('running', () => {
    it('parses "5k run 30min"', () => {
      const result = parseFitnessMessage('5k run 30min')
      expect(result).not.toBeNull()
      expect(result!.type).toBe('run')
      expect(result!.distance).toBe(5)
      expect(result!.duration).toBe(30)
    })

    it('parses "run 10km 45min"', () => {
      const result = parseFitnessMessage('run 10km 45min')
      expect(result).not.toBeNull()
      expect(result!.type).toBe('run')
      expect(result!.distance).toBe(10)
      expect(result!.duration).toBe(45)
    })
  })

  describe('swimming', () => {
    it('parses "swim 1000m 20min"', () => {
      const result = parseFitnessMessage('swim 1000m 20min')
      expect(result).not.toBeNull()
      expect(result!.type).toBe('swim')
      expect(result!.distance).toBe(1) // 1000m = 1km
      expect(result!.duration).toBe(20)
    })

    it('parses "swim 1.5km 30min 300cal"', () => {
      const result = parseFitnessMessage('swim 1.5km 30min 300cal')
      expect(result).not.toBeNull()
      expect(result!.type).toBe('swim')
      expect(result!.distance).toBe(1.5)
      expect(result!.calories).toBe(300)
    })
  })

  describe('health metrics', () => {
    it('parses "vo2max 47"', () => {
      const result = parseFitnessMessage('vo2max 47')
      expect(result).not.toBeNull()
      expect(result!.type).toBe('vo2max')
      expect(result!.vo2max).toBe(47)
    })

    it('parses "hrv 58"', () => {
      const result = parseFitnessMessage('hrv 58')
      expect(result).not.toBeNull()
      expect(result!.type).toBe('hrv')
      expect(result!.hrv).toBe(58)
    })

    it('parses "weight 78.5"', () => {
      const result = parseFitnessMessage('weight 78.5')
      expect(result).not.toBeNull()
      expect(result!.type).toBe('weight')
      expect(result!.weight).toBe(78.5)
    })

    it('parses "body fat 18%"', () => {
      const result = parseFitnessMessage('body fat 18%')
      expect(result).not.toBeNull()
      expect(result!.type).toBe('body_fat')
      expect(result!.bodyFat).toBe(18)
    })

    it('parses "stress 40"', () => {
      const result = parseFitnessMessage('stress 40')
      expect(result).not.toBeNull()
      expect(result!.type).toBe('stress')
      expect(result!.stressLevel).toBe(40)
    })

    it('converts 1-5 scale stress to 0-100', () => {
      const result = parseFitnessMessage('stress 3')
      expect(result).not.toBeNull()
      expect(result!.type).toBe('stress')
      expect(result!.stressLevel).toBe(60) // 3/5 * 100
    })

    it('parses "recovery 85"', () => {
      const result = parseFitnessMessage('recovery 85')
      expect(result).not.toBeNull()
      expect(result!.type).toBe('recovery')
      expect(result!.recoveryScore).toBe(85)
    })
  })

  describe('sleep', () => {
    it('parses "slept 7.5h"', () => {
      const result = parseFitnessMessage('slept 7.5h')
      expect(result).not.toBeNull()
      expect(result!.type).toBe('sleep')
      expect(result!.sleepHours).toBe(7.5)
    })

    it('parses "sleep 8h score 82"', () => {
      const result = parseFitnessMessage('sleep 8h score 82')
      expect(result).not.toBeNull()
      expect(result!.type).toBe('sleep')
      expect(result!.sleepHours).toBe(8)
      expect(result!.sleepScore).toBe(82)
    })
  })

  describe('jiu-jitsu', () => {
    it('parses "bjj 90min"', () => {
      const result = parseFitnessMessage('bjj 90min')
      expect(result).not.toBeNull()
      expect(result!.type).toBe('jiujitsu')
      expect(result!.duration).toBe(90)
    })

    it('parses "jiu-jitsu 60min"', () => {
      const result = parseFitnessMessage('jiu-jitsu 60min')
      expect(result).not.toBeNull()
      expect(result!.type).toBe('jiujitsu')
    })
  })

  describe('cycling', () => {
    it('parses "cycle 20km 52min"', () => {
      const result = parseFitnessMessage('cycle 20km 52min')
      expect(result).not.toBeNull()
      expect(result!.type).toBe('cycle')
      expect(result!.distance).toBe(20)
      expect(result!.duration).toBe(52)
    })

    it('parses "commute 12km 28min"', () => {
      const result = parseFitnessMessage('commute 12km 28min')
      expect(result).not.toBeNull()
      expect(result!.type).toBe('cycle')
      expect(result!.name).toBe('Commute')
    })
  })

  describe('edge cases', () => {
    it('returns null for unrecognized input', () => {
      expect(parseFitnessMessage('hello world')).toBeNull()
    })

    it('includes date on all results', () => {
      const result = parseFitnessMessage('8000 steps')
      expect(result!.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })
})

describe('buildEntryData', () => {
  it('builds correct data for steps', () => {
    const parsed = parseFitnessMessage('8000 steps')!
    const data = buildEntryData(parsed)
    expect(data.type).toBe('steps')
    expect(data.steps).toBe(8000)
    expect(data.date).toBeDefined()
  })

  it('builds correct data for run', () => {
    const parsed = parseFitnessMessage('run 5km 25min')!
    const data = buildEntryData(parsed)
    expect(data.type).toBe('run')
    expect(data.distance).toBe(5)
    expect(data.duration).toBe(25)
  })

  it('sets name to Jiu-Jitsu for jiujitsu type', () => {
    const parsed = parseFitnessMessage('bjj 90min')!
    const data = buildEntryData(parsed)
    expect(data.name).toBe('Jiu-Jitsu')
  })
})
