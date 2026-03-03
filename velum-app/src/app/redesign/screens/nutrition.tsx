'use client'

import { useState, useEffect, useCallback } from 'react'
import { C, FONT_SANS, StatusBar, DarkCard, LightCard, MacroWheel, Divider, FAB, PageHeader, SectionLabel } from '../components'

interface NutritionEntry {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  time: string
  date: string
}

interface NutritionDay {
  date: string
  entries: NutritionEntry[]
  totals: { calories: number; protein: number; carbs: number; fat: number }
  goals: { calories: number; protein: number; carbs: number; fat: number }
}

interface WeekDay {
  date: string
  dayName: string
  dayNumber: number
  totals: { calories: number; protein: number; carbs: number; fat: number }
  goals: { calories: number; protein: number; carbs: number; fat: number }
  entries: NutritionEntry[]
}

interface WeekData {
  days: WeekDay[]
  weeklyTotals: { calories: number; protein: number; carbs: number; fat: number }
  averageDaily: { calories: number; protein: number; carbs: number; fat: number }
}

function formatDateLabel(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

function getMealEmoji(time: string): string {
  const hour = parseInt(time.split(':')[0], 10)
  if (hour < 11) return '\u{1F963}'
  if (hour < 15) return '\u{1F957}'
  if (hour < 18) return '\u{1F34E}'
  return '\u{1F37D}'
}

export default function NutritionScreen() {
  const [view, setView] = useState<"today" | "week">("today")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [dayData, setDayData] = useState<NutritionDay | null>(null)
  const [weekData, setWeekData] = useState<WeekData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchDayData = useCallback(async (date: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/nutrition?date=${date}`)
      if (res.ok) setDayData(await res.json())
    } catch (err) {
      console.error('Failed to fetch nutrition data:', err)
    }
    setLoading(false)
  }, [])

  const fetchWeekData = useCallback(async (date: string) => {
    try {
      const res = await fetch(`/api/nutrition/week?date=${date}`)
      if (res.ok) setWeekData(await res.json())
    } catch (err) {
      console.error('Failed to fetch week data:', err)
    }
  }, [])

  useEffect(() => {
    fetchDayData(selectedDate)
    fetchWeekData(selectedDate)
  }, [selectedDate, fetchDayData, fetchWeekData])

  const navigateDay = (offset: number) => {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + offset)
    const newDate = d.toISOString().split('T')[0]
    const todayStr = new Date().toISOString().split('T')[0]
    if (newDate <= todayStr) setSelectedDate(newDate)
  }

  const day = dayData || {
    date: selectedDate,
    entries: [],
    totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    goals: { calories: 2600, protein: 160, carbs: 310, fat: 80 },
  }

  const macros = [
    { label: "Protein", val: Math.round(day.totals.protein), goal: day.goals.protein, color: C.accentWarm, unit: "g" },
    { label: "Carbs", val: Math.round(day.totals.carbs), goal: day.goals.carbs, color: C.carbsGreen, unit: "g" },
    { label: "Fat", val: Math.round(day.totals.fat), goal: day.goals.fat, color: C.fatBlue, unit: "g" },
  ]

  const todayStr = new Date().toISOString().split('T')[0]
  const isToday = selectedDate === todayStr
  const weekDays = weekData?.days || []
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"]

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg, overflowY: "auto" }}>
      <StatusBar />
      <PageHeader
        title="Nutrition"
        sub={formatDateLabel(selectedDate)}
        right={
          <div style={{ display: "flex", gap: 1, background: C.borderLight, borderRadius: 10, padding: 3 }}>
            {(["today", "week"] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                background: view === v ? C.surface : "none",
                color: view === v ? C.text : C.textMuted,
                fontSize: 11, fontWeight: 600, fontFamily: FONT_SANS,
                boxShadow: view === v ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}>{v === "today" ? "Day" : "Week"}</button>
            ))}
          </div>
        }
      />

      {/* Date navigator */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, padding: "4px 16px 12px" }}>
        <button onClick={() => navigateDay(-1)} style={{
          background: "none", border: `1px solid ${C.border}`, borderRadius: 8,
          width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          color: C.textSub, fontSize: 16,
        }}>{"\u2039"}</button>
        <button onClick={() => setSelectedDate(todayStr)} style={{
          background: isToday ? C.accent : "none",
          color: isToday ? "#fff" : C.textSub,
          border: `1px solid ${isToday ? C.accent : C.border}`,
          borderRadius: 8, padding: "4px 12px", fontSize: 11, fontWeight: 600,
          fontFamily: FONT_SANS, cursor: "pointer",
        }}>Today</button>
        <button onClick={() => navigateDay(1)} disabled={isToday} style={{
          background: "none", border: `1px solid ${C.border}`, borderRadius: 8,
          width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          color: C.textSub, fontSize: 16, opacity: isToday ? 0.3 : 1,
        }}>{"\u203A"}</button>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 20 }}>
          <div style={{ fontSize: 13, color: C.textMuted, fontFamily: FONT_SANS }}>Loading...</div>
        </div>
      )}

      {!loading && view === "today" && (
        <div style={{ padding: "0 16px", paddingBottom: 24 }}>
          <DarkCard style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 24, paddingBottom: 20 }}>
            <MacroWheel kcal={Math.round(day.totals.calories)} kcalGoal={day.goals.calories} protein={Math.round(day.totals.protein)} carbs={Math.round(day.totals.carbs)} fat={Math.round(day.totals.fat)} />
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: FONT_SANS, marginTop: 12 }}>
              {Math.max(0, day.goals.calories - Math.round(day.totals.calories))} kcal remaining
            </div>
            <div style={{ display: "flex", gap: 0, marginTop: 18, width: "100%" }}>
              {macros.map((m, i) => (
                <div key={m.label} style={{
                  flex: 1, textAlign: "center",
                  borderRight: i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none",
                  padding: "0 8px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginBottom: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: 2, background: m.color }} />
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: FONT_SANS, letterSpacing: "0.04em" }}>
                      {m.label.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", fontFamily: FONT_SANS, lineHeight: 1 }}>
                    {m.val}
                    <span style={{ fontSize: 10, fontWeight: 400, color: "rgba(255,255,255,0.35)", marginLeft: 2 }}>{m.unit}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: FONT_SANS, marginTop: 2 }}>
                    of {m.goal}{m.unit}
                  </div>
                  <div style={{ height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 1, marginTop: 6, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(m.val / m.goal * 100, 100)}%`, height: "100%", background: m.color, borderRadius: 1 }} />
                  </div>
                </div>
              ))}
            </div>
          </DarkCard>

          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <SectionLabel>Meals</SectionLabel>
              <span style={{ fontSize: 11, color: C.textSub, fontFamily: FONT_SANS }}>{day.entries.length} logged</span>
            </div>
            {day.entries.length === 0 ? (
              <LightCard style={{ padding: "30px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 32 }}>{"\u{1F37D}"}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: FONT_SANS }}>No meals logged</span>
                <span style={{ fontSize: 12, color: C.textMuted, fontFamily: FONT_SANS }}>Tap + to log a meal</span>
              </LightCard>
            ) : (
              day.entries.map((meal, i) => (
                <LightCard key={meal.id || i} style={{ marginBottom: 8, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, background: C.borderLight,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0,
                    }}>{getMealEmoji(meal.time)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text, fontFamily: FONT_SANS, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {meal.name}
                      </div>
                      <div style={{ fontSize: 11, color: C.textMuted, fontFamily: FONT_SANS, marginTop: 1 }}>
                        {meal.time} {"\u00B7"} {Math.round(meal.protein)}g P {"\u00B7"} {Math.round(meal.carbs)}g C {"\u00B7"} {Math.round(meal.fat)}g F
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: FONT_SANS }}>{Math.round(meal.calories)}</div>
                      <div style={{ fontSize: 10, color: C.textMuted, fontFamily: FONT_SANS }}>kcal</div>
                    </div>
                  </div>
                </LightCard>
              ))
            )}
            <button style={{
              width: "100%", padding: "13px", marginTop: 4,
              background: "none", border: `1.5px dashed ${C.border}`,
              borderRadius: 12, color: C.accent, fontSize: 13,
              fontWeight: 600, cursor: "pointer", fontFamily: FONT_SANS,
            }}>+ Log a meal</button>
          </div>
        </div>
      )}

      {!loading && view === "week" && (
        <div style={{ padding: "0 16px", paddingBottom: 24 }}>
          <LightCard>
            <div style={{ fontSize: 12, color: C.textSub, fontFamily: FONT_SANS, marginBottom: 12 }}>
              Daily kcal this week — tap a day to view
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 80 }}>
              {weekDays.map((wd, i) => {
                const isSelected = wd.date === selectedDate
                const kcal = wd.totals.calories
                const goal = wd.goals?.calories || 2600
                const pct = Math.min(kcal / goal, 1.2)
                return (
                  <div key={wd.date} onClick={() => { setSelectedDate(wd.date); setView("today") }}
                    style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}>
                    {kcal > 0 && <span style={{ fontSize: 8, color: C.textMuted, fontFamily: FONT_SANS }}>{Math.round(kcal)}</span>}
                    <div style={{
                      width: "100%", height: `${Math.max(pct * 60, 3)}px`,
                      background: isSelected ? C.accent : kcal > goal ? C.red : kcal > 0 ? C.text : C.borderLight,
                      borderRadius: "4px 4px 0 0", minHeight: 3,
                    }} />
                    <span style={{ fontSize: 10, color: isSelected ? C.accent : C.textMuted, fontWeight: isSelected ? 700 : 400, fontFamily: FONT_SANS }}>
                      {dayLabels[i] || wd.dayName?.charAt(0) || ''}
                    </span>
                  </div>
                )
              })}
            </div>
            {weekData && (
              <>
                <Divider />
                <div style={{ display: "flex", justifyContent: "space-around", paddingTop: 12 }}>
                  {[
                    { label: "Avg kcal", val: Math.round(weekData.averageDaily.calories).toLocaleString() },
                    { label: "Avg protein", val: `${Math.round(weekData.averageDaily.protein)}g` },
                    { label: "Logged", val: `${weekDays.filter(d => d.entries.length > 0).length}/7` },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 17, fontWeight: 700, color: C.text, fontFamily: FONT_SANS }}>{s.val}</div>
                      <div style={{ fontSize: 10, color: C.textMuted, fontFamily: FONT_SANS, marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </LightCard>
          {weekData && (
            <div style={{ marginTop: 12 }}>
              <SectionLabel>Weekly Macros</SectionLabel>
              {[
                { label: "Protein", avg: Math.round(weekData.averageDaily.protein), goal: day.goals.protein, color: C.accentWarm },
                { label: "Carbs", avg: Math.round(weekData.averageDaily.carbs), goal: day.goals.carbs, color: C.carbsGreen },
                { label: "Fat", avg: Math.round(weekData.averageDaily.fat), goal: day.goals.fat, color: C.fatBlue },
              ].map(m => (
                <LightCard key={m.label} style={{ marginBottom: 8, padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: m.color }} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: C.text, fontFamily: FONT_SANS }}>{m.label}</span>
                    </div>
                    <span style={{ fontSize: 12, color: C.textSub, fontFamily: FONT_SANS }}>avg {m.avg}g / {m.goal}g</span>
                  </div>
                  <div style={{ height: 4, background: C.borderLight, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min((m.avg / m.goal) * 100, 100)}%`, height: "100%", background: m.color, borderRadius: 2 }} />
                  </div>
                </LightCard>
              ))}
            </div>
          )}
        </div>
      )}
      <FAB />
    </div>
  )
}
