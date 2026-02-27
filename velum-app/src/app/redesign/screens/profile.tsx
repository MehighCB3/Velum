'use client'

import { C, FONT, FONT_SANS, StatusBar, LightCard } from '../components'

export default function ProfileScreen() {
  const goals = [
    { label: "Run Barcelona Marathon", pct: 62, deadline: "W12 \u00B7 3w", color: C.accent },
    { label: "Reach 52kg body weight", pct: 45, deadline: "W20 \u00B7 11w", color: "#8aab6e" },
    { label: "Log food 30 days straight", pct: 80, deadline: "W11 \u00B7 2w", color: "#6ab3c8" },
    { label: "Launch Velum 1.0", pct: 90, deadline: "W10 \u00B7 1w", color: C.accentWarm },
  ]
  const streaks = [
    { label: "Nutrition logging", count: 14, unit: "days", icon: "\u{1F37D}\uFE0F" },
    { label: "Weekly workout", count: 6, unit: "weeks", icon: "\u{1F3CB}\uFE0F" },
    { label: "Budget tracking", count: 21, unit: "days", icon: "\u{1F4B0}" },
  ]
  const stats = [
    { label: "Year", val: "32" },
    { label: "Week", val: "W9" },
    { label: "City", val: "BCN" },
    { label: "Language", val: "ES B1" },
  ]

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg, overflowY: "auto" }}>
      <StatusBar />

      {/* Hero */}
      <div style={{
        background: `linear-gradient(160deg, ${C.dark} 0%, #2a2018 100%)`,
        padding: "16px 20px 24px",
      }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.accentWarm}, ${C.accent})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 30, flexShrink: 0,
            border: "3px solid rgba(255,255,255,0.12)",
            color: "#fff", fontFamily: FONT_SANS, fontWeight: 700,
          }}>M</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: FONT, letterSpacing: "-0.3px" }}>Mihai</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: FONT_SANS, marginTop: 2 }}>Barcelona \u00B7 Ironman & PM</div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              {stats.map(s => (
                <div key={s.label} style={{
                  padding: "4px 8px",
                  background: "rgba(255,255,255,0.07)",
                  borderRadius: 6,
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: FONT_SANS }}>{s.val}</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: FONT_SANS, letterSpacing: "0.04em" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        {/* Streaks */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.07em", fontFamily: FONT_SANS, marginBottom: 10, textTransform: "uppercase" }}>
            Active Streaks
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {streaks.map(s => (
              <LightCard key={s.label} style={{ flex: 1, padding: "12px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.text, fontFamily: FONT_SANS, lineHeight: 1 }}>
                  {s.count}
                </div>
                <div style={{ fontSize: 9, color: C.textMuted, fontFamily: FONT_SANS, marginTop: 2 }}>
                  {s.unit}
                </div>
                <div style={{ fontSize: 10, color: C.textSub, fontFamily: FONT_SANS, marginTop: 4, lineHeight: 1.3 }}>
                  {s.label}
                </div>
              </LightCard>
            ))}
          </div>
        </div>

        {/* Goals */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.07em", fontFamily: FONT_SANS, textTransform: "uppercase" }}>
              Goals
            </div>
            <button style={{ fontSize: 11, color: C.accent, background: "none", border: "none", cursor: "pointer", fontFamily: FONT_SANS, fontWeight: 600 }}>
              + Add
            </button>
          </div>
          {goals.map((g, i) => (
            <LightCard key={i} style={{ marginBottom: 8, padding: "13px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: C.text, fontFamily: FONT_SANS, lineHeight: 1.3, flex: 1, marginRight: 12 }}>
                  {g.label}
                </span>
                <span style={{ fontSize: 10, color: C.textMuted, fontFamily: FONT_SANS, marginTop: 2, flexShrink: 0 }}>{g.deadline}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, height: 5, background: C.borderLight, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${g.pct}%`, height: "100%", background: g.color, borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: g.color, fontFamily: FONT_SANS, flexShrink: 0 }}>{g.pct}%</span>
              </div>
            </LightCard>
          ))}
        </div>

        {/* Settings */}
        <LightCard style={{ marginBottom: 24, padding: 0, overflow: "hidden" }}>
          {[
            { label: "Notifications", icon: "\u{1F514}" },
            { label: "Goals & Targets", icon: "\u{1F3AF}" },
            { label: "Connected Apps", icon: "\u{1F517}" },
            { label: "Teky Settings", icon: "\u{1F916}" },
          ].map((item, i, arr) => (
            <div key={item.label} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 16px",
              borderBottom: i < arr.length - 1 ? `1px solid ${C.borderLight}` : "none",
              cursor: "pointer",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span style={{ fontSize: 13.5, color: C.text, fontFamily: FONT_SANS }}>{item.label}</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
            </div>
          ))}
        </LightCard>
      </div>
    </div>
  )
}
