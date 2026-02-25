import { NextRequest, NextResponse } from 'next/server'
import { buildEntry, addFitnessEntry } from '../../../lib/fitnessStore'
import { saveInsight } from '../../../lib/insightsStore'
import { getWeekKey } from '../../../lib/weekUtils'
import { generateAIInsight } from '../../../lib/aiInsights'
import { parseFitnessMessage, buildEntryData, type ParsedFitnessEntry } from '../../../lib/fitnessParser'

export const dynamic = 'force-dynamic'

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET

// ParsedFitnessEntry and parseFitnessMessage imported from shared lib/fitnessParser

// parseFitnessMessage imported from shared lib/fitnessParser

function calculateDistanceFromSteps(steps: number): number {
  return Math.round((steps * 0.0007) * 100) / 100
}

function calculatePace(duration: number, distance: number): number {
  if (!distance || distance <= 0) return 0
  return Math.round((duration / distance) * 10) / 10
}

// ==================== INSIGHT GENERATION ====================

interface SavedWeekData {
  totals?: {
    steps: number
    runs: number
    swims: number
    cycles: number
    jiujitsu: number
    totalDistance: number
    totalCalories: number
  }
  goals?: { steps: number; runs: number; swims: number }
  advanced?: {
    avgRecovery: number
    recoveryStatus: string
    totalTrainingLoad: number
    avgStress: number
    latestWeight: number
  }
}

function generateFitnessInsight(parsed: ParsedFitnessEntry, weekData: SavedWeekData): string | null {
  const totals = weekData.totals
  const goals = weekData.goals
  const advanced = weekData.advanced

  if (parsed.type === 'steps') {
    const steps = parsed.steps || 0
    const goal = goals?.steps || 10000
    if (steps >= goal) return `Daily step goal hit! ${steps.toLocaleString('en-US')} steps today.`
    const pct = Math.round((steps / goal) * 100)
    if (pct >= 80) return `Almost there — ${pct}% of step goal (${steps.toLocaleString('en-US')}/${goal.toLocaleString('en-US')}).`
    return `${steps.toLocaleString('en-US')} steps logged. ${(goal - steps).toLocaleString('en-US')} more to hit your daily goal.`
  }

  if (parsed.type === 'run') {
    const runs = totals?.runs || 0
    const runGoal = goals?.runs || 3
    if (runs >= runGoal) return `Run goal complete! ${runs} runs this week. Keep the momentum.`
    return `Run logged — ${runs}/${runGoal} this week. ${runGoal - runs} more to go.`
  }

  if (parsed.type === 'swim') {
    const swims = totals?.swims || 0
    const swimGoal = goals?.swims || 2
    if (swims >= swimGoal) return `Swim goal hit! ${swims} swims this week.`
    return `Swim logged — ${swims}/${swimGoal} this week.`
  }

  if (parsed.type === 'cycle') {
    const dist = parsed.distance || 0
    return `Ride logged: ${dist}km. Total week distance: ${(totals?.totalDistance || 0).toFixed(1)}km.`
  }

  if (parsed.type === 'jiujitsu') {
    const sessions = totals?.jiujitsu || 0
    return `BJJ session ${sessions} this week. Oss! 🥋`
  }

  if (parsed.type === 'recovery') {
    const score = parsed.recoveryScore || 0
    if (score >= 80) return `Recovery looking great (${score}%). Good day for an intense session.`
    if (score >= 50) return `Recovery at ${score}%. Consider moderate training today.`
    return `Recovery low (${score}%). Rest day recommended — your body needs it.`
  }

  if (parsed.type === 'stress') {
    const stress = parsed.stressLevel || 0
    if (stress > 70) return `Stress high (${stress}%). Take it easy today — rest is productive.`
    if (stress > 40) return `Moderate stress (${stress}%). Light activity could help.`
    return `Stress low (${stress}%). Great window for training.`
  }

  if (parsed.type === 'weight') {
    return `Weight logged: ${parsed.weight}kg.`
  }

  if (parsed.type === 'vo2max') {
    const vo2 = parsed.vo2max || 0
    if (vo2 >= 50) return `VO2 Max ${vo2} — excellent aerobic fitness.`
    if (vo2 >= 40) return `VO2 Max ${vo2} — solid base. Keep building.`
    return `VO2 Max ${vo2} — room to grow. Consistent cardio will move this up.`
  }

  if (parsed.type === 'training_load') {
    const load = parsed.trainingLoad || 0
    const totalLoad = advanced?.totalTrainingLoad || load
    if (totalLoad > 400) return `Weekly training load high (${totalLoad}). Prioritize recovery.`
    if (totalLoad > 250) return `Training load building nicely (${totalLoad}). Monitor fatigue.`
    return `Training load at ${totalLoad}. Capacity for more if recovery allows.`
  }

  return null
}

function classifyInsightType(parsed: ParsedFitnessEntry, weekData: SavedWeekData): 'nudge' | 'alert' | 'celebration' {
  const totals = weekData.totals
  const goals = weekData.goals

  // Celebrations: goal completions
  if (parsed.type === 'steps' && (parsed.steps || 0) >= (goals?.steps || 10000)) return 'celebration'
  if (parsed.type === 'run' && (totals?.runs || 0) >= (goals?.runs || 3)) return 'celebration'
  if (parsed.type === 'swim' && (totals?.swims || 0) >= (goals?.swims || 2)) return 'celebration'

  // Alerts: poor recovery or high stress
  if (parsed.type === 'recovery' && (parsed.recoveryScore || 0) < 50) return 'alert'
  if (parsed.type === 'stress' && (parsed.stressLevel || 0) > 70) return 'alert'
  if (parsed.type === 'training_load' && (weekData.advanced?.totalTrainingLoad || 0) > 400) return 'alert'

  return 'nudge'
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret — REQUIRED in production
    const secret = request.headers.get('x-webhook-secret')
    if (!WEBHOOK_SECRET) {
      console.error('TELEGRAM_WEBHOOK_SECRET is not set — rejecting webhook request')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
    }
    if (secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Extract message text from Telegram format
    const messageText = body.message?.text || body.text
    // Telegram forum topic detection:
    // - forum_topic_created.name: only on the message that CREATES the topic (first msg)
    // - reply_to_message.forum_topic_created.name: on direct children of the root topic msg
    // - is_topic_message: true for all messages in any forum topic (Telegram Bot API v6.3+)
    // - message_thread_name: non-standard, not sent by Telegram, but may come from OpenClaw
    const topicName = body.message?.forum_topic_created?.name ||
                      body.message?.reply_to_message?.forum_topic_created?.name ||
                      body.message?.reply_to_message?.reply_to_message?.forum_topic_created?.name ||
                      body.message?.message_thread_name ||
                      body.topic_name  // OpenClaw may set this when forwarding

    if (!messageText) {
      return NextResponse.json({ error: 'No message text' }, { status: 400 })
    }

    // Only process messages from "Fity" topic or tagged with #fity / fity:
    // Also accept messages where is_topic_message=true with the known thread ID
    const FITY_THREAD_ID = process.env.FITY_THREAD_ID ? parseInt(process.env.FITY_THREAD_ID) : null
    const isFityTopic = topicName === 'Fity' ||
                        messageText.toLowerCase().includes('#fity') ||
                        messageText.toLowerCase().startsWith('fity:') ||
                        (FITY_THREAD_ID !== null && body.message?.message_thread_id === FITY_THREAD_ID)
    
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
    
    // Build entry using shared parser + store
    const entryData = buildEntryData(parsed)
    const newEntry = buildEntry(entryData)
    const savedData = await addFitnessEntry(weekKey, newEntry)

    // ==================== PUSH INSIGHT TO FITY AGENT ====================
    // Try AI-generated insight first (OpenRouter), fall back to templates.
    // Non-blocking: don't fail the webhook if insight push fails.
    try {
      // Build a plain-text context summary for the AI
      const contextLines: string[] = [`Activity logged: ${parsed.type}`]
      if (parsed.steps) contextLines.push(`Steps: ${parsed.steps.toLocaleString('en-US')} (goal: ${savedData.goals?.steps?.toLocaleString('en-US') ?? 10000})`)
      if (parsed.distance) contextLines.push(`Distance: ${parsed.distance}km`)
      if (parsed.duration) contextLines.push(`Duration: ${parsed.duration}min`)
      if (parsed.calories) contextLines.push(`Calories burned: ${parsed.calories}`)
      if (parsed.recoveryScore != null) contextLines.push(`Recovery score: ${parsed.recoveryScore}%`)
      if (parsed.stressLevel != null) contextLines.push(`Stress level: ${parsed.stressLevel}%`)
      if (parsed.hrv != null) contextLines.push(`HRV: ${parsed.hrv}ms`)
      if (parsed.vo2max != null) contextLines.push(`VO2 Max: ${parsed.vo2max}`)
      if (parsed.trainingLoad != null) contextLines.push(`Training load: ${parsed.trainingLoad}`)
      if (parsed.weight != null) contextLines.push(`Weight: ${parsed.weight}kg`)
      if (parsed.bodyFat != null) contextLines.push(`Body fat: ${parsed.bodyFat}%`)
      if (parsed.sleepHours != null) contextLines.push(`Sleep: ${parsed.sleepHours}h${parsed.sleepScore != null ? ` (score: ${parsed.sleepScore})` : ''}`)
      if (savedData.totals) {
        const t = savedData.totals
        contextLines.push(`Week totals: ${t.runs} runs, ${t.swims} swims, ${t.cycles} rides, ${t.steps?.toLocaleString('en-US') ?? 0} steps, ${t.totalDistance?.toFixed(1) ?? 0}km`)
      }
      if (savedData.goals) {
        const g = savedData.goals
        contextLines.push(`Weekly goals: ${g.runs} runs, ${g.swims} swims`)
      }
      if (savedData.advanced) {
        const a = savedData.advanced
        contextLines.push(`Avg recovery: ${a.avgRecovery}%, Total training load: ${a.totalTrainingLoad}`)
      }

      const aiResult = await generateAIInsight(contextLines.join('\n'), 'Fity')

      // Use AI result if available, otherwise fall back to template
      const insightText = aiResult?.insight ?? generateFitnessInsight(parsed, savedData)
      const insightType = aiResult?.type ?? classifyInsightType(parsed, savedData)

      if (insightText) {
        await saveInsight({
          agent: 'Fity',
          agentId: 'fitness-agent',
          emoji: '🏋️',
          insight: insightText,
          type: insightType,
          updatedAt: new Date().toISOString(),
          section: 'fitness',
        })
      }
    } catch (insightErr) {
      console.warn('Failed to push fitness insight:', insightErr)
    }

    // Build success message
    let successMessage = ''
    if (parsed.type === 'steps') {
      const distance = calculateDistanceFromSteps(parsed.steps || 0)
      successMessage = `✅ Logged: ${(parsed.steps || 0).toLocaleString('en-US')} steps (${distance}km) - ${entryDate}`
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
    } else if (parsed.type === 'sleep') {
      const h = parsed.sleepHours || 0
      successMessage = `✅ Logged: Sleep ${h}h - ${entryDate}`
      if (parsed.sleepScore) successMessage += ` (score: ${parsed.sleepScore})`
      if (h >= 8) successMessage += '\n😴 Great sleep!'
      else if (h >= 7) successMessage += '\n✅ Good sleep'
      else if (h >= 6) successMessage += '\n⚠️ A bit short — aim for 7-9h'
      else successMessage += '\n🔴 Sleep debt building — prioritise rest'
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
