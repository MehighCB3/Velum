import { NextRequest, NextResponse } from 'next/server'
import { FitnessEntry } from '../route'

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'dev-secret'

interface ParsedFitnessEntry {
  type: 'steps' | 'run' | 'swim' | 'vo2max' | 'training_load' | 'stress' | 'recovery'
  steps?: number
  distance?: number      // in km
  duration?: number      // in minutes
  calories?: number
  vo2max?: number        // ml/kg/min
  trainingLoad?: number  // 0-100
  stressLevel?: number   // 0-100
  recoveryScore?: number // 0-100
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
               '• run 10km 45min 450cal',
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
      notes: parsed.notes,
    }
    
    // Add type-specific fields
    if (parsed.type === 'steps') {
      entry.steps = parsed.steps
      entry.distanceKm = calculateDistanceFromSteps(parsed.steps || 0)
    } else if (parsed.type === 'run' || parsed.type === 'swim') {
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
      'yesterday 10000 steps',
      'vo2max 45',
      'training load 75',
      'stress 3',
      'stress 60',
      'recovery 85',
    ]
  })
}
