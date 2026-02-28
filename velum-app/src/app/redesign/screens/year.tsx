'use client'

import { useState } from 'react'
import { C, FONT_SANS, StatusBar, DarkCard, LightCard, Tag, PageHeader, SectionLabel } from '../components'

const WEEKS = 52, NOW = 9

const events = [
  { week: 12, label: "Barcelona Marathon", cat: "life" as const },
  { week: 24, label: "Wedding Anniversary", cat: "life" as const },
  { week: 30, label: "Ironman Camp", cat: "work" as const },
  { week: 36, label: "Product Hunt", cat: "work" as const },
  { week: 48, label: "Christmas Romania", cat: "life" as const },
]

const byWeek: Record<number, typeof events[0]> = {}
events.forEach(e => byWeek[e.week] = e)

const monthLabels = ["J","F","M","A","M","J","J","A","S","O","N","D"]

export default function YearScreen() {
  const [selected, setSelected] = useState<typeof events[0] | null>(null)

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg, overflowY: "auto" }}>
      <StatusBar />
      <PageHeader
        title="My Year"
        sub="2026 · Week 9 of 52"
        right={
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.text, fontFamily: FONT_SANS, lineHeight: 1, letterSpacing: "-1px" }}>43</div>
            <div style={{ fontSize: 10, color: C.textMuted, fontFamily: FONT_SANS, letterSpacing: "0.04em" }}>WEEKS LEFT</div>
          </div>
        }
      />

      <div style={{ padding: "0 16px" }}>
        <DarkCard>
          {/* Month labels */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(13, 1fr)", gap: 0, marginBottom: 4 }}>
            {monthLabels.map((m, i) => (
              <div key={i} style={{
                fontSize: 8.5, color: "rgba(255,255,255,0.25)",
                fontFamily: FONT_SANS, letterSpacing: "0.04em",
              }}>{m}</div>
            ))}
          </div>

          {/* Week grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(13, 1fr)",
            gridTemplateRows: "repeat(4, 1fr)",
            gap: 3,
          }}>
            {Array.from({ length: WEEKS }, (_, i) => i + 1).map(w => {
              const ev = byWeek[w]
              const isPast = w < NOW
              const isCurrent = w === NOW
              const isSelected = selected?.week === w
              let bg = isPast ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.04)"
              let border = "none"
              if (isCurrent) { bg = "transparent"; border = `1.5px solid ${C.accentWarm}` }
              if (ev) {
                bg = ev.cat === "life" ? C.accentWarm : "rgba(255,255,255,0.55)"
                border = "none"
              }
              if (isSelected) { bg = C.accent; border = "none" }
              return (
                <div
                  key={w}
                  role={ev ? "button" : undefined}
                  tabIndex={ev ? 0 : undefined}
                  aria-label={ev ? `Week ${w}: ${ev.label}` : undefined}
                  aria-pressed={ev ? isSelected : undefined}
                  onClick={() => ev ? setSelected(isSelected ? null : ev) : null}
                  onKeyDown={ev ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(isSelected ? null : ev) } } : undefined}
                  style={{
                    aspectRatio: "1",
                    borderRadius: 3,
                    background: bg,
                    border,
                    boxSizing: "border-box",
                    cursor: ev ? "pointer" : "default",
                    transition: "transform 0.12s, background 0.12s",
                    transform: isSelected ? "scale(1.3)" : "scale(1)",
                    outline: "none",
                  }}
                />
              )
            })}
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 14, marginTop: 12 }}>
            {[
              { dot: C.accentWarm, label: "Life", border: undefined },
              { dot: "rgba(255,255,255,0.55)", label: "Work", border: undefined },
              { dot: "transparent", label: "Now", border: `1.5px solid ${C.accentWarm}` },
              { dot: "rgba(255,255,255,0.18)", label: "Done", border: undefined },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: l.dot, border: l.border || "none" }} />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: FONT_SANS }}>{l.label}</span>
              </div>
            ))}
          </div>

          {/* Selected event */}
          {selected && (
            <div style={{
              marginTop: 12, padding: "12px 14px",
              background: "rgba(255,255,255,0.06)",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ fontSize: 14, color: "#fff", fontWeight: 600, fontFamily: FONT_SANS }}>{selected.label}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2, fontFamily: FONT_SANS }}>
                  Week {selected.week} · {selected.week >= NOW
                    ? `${selected.week - NOW}w away`
                    : `${NOW - selected.week}w ago`}
                </div>
              </div>
              <button style={{
                padding: "5px 12px", borderRadius: 8,
                background: "none", border: `1px solid ${C.accentWarm}`,
                color: C.accentWarm, fontSize: 11, fontWeight: 600,
                cursor: "pointer", fontFamily: FONT_SANS,
              }}>Edit</button>
            </div>
          )}
        </DarkCard>

        {/* Life progress */}
        <LightCard style={{ marginTop: 12, padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: FONT_SANS }}>Life Progress</span>
            <span style={{ fontSize: 11, color: C.textMuted, fontFamily: FONT_SANS }}>32 yrs · 53 left · 85y lifespan</span>
          </div>
          <div style={{ height: 6, background: C.borderLight, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: "37.6%", height: "100%", background: `linear-gradient(90deg, ${C.accent}, ${C.accentWarm})`, borderRadius: 3 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 10, color: C.textMuted, fontFamily: FONT_SANS }}>37.6% of life</span>
            <span style={{ fontSize: 10, color: C.textMuted, fontFamily: FONT_SANS }}>2,756 weeks remain</span>
          </div>
        </LightCard>

        {/* Upcoming events */}
        <div style={{ marginTop: 16, paddingBottom: 24 }}>
          <SectionLabel>Upcoming</SectionLabel>
          {events.filter(e => e.week >= NOW).map((ev, i, arr) => (
            <div
              key={ev.week}
              onClick={() => setSelected(selected?.week === ev.week ? null : ev)}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "13px 0",
                borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: 2,
                  background: ev.cat === "life" ? C.accent : C.text,
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: 14, color: C.text, fontWeight: 500, fontFamily: FONT_SANS }}>{ev.label}</span>
                <Tag variant={ev.cat === "life" ? "accent" : "muted"}>{ev.cat}</Tag>
              </div>
              <span style={{
                fontSize: 11.5, color: C.textSub,
                fontFamily: FONT_SANS, fontWeight: 500,
              }}>W{ev.week} · {ev.week - NOW}w</span>
            </div>
          ))}
          <button style={{
            width: "100%", marginTop: 14, padding: "13px",
            background: "none", border: `1.5px dashed ${C.border}`,
            borderRadius: 12, color: C.accent, fontSize: 13,
            fontWeight: 600, cursor: "pointer", fontFamily: FONT_SANS,
          }}>+ Add Event</button>
        </div>
      </div>
    </div>
  )
}
