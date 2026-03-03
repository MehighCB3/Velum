'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { C, FONT, FONT_SANS, StatusBar } from '../components'
import { TekyIcon } from '../icons'

const QUICK_ACTIONS = [
  "How am I doing?",
  "Log my lunch",
  "Suggest a dinner",
  "Weekly review",
  "What should I train?",
] as const

type RecoveryCard = { type: 'recovery'; data: { recovery: number; protein: number; proteinGoal: number; steps: number; stepsGoal: number } }
type NutritionCard = { type: 'nutrition'; data: { name: string; kcal: number; protein: number; carbs: number; fat: number } }
type SummaryCard = { type: 'summary'; data: { recovery: number; avgKcal: number; avgProtein: number; streak: number } }
type ContextCard = RecoveryCard | NutritionCard | SummaryCard

interface ChatMsg {
  id: string
  role: 'user' | 'assistant'
  text: string
  time: string
  card?: ContextCard
  source?: string
}

let msgCounter = 0
function nextMsgId(): string {
  return `msg-${Date.now()}-${++msgCounter}`
}

const METRICS = [
  { label: "Recovery", value: "78%", color: C.green },
  { label: "Protein", value: "47/140g", color: C.accentWarm },
  { label: "Steps", value: "3.2k", color: C.accent },
  { label: "Budget", value: "\u20AC70", color: C.green },
] as const

export default function CoachScreen() {
  const [input, setInput] = useState("")
  const [metricsExpanded, setMetricsExpanded] = useState(true)
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: nextMsgId(),
      role: "assistant",
      text: "Hey! I'm Teky, your Velum coach. Ask me about your nutrition, fitness, budget, or anything you're working on.",
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    }
  ])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const send = useCallback(async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || sending) return

    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    const userMsg: ChatMsg = { id: nextMsgId(), role: "user", text: msg, time: now }
    setMessages(m => [...m, userMsg])
    if (!text) setInput("")
    setMetricsExpanded(false)
    setSending(true)

    // Add typing indicator
    const typingId = nextMsgId()
    setMessages(m => [...m, { id: typingId, role: "assistant", text: "Thinking...", time: "...", source: 'typing' }])

    try {
      const res = await fetch('/api/coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, stream: true }),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const contentType = res.headers.get('content-type') || ''

      if (contentType.includes('text/event-stream') && res.body) {
        // Handle streaming response
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let fullText = ''
        let source = 'gateway'
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const event = JSON.parse(line.slice(6))
              if (event.type === 'chunk') {
                fullText = event.fullText
                setMessages(m => m.map(msg =>
                  msg.id === typingId
                    ? { ...msg, text: fullText, time: now }
                    : msg
                ))
              } else if (event.type === 'done') {
                fullText = event.content
                source = event.source || 'gateway'
              }
            } catch {
              // Skip malformed events
            }
          }
        }

        setMessages(m => m.map(msg =>
          msg.id === typingId
            ? { ...msg, text: fullText, time: now, source }
            : msg
        ))
      } else {
        // Non-streaming fallback
        const data = await res.json()
        setMessages(m => m.map(msg =>
          msg.id === typingId
            ? { ...msg, text: data.content || 'No response', time: now, source: data.source }
            : msg
        ))
      }
    } catch (err) {
      console.error('Coach chat error:', err)
      setMessages(m => m.map(msg =>
        msg.id === typingId
          ? { ...msg, text: "Sorry, I couldn't connect. Please try again.", time: now, source: 'error' }
          : msg
      ))
    }

    setSending(false)
  }, [input, sending])

  const toggleMetrics = useCallback(() => {
    setMetricsExpanded(v => !v)
  }, [])

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg }}>
      <StatusBar light />

      {/* COMPACT HEADER */}
      <div style={{
        background: `linear-gradient(180deg, #1e1a16 0%, #231c15 100%)`,
        padding: "10px 16px 12px",
        display: "flex", alignItems: "center", gap: 12,
        position: "relative", overflow: "hidden", flexShrink: 0,
      }}>
        <div style={{
          position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)",
          width: 70, height: 70,
          background: `radial-gradient(circle, #7aafca20 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />

        <div style={{
          flexShrink: 0, position: "relative", width: 48, height: 48,
          borderRadius: "50%", background: "#d8eef5", overflow: "hidden",
          boxShadow: `0 0 0 2px #7aafca40`,
        }}>
          <div style={{ marginTop: -3, marginLeft: -3 }}><TekyIcon size={54} /></div>
        </div>
        <div style={{
          position: "absolute", bottom: 10, left: 48,
          width: 10, height: 10, borderRadius: "50%",
          background: C.green, border: "2px solid #1e1a16", zIndex: 2,
        }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 400, color: "#fff", fontFamily: FONT, letterSpacing: "0.2px", lineHeight: 1.1 }}>
            Teky
          </div>
          <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)", fontFamily: FONT_SANS, marginTop: 2, letterSpacing: "0.03em" }}>
            your life coach {"\u00B7"} online
          </div>
        </div>
      </div>

      {/* COLLAPSIBLE METRICS STRIP */}
      <div
        role="button" tabIndex={0} aria-expanded={metricsExpanded} aria-label="Toggle metrics summary"
        onClick={toggleMetrics}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMetrics() } }}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: metricsExpanded ? "10px 16px" : "6px 16px",
          background: C.surface, borderBottom: `1px solid ${C.border}`,
          cursor: "pointer", transition: "padding 0.2s ease", flexShrink: 0,
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
                <div style={{ fontSize: 8.5, color: m.color, fontFamily: FONT_SANS, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginTop: 1 }}>{m.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 6, flex: 1 }}>
              {METRICS.map(m => (
                <span key={m.label} style={{ fontSize: 10, fontFamily: FONT_SANS, fontWeight: 500, padding: "2px 6px", borderRadius: 4, background: C.borderLight, color: C.textSub }}>
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

      {/* CHAT MESSAGES */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px 0", display: "flex", flexDirection: "column" }} role="log" aria-label="Chat messages">
        {messages.map((m, i) => {
          const isFirst = i === 0 || messages[i - 1].role !== m.role
          const isTyping = m.source === 'typing'
          return (
            <div key={m.id}>
              <div style={{
                display: "flex",
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                marginBottom: 8, marginTop: isFirst && i > 0 ? 4 : 0,
              }}>
                {m.role === "assistant" && isFirst && (
                  <div style={{
                    width: 26, height: 26, marginRight: 7, marginTop: 2, flexShrink: 0,
                    borderRadius: "50%", background: "#d8eef5", overflow: "hidden",
                    boxShadow: `0 0 0 1.5px #7aafca30`,
                  }} aria-hidden="true">
                    <div style={{ marginTop: -2, marginLeft: -1 }}><TekyIcon size={30} /></div>
                  </div>
                )}
                {m.role === "assistant" && !isFirst && (
                  <div style={{ width: 33, flexShrink: 0 }} aria-hidden="true" />
                )}
                <div style={{
                  maxWidth: "80%", padding: "10px 13px",
                  borderRadius: m.role === "user" ? "16px 16px 4px 16px" : isFirst ? "4px 16px 16px 16px" : "16px",
                  background: m.role === "user" ? C.text : C.surface,
                  border: m.role === "assistant" ? `1px solid ${C.border}` : "none",
                  color: m.role === "user" ? "#fff" : C.text,
                  fontSize: 13, lineHeight: 1.5, fontFamily: FONT_SANS,
                  opacity: isTyping ? 0.6 : 1,
                  fontStyle: isTyping ? 'italic' : 'normal',
                }}>
                  {m.text}
                  {!isTyping && (
                    <div style={{
                      fontSize: 9.5, marginTop: 3,
                      color: m.role === "user" ? "rgba(255,255,255,0.35)" : C.textMuted,
                      textAlign: "right",
                    }}>{m.time}</div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* QUICK REPLY CHIPS */}
      {messages.length <= 2 && (
        <div style={{ display: "flex", gap: 6, padding: "8px 14px 4px", overflowX: "auto", flexShrink: 0 }} role="group" aria-label="Suggested replies">
          {QUICK_ACTIONS.map(action => (
            <button key={action} onClick={() => send(action)} disabled={sending} style={{
              padding: "6px 12px", borderRadius: 20, background: "none",
              border: `1.5px solid ${C.border}`, color: C.accent, fontSize: 11.5,
              fontWeight: 500, cursor: sending ? "default" : "pointer", fontFamily: FONT_SANS,
              whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.15s",
              opacity: sending ? 0.5 : 1,
            }}>{action}</button>
          ))}
        </div>
      )}

      {/* INPUT BAR */}
      <form
        onSubmit={e => { e.preventDefault(); send() }}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 12px 12px", borderTop: `1px solid ${C.border}`,
          background: C.bg, flexShrink: 0,
        }}
      >
        <button type="button" aria-label="Take food photo" style={{
          flexShrink: 0, width: 36, height: 36, background: "none", border: "none",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </button>

        <input
          value={input} onChange={e => setInput(e.target.value)}
          placeholder="Message Teky\u2026" aria-label="Message input"
          disabled={sending}
          style={{
            flex: 1, border: `1.5px solid ${C.border}`, borderRadius: 22,
            padding: "9px 14px", fontSize: 13, color: C.text,
            background: C.surface, outline: "none", fontFamily: FONT_SANS,
            opacity: sending ? 0.7 : 1,
          }}
        />

        <button type="submit" aria-label="Send message" disabled={!input.trim() || sending} style={{
          flexShrink: 0, width: 36, height: 36, borderRadius: "50%",
          background: input.trim() && !sending ? C.accent : C.borderLight,
          border: "none", cursor: input.trim() && !sending ? "pointer" : "default",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.15s", opacity: input.trim() && !sending ? 1 : 0.6,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={input.trim() && !sending ? "#fff" : C.textMuted}
            strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </form>
    </div>
  )
}
