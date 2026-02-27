'use client'

import { C, FONT_SANS, StatusBar, DarkCard, LightCard, ArcRing, Sparkline, FAB, PageHeader } from '../components'

export default function FitnessScreen() {
  const health = [
    { label: "VO\u2082 Max", val: 51, unit: "ml/kg", trend: +1.2, good: true, spark: [47,48,49,49,50,50,51] },
    { label: "HRV",     val: 48, unit: "ms",     trend: +3,   good: true, spark: [38,42,40,44,45,46,48] },
    { label: "Resting HR", val: 52, unit: "bpm", trend: -1,   good: true, spark: [57,55,54,54,53,53,52] },
    { label: "Sleep",   val: 7.2, unit: "h",     trend: 0,    good: null, spark: [6.5,7,6.8,7.4,7.2,7.5,7.2] },
    { label: "Recovery",val: 78, unit: "%",      trend: +5,   good: true, spark: [60,65,70,68,72,74,78] },
    { label: "Training Load", val: 342, unit: "", trend: null, good: null, spark: [200,280,310,290,320,330,342] },
  ]
  const acts = [
    { label: "Steps", count: 0, goal: 10000 },
    { label: "Runs",  count: 0, goal: 3 },
    { label: "Swims", count: 0, goal: 2 },
    { label: "Cycles",count: 0, goal: 1 },
  ]

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg, overflowY: "auto" }}>
      <StatusBar />
      <PageHeader title="Fitness" sub="Week 9 \u00B7 Feb 23 \u2013 Mar 1" />

      <div style={{ padding: "0 16px" }}>
        <DarkCard>
          {/* Activity rings */}
          <div style={{ display: "flex", justifyContent: "space-around", paddingBottom: 16 }}>
            {acts.map(a => (
              <div key={a.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <ArcRing pct={(a.count / a.goal) * 100} size={62} stroke={6}
                  fg={C.accentWarm} bg="rgba(255,255,255,0.08)">
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: FONT_SANS }}>{a.count}</span>
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
              { v: "0", u: "kcal", l: "Burned" },
              { v: "0.0", u: "km", l: "Distance" },
              { v: "0", u: "BJJ", l: "Sessions" },
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
            Garmin · Health
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <div>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", fontFamily: FONT_SANS, lineHeight: 1 }}>{h.val}</span>
                    {h.unit && <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginLeft: 2 }}>{h.unit}</span>}
                    {h.trend != null && (
                      <div style={{
                        fontSize: 9.5, marginTop: 3, fontFamily: FONT_SANS,
                        color: h.good === true ? "#6fcf97" : h.good === false ? "#eb5757" : "rgba(255,255,255,0.3)",
                      }}>
                        {h.good === true && "\u2191 "}{h.good === false && "\u2193 "}{Math.abs(h.trend)}
                      </div>
                    )}
                  </div>
                  <Sparkline data={h.spark} color={h.good === true ? "#6fcf97" : h.good === false ? "#eb5757" : "rgba(255,255,255,0.25)"} height={26} width={46} />
                </div>
              </div>
            ))}
          </div>
        </DarkCard>

        {/* Activities */}
        <div style={{ marginTop: 16, marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.07em", fontFamily: FONT_SANS, marginBottom: 10, textTransform: "uppercase" }}>
            Activities this week
          </div>
          <LightCard style={{ padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 36 }}>{"\u{1F3C3}"}</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: C.text, fontFamily: FONT_SANS }}>No activities logged</span>
            <span style={{ fontSize: 13, color: C.textMuted, fontFamily: FONT_SANS }}>Tap + to log a workout</span>
          </LightCard>
        </div>
      </div>
      <FAB />
    </div>
  )
}
