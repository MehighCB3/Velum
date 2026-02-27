'use client'

import { useState } from 'react'
import { C, FONT_SANS, StatusBar, DarkCard, LightCard, ArcRing, FAB, PageHeader } from '../components'

export default function BudgetScreen() {
  const [tab, setTab] = useState("week")
  const budget = 70, spent = 0
  const weekData = [
    { w: "W07", v: 43, done: true, current: false },
    { w: "W08", v: 67, done: true, current: false },
    { w: "W09", v: 0,  done: false, current: true },
    { w: "W10", v: null, done: false, current: false },
    { w: "W11", v: null, done: false, current: false },
  ]
  const cats = [
    { name: "Food",          icon: "\u{1F958}", v: 0,  color: C.accentWarm },
    { name: "Fun",           icon: "\u{1F389}", v: 0,  color: "#7c6ae0" },
    { name: "Transport",     icon: "\u{1F68C}", v: 0,  color: "#4a9eed" },
    { name: "Subscriptions", icon: "\u{1F4E6}", v: 0,  color: C.textSub },
  ]
  const maxBar = Math.max(budget, ...weekData.map(w => w.v || 0))

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg, overflowY: "auto" }}>
      <StatusBar />
      <PageHeader title="Budget" sub="Week 9 \u00B7 Feb 23 \u2013 Mar 1" />

      <div style={{ padding: "0 16px" }}>
        <DarkCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.07em", fontFamily: FONT_SANS, marginBottom: 6 }}>
                WEEKLY BUDGET
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 48, fontWeight: 800, color: "#fff", fontFamily: FONT_SANS, lineHeight: 1, letterSpacing: "-2px" }}>
                  \u20AC{budget - spent}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#6fcf97", fontFamily: FONT_SANS, marginTop: 4, fontWeight: 500 }}>
                remaining \u00B7 \u20AC{spent.toFixed(2)} spent
              </div>
            </div>
            <ArcRing pct={(spent / budget) * 100} size={72} stroke={7}
              fg={spent > budget * 0.8 ? "#eb5757" : C.accentWarm}
              bg="rgba(255,255,255,0.08)">
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: FONT_SANS }}>
                {Math.round((spent / budget) * 100)}%
              </span>
            </ArcRing>
          </div>
          <div style={{ marginTop: 18, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              width: `${(spent / budget) * 100}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${C.accent}, ${C.accentWarm})`,
              borderRadius: 2,
            }} />
          </div>
        </DarkCard>

        {/* Tabbed widget */}
        <LightCard style={{ marginTop: 12, padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", borderBottom: `1px solid ${C.border}` }}>
            {[{ id: "week", label: "By Week" }, { id: "cat", label: "By Category" }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, padding: "14px 0",
                background: "none", border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
                color: tab === t.id ? C.text : C.textMuted,
                fontFamily: FONT_SANS,
                position: "relative",
              }}>
                {t.label}
                {tab === t.id && (
                  <div style={{ position: "absolute", bottom: 0, left: "20%", right: "20%", height: 2, background: C.accent, borderRadius: 2 }} />
                )}
              </button>
            ))}
          </div>
          <div style={{ padding: "16px" }}>
            {tab === "week" && (
              <>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                  <span style={{ fontSize: 9.5, color: C.textMuted, fontFamily: FONT_SANS }}>\u2014 \u20AC{budget} limit</span>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 90, position: "relative" }}>
                  <div style={{
                    position: "absolute", left: 0, right: 0,
                    top: `${100 - (budget / maxBar) * 100}%`,
                    borderTop: `1.5px dashed ${C.border}`,
                    zIndex: 1,
                  }} />
                  {weekData.map((w) => {
                    const h = w.v != null ? (w.v / maxBar) * 88 : 0
                    const over = (w.v || 0) > budget
                    return (
                      <div key={w.w} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end", gap: 5 }}>
                        <div style={{
                          width: "100%", height: `${h}%`,
                          background: w.v === null ? C.borderLight
                            : over ? C.red
                            : w.current ? C.accent
                            : "rgba(45,42,38,0.15)",
                          borderRadius: "4px 4px 0 0",
                          minHeight: w.v === 0 && !w.current ? 2 : 0,
                          outline: w.current ? `2px solid ${C.accent}44` : "none",
                          transition: "height 0.4s ease",
                        }} />
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  {weekData.map(w => (
                    <div key={w.w} style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: w.current ? C.accent : C.textMuted, fontWeight: w.current ? 700 : 400, fontFamily: FONT_SANS }}>{w.w}</div>
                      <div style={{ fontSize: 9, color: w.v == null ? C.border : C.textMuted, fontFamily: FONT_SANS }}>
                        {w.v != null ? `\u20AC${w.v}` : "\u2014"}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {tab === "cat" && (
              <div>
                {cats.map((c, i) => (
                  <div key={c.name} style={{
                    display: "flex", gap: 12, alignItems: "center",
                    paddingBottom: 12, marginBottom: i < cats.length - 1 ? 12 : 0,
                    borderBottom: i < cats.length - 1 ? `1px solid ${C.borderLight}` : "none",
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: C.borderLight,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, flexShrink: 0,
                    }}>{c.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: C.text, fontFamily: FONT_SANS }}>{c.name}</span>
                        <span style={{ fontSize: 12, color: C.textSub, fontFamily: FONT_SANS }}>\u20AC{c.v.toFixed(2)}</span>
                      </div>
                      <div style={{ height: 4, background: C.borderLight, borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${(c.v / budget) * 100}%`, height: "100%", background: c.color, borderRadius: 2 }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </LightCard>

        {/* Spending log */}
        <div style={{ marginTop: 16, marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.07em", fontFamily: FONT_SANS, marginBottom: 10, textTransform: "uppercase" }}>
            Spending Log
          </div>
          <LightCard style={{ padding: "36px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 32 }}>{"\u{1F4B3}"}</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: C.text, fontFamily: FONT_SANS }}>No spending yet</span>
            <span style={{ fontSize: 13, color: C.textMuted, fontFamily: FONT_SANS }}>Tap + to log an expense</span>
          </LightCard>
        </div>
      </div>
      <FAB color={C.dark} />
    </div>
  )
}
