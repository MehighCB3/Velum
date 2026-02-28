'use client'

import { useState } from 'react'
import { C, FONT_SANS, StatusBar, DarkCard, LightCard, MacroWheel, Divider, FAB, PageHeader, SectionLabel } from '../components'

export default function NutritionScreen() {
  const [view, setView] = useState<"today" | "week">("today")
  const today = {
    kcal: 770, kcalGoal: 2000,
    protein: 47, proteinGoal: 140,
    carbs: 73, carbsGoal: 200,
    fat: 28, fatGoal: 65,
  }
  const meals = [
    { time: "08:30", name: "Oatmeal with banana", kcal: 350, icon: "\u{1F963}", macro: "C" },
    { time: "13:00", name: "Chicken salad", kcal: 420, icon: "\u{1F957}", macro: "P" },
  ]
  const weekData = [1450, 1820, 2100, 1920, 1680, 2050, 770]
  const days = ["M", "T", "W", "T", "F", "S", "S"]

  const macros = [
    { label: "Protein", val: today.protein, goal: today.proteinGoal, color: C.accentWarm, unit: "g" },
    { label: "Carbs",   val: today.carbs,   goal: today.carbsGoal,   color: C.carbsGreen, unit: "g" },
    { label: "Fat",     val: today.fat,     goal: today.fatGoal,     color: C.fatBlue, unit: "g" },
  ]

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg, overflowY: "auto" }}>
      <StatusBar />
      <PageHeader
        title="Nutrition"
        sub="Friday, Feb 27"
        right={
          <div style={{ display: "flex", gap: 1, background: C.borderLight, borderRadius: 10, padding: 3 }}>
            {(["today", "week"] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                background: view === v ? C.surface : "none",
                color: view === v ? C.text : C.textMuted,
                fontSize: 11, fontWeight: 600, fontFamily: FONT_SANS,
                boxShadow: view === v ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}>{v.charAt(0).toUpperCase() + v.slice(1)}</button>
            ))}
          </div>
        }
      />

      {view === "today" && (
        <div style={{ padding: "0 16px", paddingBottom: 24 }}>
          <DarkCard style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 24, paddingBottom: 20 }}>
            <MacroWheel kcal={today.kcal} kcalGoal={today.kcalGoal} protein={today.protein} carbs={today.carbs} fat={today.fat} />
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: FONT_SANS, marginTop: 12 }}>
              {today.kcalGoal - today.kcal} kcal remaining today
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
              <SectionLabel>Meals today</SectionLabel>
              <span style={{ fontSize: 11, color: C.textSub, fontFamily: FONT_SANS }}>{meals.length} logged</span>
            </div>
            {meals.map((meal, i) => (
              <LightCard key={i} style={{ marginBottom: 8, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: C.borderLight,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, flexShrink: 0,
                  }}>{meal.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text, fontFamily: FONT_SANS, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {meal.name}
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted, fontFamily: FONT_SANS, marginTop: 1 }}>
                      {meal.time}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: FONT_SANS }}>{meal.kcal}</div>
                    <div style={{ fontSize: 10, color: C.textMuted, fontFamily: FONT_SANS }}>kcal</div>
                  </div>
                </div>
              </LightCard>
            ))}
            <button style={{
              width: "100%", padding: "13px", marginTop: 4,
              background: "none", border: `1.5px dashed ${C.border}`,
              borderRadius: 12, color: C.accent, fontSize: 13,
              fontWeight: 600, cursor: "pointer", fontFamily: FONT_SANS,
            }}>+ Log a meal</button>
          </div>
        </div>
      )}

      {view === "week" && (
        <div style={{ padding: "0 16px", paddingBottom: 24 }}>
          <LightCard>
            <div style={{ fontSize: 12, color: C.textSub, fontFamily: FONT_SANS, marginBottom: 12 }}>
              Daily kcal this week
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 80 }}>
              {weekData.map((v, i) => {
                const isToday = i === 6
                const pct = v / 2200
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{
                      width: "100%", height: `${pct * 70}px`,
                      background: isToday ? C.accent : v > 2000 ? C.text : C.borderLight,
                      borderRadius: "4px 4px 0 0",
                      minHeight: 3,
                    }} />
                    <span style={{ fontSize: 10, color: isToday ? C.accent : C.textMuted, fontWeight: isToday ? 700 : 400, fontFamily: FONT_SANS }}>{days[i]}</span>
                  </div>
                )
              })}
            </div>
            <Divider />
            <div style={{ display: "flex", justifyContent: "space-around", paddingTop: 12 }}>
              {[
                { label: "Avg kcal", val: "1,684" },
                { label: "Best day", val: "2,100" },
                { label: "Logged", val: "7/7" },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: C.text, fontFamily: FONT_SANS }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: C.textMuted, fontFamily: FONT_SANS, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </LightCard>
          <div style={{ marginTop: 12 }}>
            <SectionLabel>Weekly Macros</SectionLabel>
            {[
              { label: "Protein", avg: 89, goal: 140, color: C.accentWarm },
              { label: "Carbs",   avg: 162, goal: 200, color: C.carbsGreen },
              { label: "Fat",     avg: 48,  goal: 65,  color: C.fatBlue },
            ].map(m => (
              <LightCard key={m.label} style={{ marginBottom: 8, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: m.color }} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: C.text, fontFamily: FONT_SANS }}>{m.label}</span>
                  </div>
                  <span style={{ fontSize: 12, color: C.textSub, fontFamily: FONT_SANS }}>
                    avg {m.avg}g / {m.goal}g
                  </span>
                </div>
                <div style={{ height: 4, background: C.borderLight, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min((m.avg / m.goal) * 100, 100)}%`, height: "100%", background: m.color, borderRadius: 2 }} />
                </div>
              </LightCard>
            ))}
          </div>
        </div>
      )}
      <FAB />
    </div>
  )
}
