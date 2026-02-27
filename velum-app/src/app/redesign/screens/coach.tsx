'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { C, FONT, FONT_SANS, StatusBar } from '../components'
import { TekyIcon } from '../icons'

// ─────────────────────────────────────────────
//  COACH SCREEN
//  Chat-first layout: compact header → optional
//  collapsible metrics strip → full chat area →
//  quick reply chips → input bar with camera.
// ─────────────────────────────────────────────

const QUICK_ACTIONS = [
  "How am I doing?",
  "Log my lunch",
  "Suggest a dinner",
  "Weekly review",
  "What should I train?",
] as const

// ── Card data types (discriminated union) ──
type RecoveryCard = {
  type: 'recovery'
  data: { recovery: number; protein: number; proteinGoal: number; steps: number; stepsGoal: number }
}
type NutritionCard = {
  type: 'nutrition'
  data: { name: string; kcal: number; protein: number; carbs: number; fat: number }
}
type SummaryCard = {
  type: 'summary'
  data: { recovery: number; avgKcal: number; avgProtein: number; streak: number }
}
type ContextCard = RecoveryCard | NutritionCard | SummaryCard

interface ChatMsg {
  id: string
  role: 'user' | 'assistant'
  text: string
  time: string
  card?: ContextCard
}

let msgCounter = 0
function nextMsgId(): string {
  return `msg-${Date.now()}-${++msgCounter}`
}

// ── Static metrics (would come from API in prod) ──
const METRICS = [
  { label: "Recovery", value: "78%", color: C.green },
  { label: "Protein", value: "47/140g", color: C.accentWarm },
  { label: "Steps", value: "3.2k", color: C.accent },
  { label: "Budget", value: "\u20AC70", color: C.green },
] as const

export default function CoachScreen() {
  const [input, setInput] = useState("")
  const [metricsExpanded, setMetricsExpanded] = useState(true)
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: nextMsgId(),
      role: "assistant",
      text: "Good morning, Mihai! Recovery is strong today. Nutrition is slightly low on protein this week. Want me to suggest a high-protein lunch?",
      time: "9:38",
      card: {
        type: 'recovery',
        data: { recovery: 78, protein: 47, proteinGoal: 140, steps: 3200, stepsGoal: 10000 }
      }
    }
  ])
  const bottomRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Cleanup simulated response timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const send = useCallback((text?: string) => {
    const msg = (text || input).trim()
    if (!msg) return
    const userMsg: ChatMsg = { id: nextMsgId(), role: "user", text: msg, time: "now" }
    setMessages(m => [...m, userMsg])
    if (!text) setInput("")
    setMetricsExpanded(false)

    // Simulate response (would be API call in prod)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      let response: ChatMsg
      const lower = msg.toLowerCase()
      if (lower.includes('lunch') || lower.includes('dinner') || lower.includes('suggest')) {
        response = {
          id: nextMsgId(),
          role: "assistant",
          text: "Based on your targets, here\u2019s a high-protein option that would close the gap nicely. Want me to log it?",
          time: "now",
          card: {
            type: 'nutrition',
            data: { name: 'Grilled chicken + quinoa salad', kcal: 520, protein: 48, carbs: 35, fat: 18 }
          }
        }
      } else if (lower.includes('doing') || lower.includes('review')) {
        response = {
          id: nextMsgId(),
          role: "assistant",
          text: "You\u2019re doing well this week! Recovery is up, and you\u2019ve been consistent with logging. Protein intake could use a boost \u2014 you\u2019ve been averaging 89g against your 140g target.",
          time: "now",
          card: {
            type: 'summary',
            data: { recovery: 78, avgKcal: 1684, avgProtein: 89, streak: 14 }
          }
        }
      } else {
        response = {
          id: nextMsgId(),
          role: "assistant",
          text: "On it. I\u2019ve checked your data \u2014 things are looking solid. Let me know if you need anything specific about nutrition, fitness, or your budget.",
          time: "now",
        }
      }
      setMessages(m => [...m, response])
    }, 800)
  }, [input])

  const toggleMetrics = useCallback(() => {
    setMetricsExpanded(v => !v)
  }, [])

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg }}>
      <StatusBar light />

      {/* ── COMPACT HEADER ── */}
      <div style={{
        background: `linear-gradient(180deg, #1e1a16 0%, #231c15 100%)`,
        padding: "10px 16px 12px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
      }}>
        <div style={{
          position: "absolute", left: 6, top: "50%",
          transform: "translateY(-50%)",
          width: 70, height: 70,
          background: `radial-gradient(circle, #7aafca20 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />

        {/* Avatar */}
        <div style={{
          flexShrink: 0, position: "relative",
          width: 48, height: 48,
          borderRadius: "50%",
          background: "#d8eef5",
          overflow: "hidden",
          boxShadow: `0 0 0 2px #7aafca40`,
        }}>
          <div style={{ marginTop: -3, marginLeft: -3 }}>
            <TekyIcon size={54} />
          </div>
        </div>
        {/* Online dot */}
        <div style={{
          position: "absolute", bottom: 10, left: 48,
          width: 10, height: 10, borderRadius: "50%",
          background: C.green,
          border: "2px solid #1e1a16",
          zIndex: 2,
        }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 18, fontWeight: 400, color: "#fff",
            fontFamily: FONT, letterSpacing: "0.2px", lineHeight: 1.1,
          }}>
            Teky
          </div>
          <div style={{
            fontSize: 10.5, color: "rgba(255,255,255,0.35)",
            fontFamily: FONT_SANS, marginTop: 2, letterSpacing: "0.03em",
          }}>
            your life coach \u00B7 online
          </div>
        </div>

        {/* Status chips */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-end" }}>
          {[
            { label: "78% recovery", color: C.green },
            { label: "protein low", color: C.accentWarm },
          ].map(c => (
            <span key={c.label} style={{
              fontSize: 9.5, fontFamily: FONT_SANS, fontWeight: 500,
              padding: "2px 7px", borderRadius: 20,
              background: `${c.color}18`,
              border: `1px solid ${c.color}40`,
              color: c.color,
              letterSpacing: "0.02em",
              whiteSpace: "nowrap",
            }}>{c.label}</span>
          ))}
        </div>
      </div>

      {/* ── COLLAPSIBLE METRICS STRIP ── */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={metricsExpanded}
        aria-label="Toggle metrics summary"
        onClick={toggleMetrics}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMetrics() } }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: metricsExpanded ? "10px 16px" : "6px 16px",
          background: C.surface,
          borderBottom: `1px solid ${C.border}`,
          cursor: "pointer",
          transition: "padding 0.2s ease",
          flexShrink: 0,
        }}
      >
        {metricsExpanded ? (
          <div style={{ display: "flex", width: "100%", justifyContent: "space-between" }}>
            {METRICS.map((m, i) => (
              <div key={m.label} style={{
                flex: 1, textAlign: "center",
                borderRight: i < METRICS.length - 1 ? `1px solid ${C.borderLight}` : "none",
                padding: "0 4px",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: FONT_SANS }}>{m.value}</div>
                <div style={{
                  fontSize: 8.5, color: m.color, fontFamily: FONT_SANS,
                  fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginTop: 1,
                }}>{m.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 6, flex: 1 }}>
              {METRICS.map(m => (
                <span key={m.label} style={{
                  fontSize: 10, fontFamily: FONT_SANS, fontWeight: 500,
                  padding: "2px 6px", borderRadius: 4,
                  background: C.borderLight, color: C.textSub,
                }}>
                  {m.value}
                </span>
              ))}
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </>
        )}
      </div>

      {/* ── CHAT MESSAGES ── */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "12px 14px 0",
        display: "flex", flexDirection: "column",
      }} role="log" aria-label="Chat messages">
        {messages.map((m, i) => {
          const isFirst = i === 0 || messages[i - 1].role !== m.role
          return (
            <div key={m.id}>
              <div style={{
                display: "flex",
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                marginBottom: m.card ? 4 : 8,
                marginTop: isFirst && i > 0 ? 4 : 0,
              }}>
                {m.role === "assistant" && isFirst && (
                  <div style={{
                    width: 26, height: 26, marginRight: 7, marginTop: 2, flexShrink: 0,
                    borderRadius: "50%", background: "#d8eef5",
                    overflow: "hidden",
                    boxShadow: `0 0 0 1.5px #7aafca30`,
                  }} aria-hidden="true">
                    <div style={{ marginTop: -2, marginLeft: -1 }}>
                      <TekyIcon size={30} />
                    </div>
                  </div>
                )}
                {m.role === "assistant" && !isFirst && (
                  <div style={{ width: 33, flexShrink: 0 }} aria-hidden="true" />
                )}

                <div style={{
                  maxWidth: "80%",
                  padding: "10px 13px",
                  borderRadius: m.role === "user"
                    ? "16px 16px 4px 16px"
                    : isFirst ? "4px 16px 16px 16px" : "16px",
                  background: m.role === "user" ? C.text : C.surface,
                  border: m.role === "assistant" ? `1px solid ${C.border}` : "none",
                  color: m.role === "user" ? "#fff" : C.text,
                  fontSize: 13, lineHeight: 1.5, fontFamily: FONT_SANS,
                }}>
                  {m.text}
                  <div style={{
                    fontSize: 9.5, marginTop: 3,
                    color: m.role === "user" ? "rgba(255,255,255,0.35)" : C.textMuted,
                    textAlign: "right",
                  }}>{m.time}</div>
                </div>
              </div>

              {/* ── INLINE CONTEXT CARD ── */}
              {m.card && m.role === "assistant" && (
                <div style={{
                  marginLeft: 33, marginBottom: 10,
                  padding: "10px 12px",
                  background: C.borderLight,
                  borderRadius: 12,
                  border: `1px solid ${C.border}`,
                  maxWidth: "80%",
                }}>
                  {m.card.type === 'recovery' && (
                    <div style={{ display: "flex", gap: 12 }}>
                      {[
                        { label: "Recovery", val: `${m.card.data.recovery}%`, color: C.green },
                        { label: "Protein", val: `${m.card.data.protein}/${m.card.data.proteinGoal}g`, color: C.accentWarm },
                        { label: "Steps", val: `${(m.card.data.steps / 1000).toFixed(1)}k`, color: C.accent },
                      ].map(d => (
                        <div key={d.label} style={{ textAlign: "center", flex: 1 }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: d.color, fontFamily: FONT_SANS }}>{d.val}</div>
                          <div style={{ fontSize: 9, color: C.textMuted, fontFamily: FONT_SANS, letterSpacing: "0.03em", textTransform: "uppercase", marginTop: 1 }}>{d.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {m.card.type === 'nutrition' && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: FONT_SANS, marginBottom: 6 }}>
                        {m.card.data.name}
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        {[
                          { label: "kcal", val: m.card.data.kcal, color: C.text },
                          { label: "protein", val: `${m.card.data.protein}g`, color: C.accentWarm },
                          { label: "carbs", val: `${m.card.data.carbs}g`, color: C.carbsGreen },
                          { label: "fat", val: `${m.card.data.fat}g`, color: C.fatBlue },
                        ].map(d => (
                          <div key={d.label} style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: d.color, fontFamily: FONT_SANS }}>{d.val}</div>
                            <div style={{ fontSize: 8.5, color: C.textMuted, fontFamily: FONT_SANS, textTransform: "uppercase" }}>{d.label}</div>
                          </div>
                        ))}
                      </div>
                      <button style={{
                        marginTop: 8, padding: "5px 14px", borderRadius: 8,
                        background: C.accent, border: "none", color: "#fff",
                        fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: FONT_SANS,
                      }}>Log this meal</button>
                    </div>
                  )}
                  {m.card.type === 'summary' && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {[
                        { label: "Recovery", val: `${m.card.data.recovery}%`, color: C.green },
                        { label: "Avg kcal", val: `${m.card.data.avgKcal}`, color: C.text },
                        { label: "Avg protein", val: `${m.card.data.avgProtein}g`, color: C.accentWarm },
                        { label: "Log streak", val: `${m.card.data.streak}d`, color: C.accent },
                      ].map(d => (
                        <div key={d.label}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: d.color, fontFamily: FONT_SANS }}>{d.val}</div>
                          <div style={{ fontSize: 9, color: C.textMuted, fontFamily: FONT_SANS, textTransform: "uppercase" }}>{d.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── QUICK REPLY CHIPS ── */}
      {messages.length <= 2 && (
        <div style={{
          display: "flex", gap: 6, padding: "8px 14px 4px",
          overflowX: "auto", flexShrink: 0,
        }} role="group" aria-label="Suggested replies">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action}
              onClick={() => send(action)}
              style={{
                padding: "6px 12px", borderRadius: 20,
                background: "none",
                border: `1.5px solid ${C.border}`,
                color: C.accent, fontSize: 11.5, fontWeight: 500,
                cursor: "pointer", fontFamily: FONT_SANS,
                whiteSpace: "nowrap", flexShrink: 0,
                transition: "all 0.15s",
              }}
              onMouseOver={e => {
                const el = e.currentTarget
                el.style.background = C.accentLight
                el.style.borderColor = C.accent
              }}
              onMouseOut={e => {
                const el = e.currentTarget
                el.style.background = "none"
                el.style.borderColor = C.border
              }}
            >{action}</button>
          ))}
        </div>
      )}

      {/* ── INPUT BAR ── */}
      <form
        onSubmit={e => { e.preventDefault(); send() }}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 12px 12px",
          borderTop: `1px solid ${C.border}`,
          background: C.bg,
          flexShrink: 0,
        }}
      >
        <button type="button" aria-label="Take food photo" style={{
          flexShrink: 0, width: 36, height: 36,
          background: "none", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 0,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke={C.textMuted} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </button>

        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Message Teky\u2026"
          aria-label="Message input"
          style={{
            flex: 1,
            border: `1.5px solid ${C.border}`,
            borderRadius: 22,
            padding: "9px 14px",
            fontSize: 13, color: C.text,
            background: C.surface,
            outline: "none", fontFamily: FONT_SANS,
          }}
        />

        <button type="submit" aria-label="Send message" disabled={!input.trim()} style={{
          flexShrink: 0,
          width: 36, height: 36, borderRadius: "50%",
          background: input.trim() ? C.accent : C.borderLight,
          border: "none", cursor: input.trim() ? "pointer" : "default",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.15s",
          opacity: input.trim() ? 1 : 0.6,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={input.trim() ? "#fff" : C.textMuted}
            strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </form>
    </div>
  )
}
