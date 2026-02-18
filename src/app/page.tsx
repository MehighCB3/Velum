'use client'

import { useState, useEffect, useCallback, ReactNode } from 'react'

// ─── Types ───
type ScreenName = 'Home' | 'Nutrition' | 'Nutrition 30d' | 'Fitness' | 'Budget' | 'Goals' | 'Feed' | 'Profile'

interface YearEvent {
  week: number
  label: string
  color: string
}

interface Meal {
  id: number
  name: string
  time: string
  cals: number
  protein: number
  carbs: number
  fat: number
  items: string[]
}

interface DayData {
  date: number
  status: 'good' | 'over' | 'none'
  cals?: number
}

interface FitnessActivity {
  name: string
  detail: string
  time: string
}

interface BudgetWeek {
  label: string
  spent: number
  budget: number
  current?: boolean
  future?: boolean
}

interface SpendingEntry {
  name: string
  amount: string
  cat: string
  time: string
}

interface Goal {
  id: number
  title: string
  tag: string
  tagColor: string
  desc: string
  current: number
  target: number
  unit: string
  pct: number
}

interface FeedItem {
  source: 'x' | 'mymind'
  author?: string
  type?: string
  time: string
  title: string
  tags: string[]
  note?: string
}

// ─── Shared Components ───

function BottomNav({ active, onNavigate }: { active: ScreenName; onNavigate: (s: ScreenName) => void }) {
  const tabs: { icon: string; label: string; screen: ScreenName }[] = [
    { icon: '⌂', label: 'Home', screen: 'Home' },
    { icon: '◉', label: 'Nutrition', screen: 'Nutrition' },
    { icon: '♡', label: 'Fitness', screen: 'Fitness' },
    { icon: '▤', label: 'Budget', screen: 'Budget' },
    { icon: '☰', label: 'Feed', screen: 'Feed' },
    { icon: '●', label: 'Profile', screen: 'Profile' },
  ]

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '8px 0 12px',
        borderTop: '1px solid #f0ece6',
        background: '#faf8f5',
      }}
    >
      {tabs.map((t) => {
        const isActive =
          active === t.screen ||
          (active === 'Nutrition 30d' && t.screen === 'Nutrition') ||
          (active === 'Goals' && t.screen === 'Profile')
        return (
          <div
            key={t.label}
            onClick={() => onNavigate(t.screen)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              color: isActive ? '#c4956a' : '#b5b0a8',
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.02em',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 16 }}>{t.icon}</span>
            <span>{t.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function WeekNav({ label, sub }: { label: string; sub: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 4px',
        marginBottom: 16,
      }}
    >
      <span style={{ color: '#b5b0a8', fontSize: 18, cursor: 'pointer' }}>‹</span>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#2d2a26', letterSpacing: '0.04em' }}>{label}</div>
        <div style={{ fontSize: 11, color: '#b5b0a8', marginTop: 2 }}>{sub}</div>
      </div>
      <span style={{ color: '#d5d0c9', fontSize: 18, cursor: 'pointer' }}>›</span>
    </div>
  )
}

function ProgressRing({
  size = 48,
  stroke = 4,
  pct = 0,
  color = '#c4956a',
  children,
}: {
  size?: number
  stroke?: number
  pct?: number
  color?: string
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eae6df" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 600,
          color: '#2d2a26',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function Card({
  children,
  style,
  onClick,
}: {
  children: ReactNode
  style?: React.CSSProperties
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: 20,
        border: '1px solid #f0ece6',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function DarkCard({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: '#1e1c19',
        borderRadius: 16,
        padding: 20,
        color: '#fff',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function SectionTitle({ children, right }: { children: ReactNode; right?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 24,
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 600, color: '#2d2a26', letterSpacing: '0.01em' }}>{children}</span>
      {right && (
        <span style={{ fontSize: 12, color: '#c4956a', fontWeight: 500, cursor: 'pointer' }}>{right}</span>
      )}
    </div>
  )
}

function BarMini({ pct = 0, color = '#c4956a', height = 4 }: { pct?: number; color?: string; height?: number }) {
  return (
    <div style={{ background: '#f0ece6', borderRadius: 2, height, width: '100%', overflow: 'hidden' }}>
      <div
        style={{
          background: color,
          height: '100%',
          width: `${Math.min(pct, 100)}%`,
          borderRadius: 2,
          transition: 'width 0.5s ease',
        }}
      />
    </div>
  )
}

function Pill({
  active,
  children,
  onClick,
}: {
  active?: boolean
  children: ReactNode
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '5px 12px',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        background: active ? '#2d2a26' : 'transparent',
        color: active ? '#fff' : '#b5b0a8',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {children}
    </div>
  )
}

function SmallBtn({
  children,
  accent,
  onClick,
  style,
}: {
  children: ReactNode
  accent?: boolean
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  style?: React.CSSProperties
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 14px',
        borderRadius: 8,
        border: accent ? 'none' : '1.5px solid #e0dcd5',
        background: accent ? '#c4956a' : 'transparent',
        color: accent ? '#fff' : '#8a857d',
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ─── MOCK DATA ───

const yearEvents: YearEvent[] = [
  { week: 12, label: 'Barcelona Marathon', color: '#e85c5c' },
  { week: 24, label: 'Wedding Anniversary', color: '#9b8ed6' },
  { week: 30, label: 'Ironman Training Camp', color: '#e8a85c' },
  { week: 36, label: 'Product Hunt Launch', color: '#6ba3d6' },
  { week: 48, label: 'Christmas in Romania', color: '#6ec87a' },
]

const mockMeals: Meal[] = [
  {
    id: 1,
    name: 'Açaí Bowl',
    time: '8:30 AM',
    cals: 420,
    protein: 12,
    carbs: 68,
    fat: 14,
    items: ['Açaí base (200g)', 'Banana', 'Granola (40g)', 'Honey (1 tbsp)', 'Blueberries'],
  },
  {
    id: 2,
    name: 'Grilled Chicken Salad',
    time: '1:15 PM',
    cals: 580,
    protein: 48,
    carbs: 22,
    fat: 32,
    items: ['Chicken breast (200g)', 'Mixed greens', 'Cherry tomatoes', 'Feta (30g)', 'Olive oil dressing'],
  },
  {
    id: 3,
    name: 'Protein Shake',
    time: '4:00 PM',
    cals: 280,
    protein: 35,
    carbs: 18,
    fat: 8,
    items: ['Whey protein (1 scoop)', 'Banana', 'Oat milk (250ml)', 'Peanut butter (1 tbsp)'],
  },
]

const mockActivities: FitnessActivity[] = [
  { name: 'Morning Run', detail: '5.2 km · 28:14 · 5:26/km', time: 'Mon 6:30 AM' },
  { name: 'BJJ Open Mat', detail: '1h 15m · 380 kcal', time: 'Wed 7:00 PM' },
  { name: 'Pool Swim', detail: '1.5 km · 42 laps · 35:20', time: 'Fri 7:00 AM' },
]

const mockBudgetWeeks: BudgetWeek[] = [
  { label: 'W05', spent: 82, budget: 70 },
  { label: 'W06', spent: 45, budget: 70 },
  { label: 'W07', spent: 23, budget: 70, current: true },
  { label: 'W08', spent: 0, budget: 70, future: true },
]

const mockSpending: SpendingEntry[] = [
  { name: 'Mercadona', amount: '€12', cat: 'Food', time: 'Mon' },
  { name: "Coffee @ Satan's", amount: '€3.50', cat: 'Fun', time: 'Tue' },
  { name: 'Bakery', amount: '€6', cat: 'Food', time: 'Wed' },
]

const initialGoals: Goal[] = [
  {
    id: 1,
    title: 'Strong Delivery & Ops Processes',
    tag: 'Career',
    tagColor: '#6ba3d6',
    desc: 'Best metric still unclear — will revise.',
    current: 0,
    target: 9,
    unit: 'Grade',
    pct: 0,
  },
  {
    id: 2,
    title: 'Generate €20K Solo',
    tag: 'Career',
    tagColor: '#6ba3d6',
    desc: 'Prove I can build and sell simultaneously.',
    current: 0,
    target: 20000,
    unit: '€',
    pct: 0,
  },
  {
    id: 3,
    title: 'Ironman Finish',
    tag: 'Sports',
    tagColor: '#e8a85c',
    desc: 'Build a foundation for lifelong health & mental strength.',
    current: 0,
    target: 13,
    unit: 'Hours',
    pct: 0,
  },
]

const mockFeedItems: FeedItem[] = [
  {
    source: 'x',
    author: '@levelsio',
    time: '2h ago',
    title: "Built a $2M ARR product as a solo founder. Here's my stack in 2026...",
    tags: ['Indie', 'SaaS'],
  },
  {
    source: 'mymind',
    type: 'article',
    time: 'Yesterday',
    title: 'The Psychology of Habit Loops in Product Design',
    tags: ['Product', 'UX'],
    note: 'Saved from Pocket',
  },
  {
    source: 'x',
    author: '@naval',
    time: '5h ago',
    title: 'Specific knowledge is knowledge that you cannot be trained for.',
    tags: ['Philosophy'],
  },
  {
    source: 'mymind',
    type: 'image',
    time: '2 days ago',
    title: 'Minimal dashboard inspiration — dark mode wellness tracker',
    tags: ['Design', 'Inspo'],
    note: 'Saved from Dribbble',
  },
  {
    source: 'x',
    author: '@paulg',
    time: '8h ago',
    title: "The best founders I know all share one trait: they're relentlessly resourceful.",
    tags: ['Startups'],
  },
  {
    source: 'mymind',
    type: 'article',
    time: '3 days ago',
    title: 'How Stripe Thinks About Developer Experience',
    tags: ['Product', 'DevEx'],
    note: 'Saved from blog.stripe.com',
  },
  {
    source: 'x',
    author: '@andreasklinger',
    time: '1d ago',
    title: 'Hot take: Most PMs should learn to code. Not to ship code, but to understand constraints.',
    tags: ['Product', 'Career'],
  },
]

// ─── Utility ───
function getCurrentWeek(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const diff = now.getTime() - start.getTime()
  return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000))
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

// ─── SCREENS ───

// HOME
function HomeScreen() {
  const [selectedEvent, setSelectedEvent] = useState<YearEvent | null>(null)
  const currentWeek = getCurrentWeek()
  const weeksLeft = 52 - currentWeek

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#2d2a26', marginBottom: 20 }}>Velum</div>

      <DarkCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div
              style={{
                fontSize: 11,
                color: '#a09b93',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {getFormattedDate()}
            </div>
            <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1.1, marginTop: 8 }}>
              {selectedEvent ? selectedEvent.week - currentWeek : weeksLeft}
            </div>
            <div style={{ fontSize: 13, color: '#a09b93', marginTop: 2 }}>
              {selectedEvent ? `weeks to ${selectedEvent.label}` : 'weeks left in 2026'}
            </div>
          </div>
          <ProgressRing size={56} pct={Math.round((currentWeek / 53) * 100)} color="#c4956a">
            <span style={{ color: '#fff', fontSize: 10 }}>W{currentWeek}</span>
          </ProgressRing>
        </div>
        {selectedEvent && (
          <div
            onClick={() => setSelectedEvent(null)}
            style={{
              marginTop: 12,
              fontSize: 11,
              color: '#c4956a',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            ← Back to year view
          </div>
        )}
      </DarkCard>

      <SectionTitle>2026 in Weeks</SectionTitle>
      <Card style={{ padding: 14 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {Array.from({ length: 52 }, (_, i) => {
            const weekNum = i + 1
            const event = yearEvents.find((e) => e.week === weekNum)
            const isSelected = selectedEvent?.week === weekNum
            const bg =
              weekNum < currentWeek
                ? '#2d2a26'
                : weekNum === currentWeek
                  ? '#c4956a'
                  : event
                    ? event.color
                    : '#eae6df'
            return (
              <div
                key={i}
                onClick={() => event && setSelectedEvent(event)}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: bg,
                  cursor: event ? 'pointer' : 'default',
                  outline: isSelected && event ? `2px solid ${event.color}` : 'none',
                  outlineOffset: 1,
                  transition: 'transform 0.15s',
                  transform: isSelected ? 'scale(1.4)' : 'scale(1)',
                }}
                title={event ? event.label : `Week ${weekNum}`}
              />
            )
          })}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 10,
            marginTop: 10,
            fontSize: 10,
            color: '#b5b0a8',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 2,
                background: '#2d2a26',
                display: 'inline-block',
              }}
            />{' '}
            Done
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 2,
                background: '#c4956a',
                display: 'inline-block',
              }}
            />{' '}
            Now
          </span>
          {yearEvents.map((e) => (
            <span
              key={e.label}
              onClick={() => setSelectedEvent(e)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 2,
                  background: e.color,
                  display: 'inline-block',
                }}
              />
              {e.label.split(' ')[0]}
            </span>
          ))}
        </div>
      </Card>

      <SectionTitle>Life in Weeks</SectionTitle>
      <Card style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          {[
            { val: '32', label: 'Age' },
            { val: '2,730', label: 'Weeks Left' },
            { val: '53', label: 'Years Left' },
          ].map((d) => (
            <div key={d.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#2d2a26' }}>{d.val}</div>
              <div style={{ fontSize: 10, color: '#b5b0a8', marginTop: 2 }}>{d.label}</div>
            </div>
          ))}
        </div>
        <BarMini pct={38.2} />
        <div style={{ fontSize: 10, color: '#b5b0a8', marginTop: 6, textAlign: 'center' }}>
          38.2% of 85 yr expectancy
        </div>
      </Card>
    </div>
  )
}

// NUTRITION TODAY
function NutritionScreen({ onSwitch30d }: { onSwitch30d: () => void }) {
  const [detail, setDetail] = useState<Meal | null>(null)
  const totalCals = mockMeals.reduce((s, m) => s + m.cals, 0)
  const totalProtein = mockMeals.reduce((s, m) => s + m.protein, 0)
  const totalCarbs = mockMeals.reduce((s, m) => s + m.carbs, 0)

  if (detail) {
    const m = detail
    return (
      <div>
        <div
          onClick={() => setDetail(null)}
          style={{ fontSize: 13, color: '#c4956a', fontWeight: 500, cursor: 'pointer', marginBottom: 16 }}
        >
          ← Back
        </div>

        <div
          style={{
            width: '100%',
            height: 180,
            borderRadius: 16,
            marginBottom: 16,
            background: 'linear-gradient(135deg, #e8e4de 0%, #d5cfc5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#b5b0a8',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <span>📷 Tap to add photo</span>
        </div>

        <div style={{ fontSize: 20, fontWeight: 700, color: '#2d2a26' }}>{m.name}</div>
        <div style={{ fontSize: 12, color: '#b5b0a8', marginTop: 4 }}>
          {m.time} · {m.cals} kcal
        </div>

        <div style={{ display: 'flex', gap: 16, marginTop: 20 }}>
          {[
            { label: 'Protein', val: m.protein, goal: 160, color: '#6ba3d6' },
            { label: 'Carbs', val: m.carbs, goal: 310, color: '#6ec87a' },
            { label: 'Fat', val: m.fat, goal: 80, color: '#e8a85c' },
          ].map((n) => (
            <div key={n.label} style={{ flex: 1, textAlign: 'center' }}>
              <ProgressRing size={52} pct={(n.val / n.goal) * 100} color={n.color}>
                <span style={{ fontSize: 11, fontWeight: 600 }}>{n.val}</span>
              </ProgressRing>
              <div style={{ fontSize: 10, color: '#b5b0a8', marginTop: 6 }}>{n.label}</div>
            </div>
          ))}
        </div>

        <SectionTitle>Ingredients</SectionTitle>
        <Card style={{ padding: 14 }}>
          {m.items.map((item, i) => (
            <div
              key={i}
              style={{
                padding: '8px 0',
                fontSize: 13,
                color: '#2d2a26',
                borderBottom: i < m.items.length - 1 ? '1px solid #f5f3ef' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: '#c4956a',
                  flexShrink: 0,
                }}
              />
              {item}
            </div>
          ))}
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: '#2d2a26' }}>Nutrition</div>
        <div style={{ display: 'flex', background: '#f0ece6', borderRadius: 8, padding: 2 }}>
          <Pill active>Today</Pill>
          <Pill onClick={onSwitch30d}>30 Days</Pill>
        </div>
      </div>

      <DarkCard>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: '#a09b93', letterSpacing: '0.04em' }}>CALORIES</div>
            <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.1, marginTop: 4 }}>{totalCals}</div>
            <div style={{ fontSize: 12, color: '#6ec87a', marginTop: 4 }}>{2600 - totalCals} remaining</div>
          </div>
          <ProgressRing size={60} pct={(totalCals / 2600) * 100} color="#c4956a">
            <span style={{ color: '#fff', fontSize: 11 }}>{Math.round((totalCals / 2600) * 100)}%</span>
          </ProgressRing>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { label: 'Protein', val: totalProtein, goal: 160, color: '#6ba3d6' },
            { label: 'Carbs', val: totalCarbs, goal: 310, color: '#6ec87a' },
          ].map((m) => (
            <div key={m.label} style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
                <span style={{ color: '#a09b93' }}>{m.label}</span>
                <span style={{ color: '#a09b93' }}>
                  {m.val}/{m.goal}g
                </span>
              </div>
              <div style={{ background: '#2a2825', borderRadius: 2, height: 4, overflow: 'hidden' }}>
                <div
                  style={{
                    background: m.color,
                    height: '100%',
                    width: `${(m.val / m.goal) * 100}%`,
                    borderRadius: 2,
                    transition: 'width 0.5s',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </DarkCard>

      <SectionTitle right="+ Add">Meals</SectionTitle>
      {mockMeals.map((m) => (
        <Card
          key={m.id}
          onClick={() => setDetail(m)}
          style={{
            marginBottom: 8,
            padding: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              flexShrink: 0,
              background: 'linear-gradient(135deg, #e8e4de 0%, #d5cfc5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            {m.id === 1 ? '🫐' : m.id === 2 ? '🥗' : '🥤'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#2d2a26' }}>{m.name}</div>
            <div style={{ fontSize: 11, color: '#b5b0a8', marginTop: 2 }}>
              {m.time} · {m.cals} kcal
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: '#6ba3d6' }}>{m.protein}g P</div>
            <div style={{ fontSize: 11, color: '#6ec87a' }}>{m.carbs}g C</div>
          </div>
        </Card>
      ))}
    </div>
  )
}

// NUTRITION 30 DAYS
function Nutrition30Screen({ onSwitchToday }: { onSwitchToday: () => void }) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)

  const daysData: DayData[] = []
  for (let d = 1; d <= 28; d++) {
    if (
      [1, 3, 5, 6, 8, 11, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28].includes(d)
    ) {
      daysData.push({ date: d, status: 'none' })
    } else if (d === 12 || d === 7) {
      daysData.push({ date: d, status: 'over', cals: d === 12 ? 2728 : 2900 })
    } else {
      daysData.push({ date: d, status: 'good', cals: [507, 780, 836, 1655, 1200, 1450, 980, 1100][d % 8] })
    }
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: '#2d2a26' }}>Nutrition</div>
        <div style={{ display: 'flex', background: '#f0ece6', borderRadius: 8, padding: 2 }}>
          <Pill onClick={onSwitchToday}>Today</Pill>
          <Pill active>30 Days</Pill>
        </div>
      </div>

      <DarkCard>
        <div
          style={{
            fontSize: 11,
            color: '#a09b93',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
          February 2026
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {[
            { val: '8', label: 'On Track', color: '#6ec87a' },
            { val: '2', label: 'Over', color: '#e85c5c' },
            { val: '20', label: 'No Data', color: '#706b63' },
          ].map((d) => (
            <div key={d.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: d.color }}>{d.val}</div>
              <div style={{ fontSize: 10, color: '#a09b93', marginTop: 2 }}>{d.label}</div>
            </div>
          ))}
        </div>
      </DarkCard>

      <SectionTitle>Daily View</SectionTitle>
      <Card style={{ padding: 16 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 4,
            marginBottom: 8,
          }}
        >
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div
              key={i}
              style={{ textAlign: 'center', fontSize: 10, color: '#b5b0a8', fontWeight: 500 }}
            >
              {d}
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {/* Feb 2026 starts on Sunday → 6 empty slots Mon–Sat */}
          {Array.from({ length: 6 }, (_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {daysData.map((d) => {
            const bg = d.status === 'good' ? '#6ec87a' : d.status === 'over' ? '#e85c5c' : '#eae6df'
            const textColor = d.status === 'none' ? '#b5b0a8' : '#fff'
            const isHovered = hoveredDay === d.date
            return (
              <div
                key={d.date}
                onMouseEnter={() => setHoveredDay(d.date)}
                onMouseLeave={() => setHoveredDay(null)}
                style={{ position: 'relative' }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 600,
                    color: textColor,
                    margin: '0 auto',
                    cursor: d.status !== 'none' ? 'pointer' : 'default',
                    transition: 'transform 0.15s',
                    transform: isHovered && d.status !== 'none' ? 'scale(1.15)' : 'scale(1)',
                  }}
                >
                  {d.date}
                </div>
                {isHovered && d.cals && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '110%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#2d2a26',
                      color: '#fff',
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      zIndex: 10,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    }}
                  >
                    {d.cals} kcal
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 14,
            marginTop: 14,
            fontSize: 10,
            color: '#b5b0a8',
            justifyContent: 'center',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#6ec87a',
                display: 'inline-block',
              }}
            />{' '}
            Good
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#e85c5c',
                display: 'inline-block',
              }}
            />{' '}
            Over
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#eae6df',
                display: 'inline-block',
              }}
            />{' '}
            No Data
          </span>
        </div>
      </Card>
    </div>
  )
}

// FITNESS
function FitnessScreen() {
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#2d2a26', marginBottom: 20 }}>Fitness</div>
      <WeekNav label="W07" sub="Feb 9 – 15" />

      <DarkCard style={{ padding: 16 }}>
        {/* Activity Rings */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 18 }}>
          {[
            { label: 'Steps', val: '6.2k', pct: 62 },
            { label: 'Runs', val: '1', pct: 33 },
            { label: 'Swims', val: '1', pct: 50 },
            { label: 'Cycles', val: '0', pct: 0 },
          ].map((a) => (
            <div key={a.label} style={{ textAlign: 'center' }}>
              <ProgressRing size={42} pct={a.pct} color="#c4956a">
                <span style={{ color: '#fff', fontSize: 11, fontWeight: 600 }}>{a.val}</span>
              </ProgressRing>
              <div style={{ fontSize: 9, color: '#a09b93', marginTop: 4 }}>{a.label}</div>
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: '#2d2a26', marginBottom: 14 }} />

        {/* Key Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {[
            { val: '12.4', unit: 'km', label: 'Distance' },
            { val: '820', unit: 'kcal', label: 'Burned' },
            { val: '1', unit: '', label: 'BJJ' },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {s.val}
                <span style={{ fontSize: 11, fontWeight: 400, color: '#a09b93' }}> {s.unit}</span>
              </div>
              <div style={{ fontSize: 10, color: '#706b63', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: '#2d2a26', margin: '14px 0' }} />

        {/* Health Data */}
        <div
          style={{
            fontSize: 11,
            color: '#a09b93',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          Health Data
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { icon: '❤️', label: 'Resting HR', val: '58 bpm', color: '#e85c5c' },
            { icon: '🫁', label: 'VO₂ Max', val: '44 ml/kg', color: '#6ba3d6' },
            { icon: '😴', label: 'Sleep', val: '7h 12m', color: '#9b8ed6' },
            { icon: '⚡', label: 'Recovery', val: 'Good', color: '#6ec87a' },
            { icon: '🌡', label: 'HRV', val: '52 ms', color: '#e8a85c' },
            { icon: '🏋️', label: 'Training Load', val: 'Moderate', color: '#c4956a' },
          ].map((h) => (
            <div
              key={h.label}
              style={{
                background: '#2a2825',
                borderRadius: 10,
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 14 }}>{h.icon}</span>
              <div>
                <div style={{ fontSize: 10, color: '#706b63' }}>{h.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: h.color }}>{h.val}</div>
              </div>
            </div>
          ))}
        </div>
      </DarkCard>

      <SectionTitle right="+ Add">Activities</SectionTitle>
      {mockActivities.map((a) => (
        <Card key={a.name} style={{ marginBottom: 8, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#2d2a26' }}>{a.name}</div>
              <div style={{ fontSize: 11, color: '#b5b0a8', marginTop: 2 }}>{a.detail}</div>
            </div>
            <div style={{ fontSize: 11, color: '#b5b0a8', whiteSpace: 'nowrap' }}>{a.time}</div>
          </div>
        </Card>
      ))}
    </div>
  )
}

// BUDGET
function BudgetScreen() {
  const weeks = mockBudgetWeeks
  const maxVal = Math.max(...weeks.map((w) => Math.max(w.spent, w.budget)))

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#2d2a26', marginBottom: 20 }}>Budget</div>
      <WeekNav label="W07" sub="Feb 9 – 15" />

      <DarkCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, color: '#a09b93', letterSpacing: '0.04em' }}>WEEKLY BUDGET</div>
            <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.1, marginTop: 4 }}>€23</div>
            <div style={{ fontSize: 12, color: '#6ec87a', marginTop: 4 }}>€47 remaining</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#a09b93' }}>of €70</div>
            <ProgressRing size={48} pct={33} color="#c4956a">
              <span style={{ color: '#fff', fontSize: 10 }}>33%</span>
            </ProgressRing>
          </div>
        </div>
      </DarkCard>

      <SectionTitle>Month Comparison</SectionTitle>
      <Card style={{ padding: 16 }}>
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'flex-end',
              height: 100,
              position: 'relative',
            }}
          >
            {/* Budget limit line */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: `${(70 / maxVal) * 100}%`,
                height: 1,
                borderTop: '1.5px dashed #c4956a',
                zIndex: 1,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  right: 0,
                  top: -14,
                  fontSize: 9,
                  color: '#c4956a',
                  fontWeight: 500,
                }}
              >
                €70 limit
              </span>
            </div>

            {weeks.map((w) => {
              const barH = w.future ? 0 : (w.spent / maxVal) * 100
              const isOver = w.spent > w.budget
              return (
                <div
                  key={w.label}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: 48,
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      borderRadius: '6px 6px 0 0',
                      height: `${barH}%`,
                      minHeight: w.future ? 0 : 2,
                      background: w.future
                        ? '#eae6df'
                        : isOver
                          ? '#e85c5c'
                          : w.current
                            ? '#c4956a'
                            : '#2d2a26',
                      transition: 'height 0.4s ease',
                      opacity: w.future ? 0.4 : 1,
                    }}
                  />
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 6 }}>
            {weeks.map((w) => (
              <div key={w.label} style={{ textAlign: 'center', width: 48 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: w.current ? 700 : 500,
                    color: w.current ? '#2d2a26' : '#b5b0a8',
                  }}
                >
                  {w.label}
                </div>
                <div style={{ fontSize: 9, color: '#b5b0a8' }}>{w.future ? '—' : `€${w.spent}`}</div>
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            marginTop: 10,
            padding: '8px 10px',
            background: '#fdf8f3',
            borderRadius: 8,
            fontSize: 11,
            color: '#8a857d',
          }}
        >
          W05 was <span style={{ color: '#e85c5c', fontWeight: 600 }}>€12 over</span> budget. W06 was{' '}
          <span style={{ color: '#6ec87a', fontWeight: 600 }}>€25 under</span>.
        </div>
      </Card>

      <SectionTitle>By Category</SectionTitle>
      <Card style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 24 }}>
          {[
            { name: 'Food', amount: '€18', color: '#e8a85c' },
            { name: 'Fun', amount: '€5', color: '#9b8ed6' },
          ].map((c) => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#2d2a26' }}>{c.name}</div>
                <div style={{ fontSize: 11, color: '#b5b0a8' }}>{c.amount}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <SectionTitle right="+ Add">Spending Log</SectionTitle>
      {mockSpending.map((s) => (
        <Card
          key={s.name}
          style={{
            marginBottom: 6,
            padding: '12px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#2d2a26' }}>{s.name}</div>
            <div style={{ fontSize: 11, color: '#b5b0a8' }}>
              {s.time} · {s.cat}
            </div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#2d2a26' }}>{s.amount}</div>
        </Card>
      ))}
    </div>
  )
}

// GOALS
function GoalsScreen({ onSwitchProfile }: { onSwitchProfile: () => void }) {
  const [editMode, setEditMode] = useState<number | null>(null)
  const [goals, setGoals] = useState<Goal[]>(initialGoals)

  const updateProgress = useCallback((id: number, newVal: number) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g
        const current = Math.max(0, Math.min(newVal, g.target))
        return { ...g, current, pct: Math.round((current / g.target) * 100) }
      })
    )
  }, [])

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: '#2d2a26' }}>Profile</div>
      </div>
      <div
        style={{
          display: 'flex',
          background: '#f0ece6',
          borderRadius: 8,
          padding: 2,
          width: 'fit-content',
          marginBottom: 20,
        }}
      >
        <Pill onClick={onSwitchProfile}>Profile</Pill>
        <Pill active>Goals</Pill>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {['This Year', '3 Years', '5 Years', '10 Years'].map((t, i) => (
          <div
            key={t}
            style={{
              padding: '5px 12px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 500,
              background: i === 0 ? '#2d2a26' : '#f5f3ef',
              color: i === 0 ? '#fff' : '#b5b0a8',
              cursor: 'pointer',
            }}
          >
            {t}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: '#b5b0a8', marginBottom: 16 }}>
        {goals.length} goals · {goals.filter((g) => g.pct >= 100).length} completed
      </div>

      {goals.map((g) => (
        <Card key={g.id} style={{ marginBottom: 10, padding: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 6,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: '#2d2a26', flex: 1, paddingRight: 8 }}>
              {g.title}
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: g.tagColor,
                background: `${g.tagColor}18`,
                padding: '2px 8px',
                borderRadius: 4,
                whiteSpace: 'nowrap',
              }}
            >
              {g.tag}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#b5b0a8', lineHeight: 1.5, marginBottom: 12 }}>{g.desc}</div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 11,
              color: '#b5b0a8',
              marginBottom: 6,
            }}
          >
            <span>
              {g.unit === '€'
                ? `€${g.current.toLocaleString()} / €${g.target.toLocaleString()}`
                : `${g.current} / ${g.target} ${g.unit}`}
            </span>
            <span>{g.pct}%</span>
          </div>
          <BarMini pct={g.pct} color={g.tagColor} />

          {editMode === g.id ? (
            <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="number"
                defaultValue={g.current}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateProgress(g.id, Number((e.target as HTMLInputElement).value))
                    setEditMode(null)
                  }
                }}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: 8,
                  border: '1.5px solid #c4956a',
                  fontSize: 13,
                  outline: 'none',
                  background: '#faf8f5',
                  color: '#2d2a26',
                }}
                placeholder={`Current ${g.unit}`}
                autoFocus
              />
              <SmallBtn
                accent
                onClick={(e) => {
                  const input = (e.target as HTMLElement).parentElement?.querySelector('input')
                  if (input) {
                    updateProgress(g.id, Number(input.value))
                  }
                  setEditMode(null)
                }}
              >
                Save
              </SmallBtn>
              <SmallBtn onClick={() => setEditMode(null)}>✕</SmallBtn>
            </div>
          ) : (
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <SmallBtn accent onClick={() => setEditMode(g.id)}>
                Update Progress
              </SmallBtn>
              <SmallBtn>Edit Goal</SmallBtn>
            </div>
          )}
        </Card>
      ))}

      <button
        style={{
          width: '100%',
          padding: 14,
          borderRadius: 12,
          border: '1.5px dashed #d5d0c9',
          background: 'transparent',
          color: '#b5b0a8',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          marginTop: 8,
        }}
      >
        + Add Goal
      </button>
    </div>
  )
}

// FEED
function FeedScreen() {
  const [tab, setTab] = useState<'all' | 'x' | 'mymind'>('all')
  const feedItems = mockFeedItems

  const filtered =
    tab === 'all' ? feedItems : tab === 'x' ? feedItems.filter((f) => f.source === 'x') : feedItems.filter((f) => f.source === 'mymind')

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#2d2a26', marginBottom: 4 }}>Feed</div>
      <div style={{ fontSize: 12, color: '#b5b0a8', marginBottom: 16 }}>
        {feedItems.length} unread items
      </div>

      <div
        style={{
          display: 'flex',
          background: '#f0ece6',
          borderRadius: 8,
          padding: 2,
          marginBottom: 20,
        }}
      >
        <Pill active={tab === 'all'} onClick={() => setTab('all')}>
          All
        </Pill>
        <Pill active={tab === 'x'} onClick={() => setTab('x')}>
          𝕏 Posts
        </Pill>
        <Pill active={tab === 'mymind'} onClick={() => setTab('mymind')}>
          MyMind
        </Pill>
      </div>

      {filtered.map((item, i) => (
        <Card key={i} style={{ marginBottom: 8, padding: 14 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {item.source === 'x' ? (
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: '#1a1a1a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    color: '#fff',
                    fontWeight: 700,
                  }}
                >
                  𝕏
                </span>
              ) : (
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: 'linear-gradient(135deg, #ff6b9d, #c44dff)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    color: '#fff',
                    fontWeight: 700,
                  }}
                >
                  m
                </span>
              )}
              <span style={{ fontSize: 12, fontWeight: 600, color: '#2d2a26' }}>
                {item.author || 'mymind'}
              </span>
            </div>
            <span style={{ fontSize: 10, color: '#b5b0a8' }}>{item.time}</span>
          </div>

          <div style={{ fontSize: 13, color: '#2d2a26', lineHeight: 1.55, marginBottom: 8 }}>
            {item.title}
          </div>

          {item.note && (
            <div
              style={{ fontSize: 11, color: '#b5b0a8', marginBottom: 8, fontStyle: 'italic' }}
            >
              {item.note}
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {item.tags.map((t) => (
              <span
                key={t}
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: '#8a857d',
                  background: '#f5f3ef',
                  padding: '2px 8px',
                  borderRadius: 4,
                }}
              >
                {t}
              </span>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              gap: 16,
              marginTop: 10,
              paddingTop: 8,
              borderTop: '1px solid #f5f3ef',
            }}
          >
            <span style={{ fontSize: 11, color: '#c4956a', fontWeight: 500, cursor: 'pointer' }}>
              Read
            </span>
            <span style={{ fontSize: 11, color: '#b5b0a8', cursor: 'pointer' }}>Save</span>
            <span style={{ fontSize: 11, color: '#b5b0a8', cursor: 'pointer' }}>Dismiss</span>
          </div>
        </Card>
      ))}
    </div>
  )
}

// PROFILE
function ProfileScreen({ onSwitchGoals }: { onSwitchGoals: () => void }) {
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#2d2a26', marginBottom: 4 }}>Profile</div>
      <div
        style={{
          display: 'flex',
          background: '#f0ece6',
          borderRadius: 8,
          padding: 2,
          width: 'fit-content',
          marginBottom: 20,
        }}
      >
        <Pill active>Profile</Pill>
        <Pill onClick={onSwitchGoals}>Goals</Pill>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          justifyContent: 'flex-end',
          marginBottom: 16,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6ec87a' }} />
        <span style={{ fontSize: 11, color: '#6ec87a', fontWeight: 500 }}>Synced just now</span>
      </div>

      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#2d2a26', marginBottom: 16 }}>Details</div>
        {[
          { label: 'Born', value: 'Sep 23, 1993' },
          { label: 'Country', value: 'Spain' },
          { label: 'Life Expectancy', value: '85 years' },
        ].map((f, i, arr) => (
          <div
            key={f.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: i < arr.length - 1 ? '1px solid #f5f3ef' : 'none',
            }}
          >
            <span style={{ fontSize: 13, color: '#b5b0a8' }}>{f.label}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#2d2a26' }}>{f.value}</span>
          </div>
        ))}
      </Card>

      <div style={{ marginTop: 20 }} />
      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#2d2a26', marginBottom: 12 }}>
          About Velum
        </div>
        <div style={{ fontSize: 12, color: '#b5b0a8', lineHeight: 1.8 }}>
          v2.0.0 · Vercel + Upstash Redis
          <br />
          Next.js · Syncs via shared API
        </div>
      </Card>

      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <button
          style={{
            flex: 1,
            padding: '12px 0',
            borderRadius: 10,
            border: '1.5px solid #c4956a',
            background: 'transparent',
            color: '#c4956a',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Force Sync
        </button>
        <button
          style={{
            flex: 1,
            padding: '12px 0',
            borderRadius: 10,
            border: '1.5px solid #e0dcd5',
            background: 'transparent',
            color: '#b5b0a8',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Update App
        </button>
      </div>
    </div>
  )
}

// ─── Main App ───
export default function Home() {
  const [activeScreen, setActiveScreen] = useState<ScreenName>('Home')

  const renderScreen = () => {
    switch (activeScreen) {
      case 'Home':
        return <HomeScreen />
      case 'Nutrition':
        return <NutritionScreen onSwitch30d={() => setActiveScreen('Nutrition 30d')} />
      case 'Nutrition 30d':
        return <Nutrition30Screen onSwitchToday={() => setActiveScreen('Nutrition')} />
      case 'Fitness':
        return <FitnessScreen />
      case 'Budget':
        return <BudgetScreen />
      case 'Goals':
        return <GoalsScreen onSwitchProfile={() => setActiveScreen('Profile')} />
      case 'Feed':
        return <FeedScreen />
      case 'Profile':
        return <ProfileScreen onSwitchGoals={() => setActiveScreen('Goals')} />
      default:
        return <HomeScreen />
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#faf8f5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 430,
          background: '#faf8f5',
          borderRadius: 32,
          boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '85vh',
          maxHeight: '90vh',
        }}
      >
        {/* Content area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '16px 20px 0',
          }}
        >
          {renderScreen()}
          <div style={{ height: 20 }} />
        </div>

        {/* Bottom nav */}
        <BottomNav active={activeScreen} onNavigate={setActiveScreen} />
      </div>
    </div>
  )
}
