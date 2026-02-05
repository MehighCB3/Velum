import { NextRequest, NextResponse } from 'next/server'
import { FitnessEntry } from '../route'

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'dev-secret'

interface ParsedFitnessEntry {
  type: 'steps' | 'run' | 'swim' | 'cycle' | 'jiujitsu' | 'vo2max' | 'training_load' | 'stress' | 'recovery' | 'hrv' | 'weight' | 'body_fat'
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
  date?: string
  notes?: string
}

/**
 * Parse fitness messages from Telegram
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
 */
function parseFitnessMessage(text: string): ParsedFitnessEntry | null {
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
      // Remove date keyword from text for cleaner parsing
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
  
  // Pattern: "8000 steps" or "steps 8000" or "8k steps"
  const stepsPattern = /^(?:(\d+(?:\.\d+)?)\s*k?\s*steps?|steps?\s+(\d+(?:\.\d+)?)\s*k?)$/i
  const stepsMatch = text.match(stepsPattern)
  if (stepsMatch) {
    const stepsStr = stepsMatch[1] || stepsMatch[2]
    let steps = parseFloat(stepsStr)
    // If it was "8k steps", multiply by 1000
    if (text.toLowerCase().includes('k ') || text.toLowerCase().endsWith('k')) {
      steps *= 1000
    }
    return {
      type: 'steps',
      steps: Math.round(steps),
      date: targetDate,
      notes
    }
  }
  
  // ==================== RUN PARSING ====================
  
  // Pattern: "5k run 30min" or "run 10km 45min" or "ran 5km in 25min"
  const runPattern = /^(?:ran?\s+|(\d+(?:\.\d+)?)\s*(?:km?|kilometers?)\s+)?run\s+(?:(\d+(?:\.\d+)?)\s*(?:km?|kilometers?))?\s*(?:(\d+)\s*(?:min|minutes?))?/i
  const runAltPattern = /^(\d+(?:\.\d+)?)\s*(?:km?|k)\s+(?:run|ran)\s+(?:(\d+)\s*(?:min|minutes?))?/i
  const runSimplePattern = /^(?:run|running)\s+(\d+(?:\.\d+)?)\s*(?:km?|k)\s+(?:(\d+)\s*(?:min|minutes?))?/i
  
  let runMatch = text.match(runPattern) || text.match(runAltPattern) || text.match(runSimplePattern)
  
  if (runMatch || lowerText.includes('run') || lowerText.includes('ran')) {
    let distance = 0
    let duration = 0
    let calories: number | undefined
    
    // Try to extract distance
    const distancePattern = /(\d+(?:\.\d+)?)\s*(?:km|kilometers?|k\b)/i
    const distanceMatch = text.match(distancePattern)
    if (distanceMatch) {
      distance = parseFloat(distanceMatch[1])
    }
    
    // Try to extract duration
    const durationPattern = /(\d+)\s*(?:min|minutes?)/i
    const durationMatch = text.match(durationPattern)
    if (durationMatch) {
      duration = parseInt(durationMatch[1])
    }
    
    // Try to extract calories
    const caloriesPattern = /(\d+)\s*(?:cal|calories?|kcal)/i
    const caloriesMatch = text.match(caloriesPattern)
    if (caloriesMatch) {
      calories = parseInt(caloriesMatch[1])
    }
    
    if (distance > 0 || duration > 0) {
      return {
        type: 'run',
        distance,
        duration,
        calories,
        date: targetDate,
        notes
      }
    }
  }
  
  // ==================== SWIM PARSING ====================
  
  // Pattern: "swim 1000m 20min" or "swam 1.5km 30min"
  const swimPattern = /^(?:swam?\s+)?swim\s+(?:(\d+(?:\.\d+)?)\s*(?:m|meters?|km|kilometers?))?\s*(?:(\d+)\s*(?:min|minutes?))?/i
  const swimAltPattern = /^(\d+(?:\.\d+)?)\s*(?:m|meters?|km|kilometers?)\s+(?:swim|swam)/i
  
  let swimMatch = text.match(swimPattern) || text.match(swimAltPattern)
  
  if (swimMatch || lowerText.includes('swim') || lowerText.includes('swam')) {
    let distance = 0
    let duration = 0
    let calories: number | undefined
    
    // Try to extract distance (handle meters and km)
    const metersPattern = /(\d+(?:\.\d+)?)\s*(?:m|meters?)\b/i
    const kmPattern = /(\d+(?:\.\d+)?)\s*(?:km|kilometers?)\b/i
    
    const metersMatch = text.match(metersPattern)
    const kmMatch = text.match(kmPattern)
    
    if (metersMatch) {
      distance = parseFloat(metersMatch[1]) / 1000 // convert to km
    } else if (kmMatch) {
      distance = parseFloat(kmMatch[1])
    }
    
    // Try to extract duration
    const durationPattern = /(\d+)\s*(?:min|minutes?)/i
    const durationMatch = text.match(durationPattern)
    if (durationMatch) {
      duration = parseInt(durationMatch[1])
    }
    
    // Try to extract calories
    const caloriesPattern = /(\d+)\s*(?:cal|calories?|kcal)/i
    const caloriesMatch = text.match(caloriesPattern)
    if (caloriesMatch) {
      calories = parseInt(caloriesMatch[1])
    }
    
    if (distance > 0 || duration > 0) {
      return {
        type: 'swim',
        distance,
        duration,
        calories,
        date: targetDate,
        notes
      }
    }
  }

  // ==================== VO2 MAX PARSING ====================
  
  // Pattern: "vo2max 45" or "vo2 max 42.5" or "vo2: 48"
  const vo2maxPattern = /^(?:vo2max|vo2\s*max|vo2)[\s:]*(\d+(?:\.\d+)?)$/i
  const vo2maxMatch = text.match(vo2maxPattern)
  
  if (vo2maxMatch || lowerText.includes('vo2') || lowerText.includes('vo2max')) {
    const valuePattern = /(\d+(?:\.\d+)?)/
    const valueMatch = text.match(valuePattern)
    
    if (valueMatch) {
      const vo2max = parseFloat(valueMatch[1])
      if (vo2max > 20 && vo2max < 100) { // Reasonable VO2 max range
        return {
          type: 'vo2max',
          vo2max,
          date: targetDate,
          notes
        }
      }
    }
  }

  // ==================== TRAINING LOAD PARSING ====================
  
  // Pattern: "training load 75" or "load 80" or "tl 65"
  const trainingLoadPattern = /^(?:(?:training\s*)?load|tl)[\s:]*(\d+)$/i
  const trainingLoadMatch = text.match(trainingLoadPattern)
  
  if (trainingLoadMatch || lowerText.includes('training load') || lowerText.includes('load') || /^tl\s+\d+/i.test(text)) {
    const valuePattern = /(\d+)/
    const valueMatch = text.match(valuePattern)
    
    if (valueMatch) {
      const load = parseInt(valueMatch[1])
      if (load >= 0 && load <= 200) { // Reasonable training load range
        return {
          type: 'training_load',
          trainingLoad: load,
          date: targetDate,
          notes
        }
      }
    }
  }

  // ==================== STRESS LEVEL PARSING ====================
  
  // Pattern: "stress 3" or "stress 60" or "stress level 4"
  const stressPattern = /^(?:stress(?:\s*level)?)[\s:]*(\d+)$/i
  const stressMatch = text.match(stressPattern)
  
  if (stressMatch || lowerText.includes('stress')) {
    const valuePattern = /(\d+)/
    const valueMatch = text.match(valuePattern)
    
    if (valueMatch) {
      let stress = parseInt(valueMatch[1])
      // Convert 1-5 scale to 0-100 if needed
      if (stress <= 5 && stress >= 1 && !text.includes('%') && !lowerText.includes('percent')) {
        stress = Math.round((stress / 5) * 100)
      }
      if (stress >= 0 && stress <= 100) {
        return {
          type: 'stress',
          stressLevel: stress,
          date: targetDate,
          notes
        }
      }
    }
  }

  // ==================== RECOVERY SCORE PARSING ====================

  // Pattern: "recovery 85" or "recovery score 90" or "rested 75"
  const recoveryPattern = /^(?:(?:recovery(?:\s*score)?|rested|rest))[\s:]*(\d+)$/i
  const recoveryMatch = text.match(recoveryPattern)

  if (recoveryMatch || lowerText.includes('recovery') || lowerText.includes('rested')) {
    const valuePattern = /(\d+)/
    const valueMatch = text.match(valuePattern)

    if (valueMatch) {
      const recovery = parseInt(valueMatch[1])
      if (recovery >= 0 && recovery <= 100) {
        return {
          type: 'recovery',
          recoveryScore: recovery,
          date: targetDate,
          notes
        }
      }
    }
  }

  // ==================== CYCLING PARSING ====================

  // Pattern: "cycle 12km 28min" or "bike 20km 52min" or "rode 15km" or "commute 12km 28min"
  if (lowerText.includes('cycle') || lowerText.includes('bike') || lowerText.includes('rode') ||
      lowerText.includes('cycling') || lowerText.includes('biking') || lowerText.includes('ride') ||
      lowerText.includes('commute')) {
    let distance = 0
    let duration = 0
    let calories: number | undefined
    let name: string | undefined

    // Detect activity name from keywords
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
      return {
        type: 'cycle',
        name,
        distance,
        duration,
        calories,
        date: targetDate,
        notes
      }
    }
  }

  // ==================== HRV PARSING ====================

  // Pattern: "hrv 58" or "hrv: 62" or "heart rate variability 55"
  if (lowerText.includes('hrv') || lowerText.includes('heart rate variability')) {
    const valuePattern = /(\d+)/
    const valueMatch = text.match(valuePattern)

    if (valueMatch) {
      const hrv = parseInt(valueMatch[1])
      if (hrv > 0 && hrv < 300) {
        return {
          type: 'hrv',
          hrv,
          date: targetDate,
          notes
        }
      }
    }
  }

  // ==================== WEIGHT PARSING ====================

  // Pattern: "weight 78.5" or "weight: 80kg" or "weigh 75.2"
  if (lowerText.includes('weight') || lowerText.includes('weigh')) {
    const valuePattern = /(\d+(?:\.\d+)?)\s*(?:kg|kilos?|lbs?)?/i
    const valueMatch = text.match(valuePattern)

    if (valueMatch) {
      let weight = parseFloat(valueMatch[1])
      // Convert lbs to kg if specified
      if (lowerText.includes('lb')) weight = Math.round(weight * 0.453592 * 10) / 10
      if (weight > 20 && weight < 300) {
        return {
          type: 'weight',
          weight,
          date: targetDate,
          notes
        }
      }
    }
  }

  // ==================== BODY FAT PARSING ====================

  // Pattern: "body fat 18.2" or "bf 18%" or "fat 17.5"
  if (lowerText.includes('body fat') || lowerText.includes('bodyfat') || /^bf\s+\d/i.test(text) ||
      (lowerText.includes('fat') && !lowerText.includes('run') && !lowerText.includes('swim'))) {
    const valuePattern = /(\d+(?:\.\d+)?)\s*%?/
    const valueMatch = text.match(valuePattern)

    if (valueMatch) {
      const bodyFat = parseFloat(valueMatch[1])
      if (bodyFat > 2 && bodyFat < 60) {
        return {
          type: 'body_fat',
          bodyFat,
          date: targetDate,
          notes
        }
      }
    }
  }

  // ==================== JIU-JITSU PARSING ====================

  // Pattern: "bjj", "jiu-jitsu", "jiu jitsu", "jiujitsu", "bjj 90min", "jiu-jitsu 60min"
  if (lowerText.includes('bjj') || lowerText.includes('jiu-jitsu') || lowerText.includes('jiu jitsu') || lowerText.includes('jiujitsu')) {
    let duration = 0

    const durationPattern = /(\d+)\s*(?:min|minutes?)/i
    const durationMatch = text.match(durationPattern)
    if (durationMatch) {
      duration = parseInt(durationMatch[1])
    }

    return {
      type: 'jiujitsu',
      duration: duration || undefined,
      date: targetDate,
      notes
    }
  }

  return null
}

function getWeekKey(date: Date): string {
  const year = date.getFullYear()
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${year}-W${String(weekNumber).padStart(2, '0')}`
}

function calculateDistanceFromSteps(steps: number): number {
  return Math.round((steps * 0.0007) * 100) / 100
}

function calculatePace(duration: number, distance: number): number {
  if (!distance || distance <= 0) return 0
  return Math.round((duration / distance) * 10) / 10
}

export async function POST(request: NextRequest) {
  try {
    // Verify secret (optional, for production)
    const secret = request.headers.get('x-webhook-secret')
    if (secret !== WEBHOOK_SECRET) {
      console.warn('Invalid webhook secret')
      // Still process in dev mode
    }

    const body = await request.json()
    
    // Extract message text from Telegram format
    const messageText = body.message?.text || body.text
    const chatId = body.message?.chat?.id || body.chat_id
    const messageId = body.message?.message_id || body.message_id
    const topicName = body.message?.forum_topic_created?.name || 
                      body.message?.reply_to_message?.forum_topic_created?.name ||
                      body.message?.message_thread_name
    
    if (!messageText) {
      return NextResponse.json({ error: 'No message text' }, { status: 400 })
    }
    
    console.log('Fitness webhook received:', messageText, 'Topic:', topicName)
    
    // Only process messages from "Fity" topic
    const isFityTopic = topicName === 'Fity' || 
                        messageText.toLowerCase().includes('#fity') ||
                        messageText.toLowerCase().startsWith('fity:')
    
    if (!isFityTopic) {
      return NextResponse.json({ 
        ignored: true, 
        reason: 'Message not in Fity topic or missing #fity tag'
      })
    }
    
    // Parse the fitness entry
    const parsed = parseFitnessMessage(messageText)
    if (!parsed) {
      return NextResponse.json({ 
        error: 'Could not parse fitness entry. Supported formats:\n' +
               '• 8000 steps\n' +
               '• 5k run 30min\n' +
               '• swim 1000m 20min\n' +
               '• cycle 20km 52min\n' +
               '• hrv 58\n' +
               '• weight 78.5\n' +
               '• body fat 18.2\n' +
               '• bjj / jiu-jitsu',
        received: messageText
      }, { status: 400 })
    }
    
    // Get week key
    const entryDate = parsed.date || new Date().toISOString().split('T')[0]
    const weekKey = getWeekKey(new Date(entryDate))
    
    // Create entry
    const entry: Partial<FitnessEntry> = {
      date: entryDate,
      timestamp: new Date().toISOString(),
      type: parsed.type,
      name: parsed.name,
      notes: parsed.notes,
    }

    // Add type-specific fields
    if (parsed.type === 'steps') {
      entry.steps = parsed.steps
      entry.distanceKm = calculateDistanceFromSteps(parsed.steps || 0)
    } else if (parsed.type === 'run' || parsed.type === 'swim' || parsed.type === 'cycle') {
      entry.distance = parsed.distance
      entry.duration = parsed.duration
      entry.calories = parsed.calories
      entry.pace = calculatePace(parsed.duration || 0, parsed.distance || 0)
    } else if (parsed.type === 'vo2max') {
      entry.vo2max = parsed.vo2max
    } else if (parsed.type === 'training_load') {
      entry.trainingLoad = parsed.trainingLoad
    } else if (parsed.type === 'stress') {
      entry.stressLevel = parsed.stressLevel
    } else if (parsed.type === 'recovery') {
      entry.recoveryScore = parsed.recoveryScore
    } else if (parsed.type === 'hrv') {
      entry.hrv = parsed.hrv
    } else if (parsed.type === 'weight') {
      entry.weight = parsed.weight
    } else if (parsed.type === 'body_fat') {
      entry.bodyFat = parsed.bodyFat
    } else if (parsed.type === 'jiujitsu') {
      entry.duration = parsed.duration
      entry.name = 'Jiu-Jitsu'
    }

    // Call the fitness API to save
    const fitnessApiUrl = new URL('/api/fitness', request.url)
    const response = await fetch(fitnessApiUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week: weekKey, entry })
    })
    
    if (!response.ok) {
      throw new Error('Failed to save to fitness API')
    }
    
    const savedData = await response.json()
    
    // Build success message
    let successMessage = ''
    if (parsed.type === 'steps') {
      const distance = calculateDistanceFromSteps(parsed.steps || 0)
      successMessage = `✅ Logged: ${parsed.steps?.toLocaleString()} steps (${distance}km) - ${entryDate}`
    } else if (parsed.type === 'run' || parsed.type === 'swim') {
      const pace = calculatePace(parsed.duration || 0, parsed.distance || 0)
      successMessage = `✅ Logged: ${parsed.type} - ${parsed.distance}km in ${parsed.duration}min`
      if (pace > 0) successMessage += ` (${pace} min/km)`
      if (parsed.calories) successMessage += ` - ${parsed.calories} cal`
    } else if (parsed.type === 'vo2max') {
      successMessage = `✅ Logged: VO2 Max ${parsed.vo2max} ml/kg/min - ${entryDate}`
      // Add interpretation
      const vo2 = parsed.vo2max || 0
      if (vo2 >= 50) successMessage += '\n🏆 Excellent aerobic fitness!'
      else if (vo2 >= 40) successMessage += '\n💪 Good aerobic fitness'
      else successMessage += '\n📈 Room for improvement'
    } else if (parsed.type === 'training_load') {
      const load = parsed.trainingLoad || 0
      successMessage = `✅ Logged: Training Load ${load} - ${entryDate}`
      if (load > 100) successMessage += '\n🔴 High load - ensure adequate recovery'
      else if (load > 60) successMessage += '\n🟡 Moderate-high load'
      else successMessage += '\n🟢 Optimal training load'
    } else if (parsed.type === 'stress') {
      const stress = parsed.stressLevel || 0
      successMessage = `✅ Logged: Stress Level ${stress}% - ${entryDate}`
      if (stress > 70) successMessage += '\n🧘 High stress - consider rest day'
      else if (stress > 40) successMessage += '\n⚠️ Moderate stress - monitor recovery'
      else successMessage += '\n✨ Low stress - good time to train'
    } else if (parsed.type === 'recovery') {
      const recovery = parsed.recoveryScore || 0
      successMessage = `✅ Logged: Recovery Score ${recovery}% - ${entryDate}`
      if (recovery >= 80) successMessage += '\n🟢 Well recovered - ready to train hard'
      else if (recovery >= 50) successMessage += '\n🟡 Fair recovery - moderate training advised'
      else successMessage += '\n🔴 Poor recovery - prioritize rest'
    } else if (parsed.type === 'cycle') {
      const pace = calculatePace(parsed.duration || 0, parsed.distance || 0)
      successMessage = `✅ Logged: ${parsed.name || 'Ride'} - ${parsed.distance}km in ${parsed.duration}min`
      if (pace > 0) successMessage += ` (${pace} min/km)`
      if (parsed.calories) successMessage += ` - ${parsed.calories} cal`
    } else if (parsed.type === 'hrv') {
      successMessage = `✅ Logged: HRV ${parsed.hrv} ms - ${entryDate}`
    } else if (parsed.type === 'weight') {
      successMessage = `✅ Logged: Weight ${parsed.weight} kg - ${entryDate}`
    } else if (parsed.type === 'body_fat') {
      successMessage = `✅ Logged: Body Fat ${parsed.bodyFat}% - ${entryDate}`
    } else if (parsed.type === 'jiujitsu') {
      successMessage = `✅ Logged: Jiu-Jitsu session - ${entryDate}`
      if (parsed.duration) successMessage += ` (${parsed.duration} min)`
      successMessage += '\n🥋 Oss!'
    }
    if (parsed.notes) successMessage += `\n📝 ${parsed.notes}`
    
    return NextResponse.json({
      success: true,
      message: successMessage,
      data: {
        type: parsed.type,
        week: weekKey,
        entry: savedData
      }
    })
    
  } catch (error) {
    console.error('Fitness webhook error:', error)
    return NextResponse.json({ 
      error: 'Failed to process fitness entry',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ 
    status: 'Fitness webhook ready',
    topic: 'Fity',
    examples: [
      '8000 steps',
      '12000 steps for walked to work',
      '5k run 30min',
      'run 10km 45min 450cal',
      'swim 1000m 20min',
      'swim 1.5km 30min 300cal',
      'cycle 20km 52min',
      'commute 12km 28min',
      'bike 15km 40min',
      'yesterday 10000 steps',
      'vo2max 45',
      'training load 75',
      'stress 3',
      'stress 60',
      'recovery 85',
      'hrv 58',
      'weight 78.5',
      'body fat 18.2',
      'bjj',
      'jiu-jitsu 90min',
    ]
  })
}
