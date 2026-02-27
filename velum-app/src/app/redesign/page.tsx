'use client'

import { useState, useEffect, ComponentType } from 'react'
import { C, FONT, FONT_SANS, loadFonts } from './components'
import { CoachIcon, YearIcon, NutrIcon, FitIcon, BudgetIcon, ProfileIcon } from './icons'
import CoachScreen from './screens/coach'
import YearScreen from './screens/year'
import NutritionScreen from './screens/nutrition'
import FitnessScreen from './screens/fitness'
import BudgetScreen from './screens/budget'
import ProfileScreen from './screens/profile'

// ─────────────────────────────────────────────
//  BOTTOM NAV
// ─────────────────────────────────────────────
type TabId = 'coach' | 'year' | 'nutrition' | 'fitness' | 'budget' | 'profile'

const tabs: { id: TabId; icon: ComponentType<{ active: boolean }>; label: string }[] = [
  { id: "coach",    icon: CoachIcon,    label: "Coach" },
  { id: "year",     icon: YearIcon,     label: "Year" },
  { id: "nutrition", icon: NutrIcon,    label: "Nutrition" },
  { id: "fitness",  icon: FitIcon,      label: "Fitness" },
  { id: "budget",   icon: BudgetIcon,   label: "Budget" },
  { id: "profile",  icon: ProfileIcon,  label: "Profile" },
]

const BottomNav = ({ active, setActive }: { active: TabId; setActive: (id: TabId) => void }) => (
  <div style={{
    display: "flex", justifyContent: "space-around",
    padding: "10px 0 20px",
    borderTop: `1px solid ${C.border}`,
    background: C.bg,
  }}>
    {tabs.map(t => {
      const isActive = active === t.id
      return (
        <button key={t.id} onClick={() => setActive(t.id)} style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          background: "none", border: "none", cursor: "pointer",
          padding: "4px 6px",
        }}>
          <t.icon active={isActive} />
          <span style={{
            fontSize: 9.5, letterSpacing: "0.04em", fontFamily: FONT_SANS,
            color: isActive ? C.accent : C.textMuted,
            fontWeight: isActive ? 600 : 400,
            textTransform: "uppercase",
          }}>{t.label}</span>
        </button>
      )
    })}
  </div>
)

// ─────────────────────────────────────────────
//  SCREENS MAP
// ─────────────────────────────────────────────
const SCREENS: Record<TabId, ComponentType> = {
  coach:     CoachScreen,
  year:      YearScreen,
  nutrition: NutritionScreen,
  fitness:   FitnessScreen,
  budget:    BudgetScreen,
  profile:   ProfileScreen,
}

// ─────────────────────────────────────────────
//  APP SHELL — Phone mockup wrapper
// ─────────────────────────────────────────────
export default function VelumRedesign() {
  const [active, setActive] = useState<TabId>("coach")

  useEffect(() => { loadFonts() }, [])

  const Screen = SCREENS[active]

  return (
    <div style={{
      minHeight: "100vh",
      background: "#e8e3dc",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "48px 20px 60px",
      fontFamily: FONT_SANS,
    }}>
      {/* Title */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{
          fontSize: 11, letterSpacing: "0.14em", color: "#8c8278",
          fontFamily: FONT_SANS, textTransform: "uppercase", marginBottom: 6,
        }}>
          Complete Redesign
        </div>
        <div style={{
          fontSize: 34, fontWeight: 800, color: "#1a1814",
          fontFamily: FONT, letterSpacing: "-1.5px",
        }}>
          Velum 1.0
        </div>
        <div style={{ fontSize: 13, color: "#8c8278", marginTop: 4 }}>
          6 screens · Click tabs to explore
        </div>
      </div>

      {/* Phone */}
      <div style={{
        width: 375,
        height: 790,
        background: C.bg,
        borderRadius: 50,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: `
          0 0 0 10px #1a1814,
          0 0 0 12px #2e2a26,
          0 50px 120px rgba(0,0,0,0.45)
        `,
      }}>
        {/* Notch */}
        <div style={{
          position: "absolute", top: 0, left: "50%",
          transform: "translateX(-50%)",
          width: 120, height: 34,
          background: "#1a1814",
          borderRadius: "0 0 20px 20px",
          zIndex: 100,
        }} />

        {/* Screen content */}
        <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          <Screen />
        </div>

        {/* Nav */}
        <BottomNav active={active} setActive={setActive} />
      </div>

      {/* Screen name pill */}
      <div style={{
        marginTop: 20,
        padding: "8px 20px",
        background: "#1a1814",
        borderRadius: 24,
        color: "#fff",
        fontSize: 13, fontFamily: FONT_SANS,
        letterSpacing: "0.03em",
      }}>
        {active.charAt(0).toUpperCase() + active.slice(1)}
      </div>
    </div>
  )
}
