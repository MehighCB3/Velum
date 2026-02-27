'use client'

import { C } from './components'

// ─────────────────────────────────────────────
//  NAV ICONS (thin line style)
// ─────────────────────────────────────────────
const Ico = ({ d, active, size = 20 }: { d: string; active: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={active ? C.accent : C.textMuted}
    strokeWidth={active ? 1.8 : 1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

export const CoachIcon  = ({ active }: { active: boolean }) => <Ico active={active} d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
export const YearIcon   = ({ active }: { active: boolean }) => <Ico active={active} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
export const NutrIcon   = ({ active }: { active: boolean }) => <Ico active={active} d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
export const FitIcon    = ({ active }: { active: boolean }) => <Ico active={active} d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
export const BudgetIcon = ({ active }: { active: boolean }) => <Ico active={active} d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
export const ProfileIcon= ({ active }: { active: boolean }) => <Ico active={active} d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />

// ─────────────────────────────────────────────
//  TEKY ICON — Blue Capybara with Orange Glasses
//
//  A friendly blue capybara character. Soft
//  dusty-blue fur with terracotta/orange round
//  glasses as the personality accent. Matches
//  the Velum brand.
//  Drawn at 100×100 viewBox, scales cleanly.
// ─────────────────────────────────────────────
export const TekyIcon = ({ size = 52 }: { size?: number }) => {
  const FUR       = "#5b8ea6"   // main fur — soft dusty blue
  const FUR_LIGHT = "#7aafca"   // lighter blue (snout, inner ears, belly)
  const FUR_DARK  = "#3a6d87"   // darker blue (shadows, under ears)
  const FUR_DEEP  = "#2c5470"   // deep shadow areas
  const EYES      = "#1c1008"   // very dark eyes
  const GLASS     = "#d4854d"   // terracotta/orange glasses — Velum accent
  const NOSE_TIP  = "#2a4f65"   // nostrils — dark blue
  const CHEEK     = "#e8a87a"   // warm blush on cheeks

  return (
    <svg
      width={size} height={size}
      viewBox="0 0 100 100"
      style={{ display: "block", overflow: "visible" }}
    >
      {/* ── LEFT EAR (behind head) ── */}
      <ellipse cx="22" cy="26" rx="14" ry="11" fill={FUR_DEEP} />
      <ellipse cx="22" cy="27" rx="8"  ry="6.5" fill={FUR_LIGHT} />

      {/* ── RIGHT EAR (behind head) ── */}
      <ellipse cx="78" cy="26" rx="14" ry="11" fill={FUR_DEEP} />
      <ellipse cx="78" cy="27" rx="8"  ry="6.5" fill={FUR_LIGHT} />

      {/* ── HEAD — wide rounded capybara shape ── */}
      <ellipse cx="50" cy="52" rx="40" ry="36" fill={FUR} />

      {/* ── LIGHTER BELLY/FACE area ── */}
      <ellipse cx="50" cy="58" rx="28" ry="24" fill={FUR_LIGHT} opacity="0.35" />

      {/* ── SNOUT — wide flat capybara muzzle ── */}
      <rect x="22" y="62" width="56" height="26" rx="14" fill={FUR_LIGHT} />

      {/* ── NOSE ── two nostrils */}
      <ellipse cx="40" cy="71" rx="5.5" ry="4" fill={NOSE_TIP} />
      <ellipse cx="60" cy="71" rx="5.5" ry="4" fill={NOSE_TIP} />
      {/* nose highlight */}
      <ellipse cx="39" cy="69.5" rx="2" ry="1.2" fill="rgba(255,255,255,0.2)" />
      <ellipse cx="59" cy="69.5" rx="2" ry="1.2" fill="rgba(255,255,255,0.2)" />

      {/* ── CHEEK BLUSH — warm spots ── */}
      <ellipse cx="26" cy="62" rx="7" ry="4.5" fill={CHEEK} opacity="0.25" />
      <ellipse cx="74" cy="62" rx="7" ry="4.5" fill={CHEEK} opacity="0.25" />

      {/* ── WHISKER DOTS ── subtle */}
      <circle cx="27" cy="73" r="1.5" fill={FUR_DARK} opacity="0.5"/>
      <circle cx="27" cy="78" r="1.5" fill={FUR_DARK} opacity="0.5"/>
      <circle cx="73" cy="73" r="1.5" fill={FUR_DARK} opacity="0.5"/>
      <circle cx="73" cy="78" r="1.5" fill={FUR_DARK} opacity="0.5"/>

      {/* ── EYES — dark, slightly large and friendly ── */}
      <circle cx="37" cy="50" r="7" fill={EYES} />
      <circle cx="63" cy="50" r="7" fill={EYES} />
      {/* eye sparkle — larger, more lively */}
      <circle cx="39.5" cy="47.5" r="2.8" fill="rgba(255,255,255,0.65)" />
      <circle cx="65.5" cy="47.5" r="2.8" fill="rgba(255,255,255,0.65)" />
      {/* secondary sparkle */}
      <circle cx="35" cy="52" r="1.2" fill="rgba(255,255,255,0.3)" />
      <circle cx="61" cy="52" r="1.2" fill="rgba(255,255,255,0.3)" />

      {/* ── GLASSES — round terracotta/orange frames ── */}
      {/* Left lens */}
      <circle cx="37" cy="50" r="11" fill="none" stroke={GLASS} strokeWidth="3.2" />
      {/* Right lens */}
      <circle cx="63" cy="50" r="11" fill="none" stroke={GLASS} strokeWidth="3.2" />
      {/* Bridge */}
      <line x1="48" y1="50" x2="52" y2="50" stroke={GLASS} strokeWidth="2.8" strokeLinecap="round"/>
      {/* Left temple */}
      <line x1="26" y1="48" x2="18" y2="45" stroke={GLASS} strokeWidth="2.4" strokeLinecap="round"/>
      {/* Right temple */}
      <line x1="74" y1="48" x2="82" y2="45" stroke={GLASS} strokeWidth="2.4" strokeLinecap="round"/>

      {/* ── SMALL SMILE ── */}
      <path d="M 42 80 Q 50 85 58 80" fill="none" stroke={FUR_DEEP} strokeWidth="1.8" strokeLinecap="round" />

      {/* ── CHIN / NECK shadow ── */}
      <ellipse cx="50" cy="87" rx="26" ry="5" fill={FUR_DEEP} opacity="0.25" />
    </svg>
  )
}
