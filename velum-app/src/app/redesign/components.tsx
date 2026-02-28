'use client'

// ─────────────────────────────────────────────
//  DESIGN SYSTEM — Velum 1.0 Redesign
// ─────────────────────────────────────────────

export const C = {
  bg: "#f7f4f0",
  surface: "#ffffff",
  dark: "#1a1814",
  darkMid: "#242220",
  text: "#1a1814",
  textSub: "#6b6560",
  textMuted: "#a09890",
  accent: "#b86a3a",        // deep terracotta
  accentWarm: "#d4854d",    // lighter terracotta
  accentLight: "#f0e0d0",
  border: "#e8e2d8",
  borderLight: "#f0ece6",
  green: "#4a7c59",
  greenLight: "#e8f3ec",
  red: "#c0392b",
  redLight: "#fdecea",
  // Macro / semantic colors
  carbsGreen: "#8aab6e",
  fatBlue: "#6ab3c8",
  success: "#6fcf97",
  danger: "#eb5757",
  purple: "#7c6ae0",
  blue: "#4a9eed",
} as const

export const FONT = `'DM Serif Display', Georgia, serif`
export const FONT_SANS = `'DM Sans', -apple-system, 'Helvetica Neue', sans-serif`

// ─────────────────────────────────────────────
//  LOAD FONTS
// ─────────────────────────────────────────────
export function loadFonts() {
  if (typeof document === 'undefined') return
  if (document.getElementById('velum-redesign-fonts')) return
  const link = document.createElement("link")
  link.id = 'velum-redesign-fonts'
  link.rel = "stylesheet"
  link.href = "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=DM+Serif+Display:ital@0;1&display=swap"
  document.head.appendChild(link)
}

// ─────────────────────────────────────────────
//  STATUS BAR
// ─────────────────────────────────────────────
export const StatusBar = ({ light = false }: { light?: boolean }) => (
  <div style={{
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "14px 22px 6px",
    fontSize: 12, fontWeight: 600,
    color: light ? "rgba(255,255,255,0.8)" : C.text,
    fontFamily: FONT_SANS,
    letterSpacing: "0.01em",
  }}>
    <span>9:41</span>
    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
      <svg width="15" height="10" viewBox="0 0 15 10" fill={light ? "rgba(255,255,255,0.7)" : C.textSub}>
        <rect x="0" y="4" width="3" height="6" rx="1"/>
        <rect x="4" y="2.5" width="3" height="7.5" rx="1"/>
        <rect x="8" y="1" width="3" height="9" rx="1"/>
        <rect x="12" y="0" width="3" height="10" rx="1"/>
      </svg>
      <span style={{ fontSize: 11 }}>5G</span>
    </div>
  </div>
)

// ─────────────────────────────────────────────
//  SVG PRIMITIVES
// ─────────────────────────────────────────────
export const ArcRing = ({ pct, size = 72, stroke = 6, fg = C.accent, bg = "rgba(255,255,255,0.1)", children }: {
  pct: number; size?: number; stroke?: number; fg?: string; bg?: string; children?: React.ReactNode
}) => {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.max(0, Math.min(pct / 100, 1)))
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", position: "absolute" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bg} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={fg}
          strokeWidth={stroke} strokeDasharray={circ}
          strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>{children}</div>
    </div>
  )
}

export const MacroWheel = ({ kcal, kcalGoal, protein, carbs, fat, size = 180 }: {
  kcal: number; kcalGoal: number; protein: number; carbs: number; fat: number; size?: number
}) => {
  const r = 72, stroke = 10, cx = size / 2, cy = size / 2
  const circ = 2 * Math.PI * r
  const total = protein + carbs + fat || 1
  const arcs = [
    { val: protein, color: C.accentWarm, label: "P" },
    { val: carbs,   color: C.carbsGreen,  label: "C" },
    { val: fat,     color: C.fatBlue,    label: "F" },
  ]
  let arcOffset = 0
  const arcSegments = arcs.map(a => {
    const seg = (a.val / total) * circ * 0.88
    const o = arcOffset
    arcOffset += seg + circ * 0.04
    return { ...a, seg, offset: -o }
  })
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", position: "absolute" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.borderLight} strokeWidth={stroke} />
        {arcSegments.map((a, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={a.color} strokeWidth={stroke}
            strokeDasharray={`${a.seg} ${circ}`}
            strokeDashoffset={a.offset}
            strokeLinecap="round"
          />
        ))}
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 1,
      }}>
        <span style={{ fontSize: 36, fontWeight: 800, color: C.text, fontFamily: FONT_SANS, lineHeight: 1, letterSpacing: "-1.5px" }}>
          {kcal}
        </span>
        <span style={{ fontSize: 11, color: C.textMuted, fontFamily: FONT_SANS, letterSpacing: "0.05em" }}>
          of {kcalGoal} kcal
        </span>
      </div>
    </div>
  )
}

export const Sparkline = ({ data, color = C.accent, height = 32, width = 80 }: {
  data: number[]; color?: string; height?: number; width?: number
}) => {
  if (!data || data.length < 2) return null
  const min = data.reduce((a, b) => a < b ? a : b)
  const max = data.reduce((a, b) => a > b ? a : b)
  const range = max - min || 1
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * width,
    height - ((v - min) / range) * height * 0.8 - height * 0.1,
  ])
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ")
  const area = `${d} L${width},${height} L0,${height} Z`
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <path d={area} fill={`${color}18`} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  )
}

// ─────────────────────────────────────────────
//  SHARED CARD SHELLS
// ─────────────────────────────────────────────
export const DarkCard = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{
    background: `linear-gradient(145deg, ${C.dark} 0%, ${C.darkMid} 100%)`,
    borderRadius: 20, padding: "20px 18px",
    overflow: "hidden", ...style,
  }}>{children}</div>
)

export const LightCard = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{
    background: C.surface,
    borderRadius: 16, padding: "16px",
    border: `1px solid ${C.border}`,
    ...style,
  }}>{children}</div>
)

export const Tag = ({ children, variant = "muted" }: { children: React.ReactNode; variant?: "muted" | "accent" | "green" }) => (
  <span style={{
    fontSize: 10, fontWeight: 600, letterSpacing: "0.06em",
    padding: "3px 8px", borderRadius: 6,
    background: variant === "accent" ? C.accentLight : variant === "green" ? C.greenLight : C.borderLight,
    color: variant === "accent" ? C.accent : variant === "green" ? C.green : C.textSub,
    fontFamily: FONT_SANS, textTransform: "uppercase",
  }}>{children}</span>
)

export const Divider = ({ light = false }: { light?: boolean }) => (
  <div style={{ height: 1, background: light ? "rgba(255,255,255,0.06)" : C.border, margin: "0" }} />
)

export const FAB = ({ onClick, color = C.accent, children = "+", label = "Add new item" }: {
  onClick?: () => void; color?: string; children?: React.ReactNode; label?: string
}) => (
  <button onClick={onClick} aria-label={label} style={{
    position: "absolute", bottom: 80, right: 18,
    width: 52, height: 52, borderRadius: "50%",
    background: color, border: "none", cursor: "pointer",
    fontSize: 24, color: "#fff", lineHeight: 1,
    boxShadow: `0 6px 20px ${color}55`,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: FONT_SANS,
  }}>{children}</button>
)

export const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    fontSize: 11, color: C.textMuted, letterSpacing: "0.07em",
    fontFamily: FONT_SANS, marginBottom: 10, textTransform: "uppercase",
  }}>{children}</div>
)

export const PageHeader = ({ title, right, sub }: {
  title: string; right?: React.ReactNode; sub?: string
}) => (
  <div style={{ padding: "18px 20px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
    <div>
      <h1 style={{
        fontSize: 28, fontWeight: 700, color: C.text, margin: 0,
        fontFamily: FONT, letterSpacing: "-0.5px", lineHeight: 1,
      }}>{title}</h1>
      {sub && <p style={{ margin: "3px 0 0", fontSize: 12, color: C.textMuted, fontFamily: FONT_SANS }}>{sub}</p>}
    </div>
    {right}
  </div>
)
