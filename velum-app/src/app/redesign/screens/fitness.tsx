'use client'

import { useState, useEffect } from 'react'
import { C, FONT_SANS, StatusBar, DarkCard, LightCard, ArcRing, FAB, PageHeader, SectionLabel } from '../components'

interface FitnessEntry {
  id: string
  date: string
  timestamp: string
  type: string
  name?: string
  steps?: number
  duration?: number
  distance?: number
  calories?: number
  vo2max?: number
  trainingLoad?: number
  stressLevel?: number
  recoveryScore?: number
  hrv?: number
  weight?: number
  bodyFat?: number
  sleepHours?: number
  sleepScore?: number
  notes?: string
}

interface FitnessWeek {
  week: string
  entries: FitnessEntry[]
  totals: {
    steps: number; runs: number; swims: number; cycles: number; jiujitsu: number
    totalDistance: number; totalCalories: number
  }
  goals: { steps: number; runs: number; swims: number }
  advanced?: {
    avgVo2max: number; totalTrainingLoad: number; avgStress: number
    avgRecovery: number; recoveryStatus: 'good' | 'fair' | 'poor'
    latestHrv: number; latestWeight: number; latestBodyFat: number
    avgSleepHours: number; avgSleepScore: number
  }
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function getWeekKey(date: Date): string {
  return `${date.getFullYear()}-W${String(getISOWeek(date)).padStart(2, '0')}`
}

function getWeekLabel(date: Date): string {
  const wk = getISOWeek(date)
  const monday = new Date(date)
  const day = monday.getDay() || 7
  monday.setDate(monday.getDate() - day + 1)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `Week ${wk} \u00B7 ${fmt(monday)} \u2013 ${fmt(sunday)}`
}

export default function FitnessScreen() {
  const [data, setData] = useState<FitnessWeek | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/fitness?week=${getWeekKey(new Date())}`)
        if (res.ok && !cancelled) setData(await res.json())
      } catch (err) {
        console.error('Failed to fetch fitness data:', err)
      }
      if (!cancelled) setLoading(false)
    }
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  const adv = data?.advanced
  const totals = data?.totals
  const goals = data?.goals

  const health = [
    { label: "VO\u2082 Max", val: adv?.avgVo2max || '--', unit: "ml/kg", good: adv?.avgVo2max ? (adv.avgVo2max >= 45 ? true : null) : null },
    { label: "HRV", val: adv?.latestHrv || '--', unit: "ms", good: adv?.latestHrv ? true : null },
    { label: "Sleep", val: adv?.avgSleepHours ? adv.avgSleepHours.toFixed(1) : '--', unit: "h", good: adv?.avgSleepHours ? (adv.avgSleepHours >= 7 ? true : adv.avgSleepHours >= 6 ? null : false) : null },
    { label: "Recovery", val: adv?.avgRecovery || '--', unit: "%", good: adv?.recoveryStatus === 'good' ? true : adv?.recoveryStatus === 'fair' ? null : adv?.recoveryStatus === 'poor' ? false : null },
    { label: "Stress", val: adv?.avgStress || '--', unit: "%", good: adv?.avgStress ? (adv.avgStress <= 40 ? true : adv.avgStress <= 70 ? null : false) : null },
    { label: "Load", val: adv?.totalTrainingLoad || '--', unit: "", good: null },
  ]

  const acts = [
    { label: "Steps", count: totals?.steps || 0, goal: goals?.steps || 10000 },
    { label: "Runs", count: totals?.runs || 0, goal: goals?.runs || 3 },
    { label: "Swims", count: totals?.swims || 0, goal: goals?.swims || 2 },
    { label: "Cycles", count: totals?.cycles || 0, goal: 1 },
  ]

  const activities = (data?.entries || [])
    .filter(e => ['run', 'swim', 'cycle', 'jiujitsu', 'gym', 'other'].includes(e.type))
    .sort((a, b) => b.date.localeCompare(a.date) || (b.timestamp || '').localeCompare(a.timestamp || ''))

  const actIcon = (t: string) => ({ run: '\u{1F3C3}', swim: '\u{1F3CA}', cycle: '\u{1F6B4}', jiujitsu: '\u{1F94B}', gym: '\u{1F3CB}' }[t] || '\u26A1')

  const actDetail = (e: FitnessEntry) => {
    const p: string[] = []
    if (e.distance) p.push(`${e.distance}km`)
    if (e.duration) p.push(`${e.duration}min`)
    if (e.calories) p.push(`${e.calories}cal`)
    return p.join(' \u00B7 ')
  }

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg, alignItems: "center", justifyContent: "center" }}>
        <StatusBar />
        <div style={{ fontSize: 13, color: C.textMuted, fontFamily: FONT_SANS }}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg, overflowY: "auto" }}>
      <StatusBar />
      <PageHeader title="Fitness" sub={getWeekLabel(new Date())} />

      <div style={{ padding: "0 16px" }}>
        <DarkCard>
          {/* Activity rings */}
          <div style={{ display: "flex", justifyContent: "space-around", paddingBottom: 16 }}>
            {acts.map(a => (
              <div key={a.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <ArcRing pct={a.goal > 0 ? (a.count / a.goal) * 100 : 0} size={62} stroke={6}
                  fg={C.accentWarm} bg="rgba(255,255,255,0.08)">
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: FONT_SANS }}>
                    {a.label === "Steps" && a.count >= 1000 ? `${(a.count / 1000).toFixed(1)}k` : a.count}
                  </span>
                </ArcRing>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: FONT_SANS, letterSpacing: "0.03em" }}>
                  {a.label}
                </span>
              </div>
            ))}
          </div>

          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 0 14px" }} />

          {/* Summary stats */}
          <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 16 }}>
            {[
              { v: totals?.totalCalories ? totals.totalCalories.toLocaleString() : "0", u: "kcal", l: "Burned" },
              { v: totals?.totalDistance ? totals.totalDistance.toFixed(1) : "0.0", u: "km", l: "Distance" },
              { v: String(totals?.jiujitsu || 0), u: "BJJ", l: "Sessions" },
            ].map(s => (
              <div key={s.l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", fontFamily: FONT_SANS, lineHeight: 1, letterSpacing: "-0.5px" }}>
                  {s.v}
                  <span style={{ fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.35)", marginLeft: 3 }}>{s.u}</span>
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", fontFamily: FONT_SANS, marginTop: 3 }}>{s.l}</div>
              </div>
            ))}
          </div>

          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 0 14px" }} />

          {/* Garmin health metrics */}
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", fontFamily: FONT_SANS, marginBottom: 10, textTransform: "uppercase" }}>
            Garmin \u00B7 Health
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7 }}>
            {health.map(h => (
              <div key={h.label} style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 12, padding: "10px 10px 8px",
              }}>
                <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.3)", fontFamily: FONT_SANS, marginBottom: 4, letterSpacing: "0.02em" }}>
                  {h.label}
                </div>
                <div>
                  <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", fontFamily: FONT_SANS, lineHeight: 1 }}>{h.val}</span>
                  {h.unit && <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginLeft: 2 }}>{h.unit}</span>}
                  {h.good !== null && (
                    <div style={{
                      fontSize: 9.5, marginTop: 3, fontFamily: FONT_SANS,
                      color: h.good === true ? C.success : h.good === false ? C.danger : "rgba(255,255,255,0.3)",
                    }}>
                      {h.good === true ? "\u2713 Good" : h.good === false ? "\u26A0 Low" : ""}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DarkCard>

        {/* Activities */}
        <div style={{ marginTop: 16, marginBottom: 24 }}>
          <SectionLabel>Activities this week</SectionLabel>
          {activities.length === 0 ? (
            <LightCard style={{ padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 36 }}>{"\u{1F3C3}"}</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: C.text, fontFamily: FONT_SANS }}>No activities logged</span>
              <span style={{ fontSize: 13, color: C.textMuted, fontFamily: FONT_SANS }}>Tap + to log a workout</span>
            </LightCard>
          ) : (
            activities.map(a => (
              <LightCard key={a.id} style={{ marginBottom: 8, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, background: C.borderLight,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, flexShrink: 0,
                  }}>{actIcon(a.type)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text, fontFamily: FONT_SANS }}>
                      {a.name || a.type.charAt(0).toUpperCase() + a.type.slice(1)}
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted, fontFamily: FONT_SANS, marginTop: 1 }}>
                      {a.date}{actDetail(a) ? ` \u00B7 ${actDetail(a)}` : ''}
                    </div>
                  </div>
                </div>
              </LightCard>
            ))
          )}
        </div>
      </div>
      <FAB />
    </div>
  )
}
