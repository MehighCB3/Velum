/**
 * Shared fitness message parser.
 * Used by /api/fitness/webhook and /api/coach/chat to parse
 * natural-language fitness entries (e.g. "8000 steps", "5k run 30min").
 */

export interface ParsedFitnessEntry {
  type: 'steps' | 'run' | 'swim' | 'cycle' | 'jiujitsu' | 'vo2max' | 'training_load' | 'stress' | 'recovery' | 'hrv' | 'weight' | 'body_fat' | 'sleep'
  name?: string
  steps?: number
  distance?: number      // in km
  duration?: number      // in minutes
  calories?: number
  vo2max?: number        // ml/kg/min
  trainingLoad?: number  // 0-100
  stressLevel?: number   // 0-100
  recoveryScore?: number // 0-100
  hrv?: number           // ms
  weight?: number        // kg
  bodyFat?: number       // percentage
  sleepHours?: number    // decimal hours
  sleepScore?: number    // 0-100
  date?: string
  notes?: string
}

/**
 * Parse fitness messages from natural language.
 *
 * Supported formats:
 * - "8000 steps" → steps: 8000
 * - "steps 12000" → steps: 12000
 * - "5k run 30min" → run, 5km, 30min
 * - "run 10km 45min" → run, 10km, 45min
 * - "swim 1000m 20min" → swim, 1km, 20min
 * - "swim 1.5km 30min 300cal" → swim with calories
 * - "run 5km 25min yesterday" → run logged for yesterday
 * - "10000 steps walked to work" → steps with notes
 * - "vo2max 45" / "hrv 58" / "weight 78.5" / "body fat 18"
 * - "slept 7.5h" / "sleep 8h score 82"
 * - "bjj 90min" / "jiu-jitsu 60min"
 * - "cycle 20km 52min" / "commute 12km 28min"
 * - "stress 60" / "recovery 85" / "training load 75"
 */
export function parseFitnessMessage(text: string): ParsedFitnessEntry | null {
  const lowerText = text.toLowerCase().trim()

  // Check for relative date keywords
  let targetDate = new Date().toISOString().split('T')[0]
  let notes: string | undefined

  // Extract date modifiers
  const datePatterns = [
    { pattern: /\byesterday\b/, offset: -1 },
    { pattern: /\bday before yesterday\b/, offset: -2 },
    { pattern: /\blast week\b/, offset: -7 },
  ]

  for (const { pattern, offset } of datePatterns) {
    if (pattern.test(lowerText)) {
      const date = new Date()
      date.setDate(date.getDate() + offset)
      targetDate = date.toISOString().split('T')[0]
      text = text.replace(pattern, '').trim()
    }
  }

  // Extract notes (after "for" or just trailing text)
  const notesMatch = text.match(/\bfor\s+(.+)$/i) || text.match(/-\s+(.+)$/)
  if (notesMatch) {
    notes = notesMatch[1].trim()
    text = text.replace(notesMatch[0], '').trim()
  }

  // ==================== STEPS PARSING ====================

  const stepsPattern = /^(?:(\d+(?:\.\d+)?)\s*k?\s*steps?|steps?\s+(\d+(?:\.\d+)?)\s*k?)$/i
  const stepsMatch = text.match(stepsPattern)
  if (stepsMatch) {
    const stepsStr = stepsMatch[1] || stepsMatch[2]
    let steps = parseFloat(stepsStr)
    if (text.toLowerCase().includes('k ') || text.toLowerCase().endsWith('k')) {
      steps *= 1000
    }
    return { type: 'steps', steps: Math.round(steps), date: targetDate, notes }
  }

  // ==================== RUN PARSING ====================

  const runPattern = /^(?:ran?\s+|(\d+(?:\.\d+)?)\s*(?:km?|kilometers?)\s+)?run\s+(?:(\d+(?:\.\d+)?)\s*(?:km?|kilometers?))?\s*(?:(\d+)\s*(?:min|minutes?))?/i
  const runAltPattern = /^(\d+(?:\.\d+)?)\s*(?:km?|k)\s+(?:run|ran)\s+(?:(\d+)\s*(?:min|minutes?))?/i
  const runSimplePattern = /^(?:run|running)\s+(\d+(?:\.\d+)?)\s*(?:km?|k)\s+(?:(\d+)\s*(?:min|minutes?))?/i

  const runMatch = text.match(runPattern) || text.match(runAltPattern) || text.match(runSimplePattern)

  if (runMatch || lowerText.includes('run') || lowerText.includes('ran')) {
    let distance = 0
    let duration = 0
    let calories: number | undefined

    const distancePattern = /(\d+(?:\.\d+)?)\s*(?:km|kilometers?|k\b)/i
    const distanceMatch = text.match(distancePattern)
    if (distanceMatch) distance = parseFloat(distanceMatch[1])

    const durationPattern = /(\d+)\s*(?:min|minutes?)/i
    const durationMatch = text.match(durationPattern)
    if (durationMatch) duration = parseInt(durationMatch[1])

    const caloriesPattern = /(\d+)\s*(?:cal|calories?|kcal)/i
    const caloriesMatch = text.match(caloriesPattern)
    if (caloriesMatch) calories = parseInt(caloriesMatch[1])

    if (distance > 0 || duration > 0) {
      return { type: 'run', distance, duration, calories, date: targetDate, notes }
    }
  }

  // ==================== SWIM PARSING ====================

  if (lowerText.includes('swim') || lowerText.includes('swam')) {
    let distance = 0
    let duration = 0
    let calories: number | undefined

    const metersPattern = /(\d+(?:\.\d+)?)\s*(?:m|meters?)\b/i
    const kmPattern = /(\d+(?:\.\d+)?)\s*(?:km|kilometers?)\b/i
    const metersMatch = text.match(metersPattern)
    const kmMatch = text.match(kmPattern)

    if (metersMatch) distance = parseFloat(metersMatch[1]) / 1000
    else if (kmMatch) distance = parseFloat(kmMatch[1])

    const durationPattern = /(\d+)\s*(?:min|minutes?)/i
    const durationMatch = text.match(durationPattern)
    if (durationMatch) duration = parseInt(durationMatch[1])

    const caloriesPattern = /(\d+)\s*(?:cal|calories?|kcal)/i
    const caloriesMatch = text.match(caloriesPattern)
    if (caloriesMatch) calories = parseInt(caloriesMatch[1])

    if (distance > 0 || duration > 0) {
      return { type: 'swim', distance, duration, calories, date: targetDate, notes }
    }
  }

  // ==================== VO2 MAX PARSING ====================

  if (lowerText.includes('vo2') || lowerText.includes('vo2max')) {
    const valuePattern = /(\d+(?:\.\d+)?)/
    const valueMatch = text.match(valuePattern)
    if (valueMatch) {
      const vo2max = parseFloat(valueMatch[1])
      if (vo2max > 20 && vo2max < 100) {
        return { type: 'vo2max', vo2max, date: targetDate, notes }
      }
    }
  }

  // ==================== TRAINING LOAD PARSING ====================

  if (lowerText.includes('training load') || lowerText.includes('load') || /^tl\s+\d+/i.test(text)) {
    const valuePattern = /(\d+)/
    const valueMatch = text.match(valuePattern)
    if (valueMatch) {
      const load = parseInt(valueMatch[1])
      if (load >= 0 && load <= 200) {
        return { type: 'training_load', trainingLoad: load, date: targetDate, notes }
      }
    }
  }

  // ==================== STRESS LEVEL PARSING ====================

  if (lowerText.includes('stress')) {
    const valuePattern = /(\d+)/
    const valueMatch = text.match(valuePattern)
    if (valueMatch) {
      let stress = parseInt(valueMatch[1])
      if (stress <= 5 && stress >= 1 && !text.includes('%') && !lowerText.includes('percent')) {
        stress = Math.round((stress / 5) * 100)
      }
      if (stress >= 0 && stress <= 100) {
        return { type: 'stress', stressLevel: stress, date: targetDate, notes }
      }
    }
  }

  // ==================== RECOVERY SCORE PARSING ====================

  if (lowerText.includes('recovery') || lowerText.includes('rested')) {
    const valuePattern = /(\d+)/
    const valueMatch = text.match(valuePattern)
    if (valueMatch) {
      const recovery = parseInt(valueMatch[1])
      if (recovery >= 0 && recovery <= 100) {
        return { type: 'recovery', recoveryScore: recovery, date: targetDate, notes }
      }
    }
  }

  // ==================== CYCLING PARSING ====================

  if (lowerText.includes('cycle') || lowerText.includes('bike') || lowerText.includes('rode') ||
      lowerText.includes('cycling') || lowerText.includes('biking') || lowerText.includes('ride') ||
      lowerText.includes('commute')) {
    let distance = 0
    let duration = 0
    let calories: number | undefined
    let name: string | undefined

    if (lowerText.includes('commute')) name = 'Commute'

    const distancePattern = /(\d+(?:\.\d+)?)\s*(?:km|kilometers?|k\b)/i
    const distanceMatch = text.match(distancePattern)
    if (distanceMatch) distance = parseFloat(distanceMatch[1])

    const durationPattern = /(\d+)\s*(?:min|minutes?)/i
    const durationMatch = text.match(durationPattern)
    if (durationMatch) duration = parseInt(durationMatch[1])

    const caloriesPattern = /(\d+)\s*(?:cal|calories?|kcal)/i
    const caloriesMatch = text.match(caloriesPattern)
    if (caloriesMatch) calories = parseInt(caloriesMatch[1])

    if (distance > 0 || duration > 0) {
      return { type: 'cycle', name, distance, duration, calories, date: targetDate, notes }
    }
  }

  // ==================== HRV PARSING ====================

  if (lowerText.includes('hrv') || lowerText.includes('heart rate variability')) {
    const valuePattern = /(\d+)/
    const valueMatch = text.match(valuePattern)
    if (valueMatch) {
      const hrv = parseInt(valueMatch[1])
      if (hrv > 0 && hrv < 300) {
        return { type: 'hrv', hrv, date: targetDate, notes }
      }
    }
  }

  // ==================== WEIGHT PARSING ====================

  if (lowerText.includes('weight') || lowerText.includes('weigh')) {
    const valuePattern = /(\d+(?:\.\d+)?)\s*(?:kg|kilos?|lbs?)?/i
    const valueMatch = text.match(valuePattern)
    if (valueMatch) {
      let weight = parseFloat(valueMatch[1])
      if (lowerText.includes('lb')) weight = Math.round(weight * 0.453592 * 10) / 10
      if (weight > 20 && weight < 300) {
        return { type: 'weight', weight, date: targetDate, notes }
      }
    }
  }

  // ==================== BODY FAT PARSING ====================

  if (lowerText.includes('body fat') || lowerText.includes('bodyfat') || /^bf\s+\d/i.test(text) ||
      (lowerText.includes('fat') && !lowerText.includes('run') && !lowerText.includes('swim'))) {
    const valuePattern = /(\d+(?:\.\d+)?)\s*%?/
    const valueMatch = text.match(valuePattern)
    if (valueMatch) {
      const bodyFat = parseFloat(valueMatch[1])
      if (bodyFat > 2 && bodyFat < 60) {
        return { type: 'body_fat', bodyFat, date: targetDate, notes }
      }
    }
  }

  // ==================== SLEEP PARSING ====================

  if (lowerText.includes('sleep') || lowerText.includes('slept') || lowerText.includes('sleeping')) {
    let sleepHours = 0
    const hoursPattern = /(\d+(?:\.\d+)?)\s*h(?:ours?|r)?/i
    const hoursMatch = text.match(hoursPattern)
    if (hoursMatch) sleepHours = parseFloat(hoursMatch[1])

    const hMinPattern = /(\d+)\s*h(?:ours?)?\s*(\d+)\s*(?:min|m\b)/i
    const hMinMatch = text.match(hMinPattern)
    if (hMinMatch) {
      sleepHours = parseInt(hMinMatch[1]) + parseInt(hMinMatch[2]) / 60
      sleepHours = Math.round(sleepHours * 10) / 10
    }

    if (!sleepHours) {
      const barePattern = /(?:sleep|slept)\s+(\d+(?:\.\d+)?)/i
      const bareMatch = text.match(barePattern)
      if (bareMatch) {
        const v = parseFloat(bareMatch[1])
        if (v > 0 && v < 24) sleepHours = v
      }
    }

    let sleepScore: number | undefined
    const scorePattern = /(?:score|quality)[\s:]*(\d+)/i
    const scoreMatch = text.match(scorePattern)
    if (scoreMatch) {
      const s = parseInt(scoreMatch[1])
      if (s >= 0 && s <= 100) sleepScore = s
    }

    if (sleepHours > 0 && sleepHours <= 24) {
      return { type: 'sleep', sleepHours, sleepScore, date: targetDate, notes }
    }
  }

  // ==================== JIU-JITSU PARSING ====================

  if (lowerText.includes('bjj') || lowerText.includes('jiu-jitsu') || lowerText.includes('jiu jitsu') || lowerText.includes('jiujitsu')) {
    let duration = 0
    const durationPattern = /(\d+)\s*(?:min|minutes?)/i
    const durationMatch = text.match(durationPattern)
    if (durationMatch) duration = parseInt(durationMatch[1])

    return { type: 'jiujitsu', duration: duration || undefined, date: targetDate, notes }
  }

  return null
}

/**
 * Build entry data object from parsed fitness entry.
 * Returns a plain object suitable for passing to buildEntry() from fitnessStore.
 */
export function buildEntryData(parsed: ParsedFitnessEntry): Record<string, unknown> {
  const entryDate = parsed.date || new Date().toISOString().split('T')[0]

  const data: Record<string, unknown> = {
    date: entryDate,
    timestamp: new Date().toISOString(),
    type: parsed.type,
    name: parsed.type === 'jiujitsu' ? 'Jiu-Jitsu' : parsed.name,
    notes: parsed.notes,
  }

  if (parsed.type === 'steps') {
    data.steps = parsed.steps
  } else if (parsed.type === 'run' || parsed.type === 'swim' || parsed.type === 'cycle') {
    data.distance = parsed.distance
    data.duration = parsed.duration
    data.calories = parsed.calories
  } else if (parsed.type === 'vo2max') {
    data.vo2max = parsed.vo2max
  } else if (parsed.type === 'training_load') {
    data.trainingLoad = parsed.trainingLoad
  } else if (parsed.type === 'stress') {
    data.stressLevel = parsed.stressLevel
  } else if (parsed.type === 'recovery') {
    data.recoveryScore = parsed.recoveryScore
  } else if (parsed.type === 'hrv') {
    data.hrv = parsed.hrv
  } else if (parsed.type === 'weight') {
    data.weight = parsed.weight
  } else if (parsed.type === 'body_fat') {
    data.bodyFat = parsed.bodyFat
  } else if (parsed.type === 'sleep') {
    data.sleepHours = parsed.sleepHours
    data.sleepScore = parsed.sleepScore
  } else if (parsed.type === 'jiujitsu') {
    data.duration = parsed.duration
  }

  return data
}
