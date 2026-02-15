'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { 
  Search, 
  ChevronRight, 
  ChevronDown, 
  Plus,
  Settings,
  Sparkles, 
  X, 
  Apple, 
  Target, 
  Dumbbell, 
  Brain, 
  CheckSquare,
  ArrowLeft,
  Wallet,
  Menu,
  Star,
  ImageIcon,
  Trash2,
  BookOpen,
  Copy,
  Check
} from 'lucide-react'
import AgentInsight from '../components/AgentInsight'
import { useInsights } from '../hooks/useInsights'

// Profile type
interface Profile {
  birth_date: string
  country?: string
  life_expectancy: number
  ageInWeeks: number
  totalWeeks: number
  weeksRemaining: number
  currentAge: number
  percentLived: number
  yearsRemaining: number
}

// Types - Extended with photoUrl and notes
interface FoodEntry {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  time: string
  date: string
  photoUrl?: string
  notes?: string
  belief?: string
}

interface NutritionData {
  date: string
  entries: FoodEntry[]
  totals: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
  goals: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
}

// Fitness types
interface FitnessEntry {
  id: string
  date: string
  timestamp: string
  type: 'steps' | 'run' | 'swim' | 'cycle' | 'jiujitsu' | 'vo2max' | 'training_load' | 'stress' | 'recovery' | 'hrv' | 'weight' | 'body_fat'
  name?: string
  steps?: number
  distanceKm?: number
  duration?: number
  distance?: number
  pace?: number
  calories?: number
  // Advanced metrics
  vo2max?: number
  trainingLoad?: number
  stressLevel?: number
  recoveryScore?: number
  hrv?: number
  weight?: number
  bodyFat?: number
  notes?: string
}

interface FitnessWeek {
  week: string
  entries: FitnessEntry[]
  totals: {
    steps: number
    runs: number
    swims: number
    cycles: number
    jiujitsu: number
    totalDistance: number
    totalCalories: number
    runDistance: number
    swimDistance: number
    cycleDistance: number
  }
  goals: {
    steps: number
    runs: number
    swims: number
  }
  advanced?: {
    avgVo2max: number
    totalTrainingLoad: number
    avgStress: number
    avgRecovery: number
    recoveryStatus: 'good' | 'fair' | 'poor'
    latestHrv: number
    latestWeight: number
    latestBodyFat: number
  }
}

interface NavItem {
  id: string
  name: string
  icon?: React.ReactNode
  children?: NavItem[]
  type: 'page' | 'folder'
}

interface WeekDayData {
  date: string
  dayName: string
  dayNumber: number
  entries: FoodEntry[]
  totals: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
  goals: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
}

// Budget display types
interface BudgetExpenditure {
  id: string
  description: string
  category: string
  amount: number
  date: string
  reason?: string
}

interface BudgetWeekDisplay {
  weekNum: number
  weekLabel: string
  weekKey: string
  budget: number
  spent: number
  remaining: number
  expenditures: BudgetExpenditure[]
}

// Spanish learning types
interface SpanishCard {
  id: string
  spanish_word: string
  english_translation: string
  word_type?: string
  tags?: string[]
  example_sentence_spanish?: string
  example_sentence_english?: string
}

interface SpanishProgress {
  reviewedToday: number
  stats?: {
    total: number
    new_count: number
    learning_count: number
    review_count: number
    parked_count: number
  }
}

interface SpanishExerciseContent {
  // Verb conjugation
  verb?: string
  tense?: string
  pronoun?: string
  hint?: string
  // Cloze
  text?: string
  // Translation
  direction?: string
  sourceText?: string
  // Grammar
  question?: string
  topic?: string
  options?: string[]
  explanation?: string
  // Writing
  prompt?: string
  minWords?: number
  suggestedVocabulary?: string[]
  exampleAnswer?: string
}

interface SpanishExercise {
  id: string
  type: 'verb_conjugation' | 'cloze' | 'translation' | 'grammar' | 'writing'
  difficulty?: string
  content: SpanishExerciseContent
  answer_key?: { answer?: string; answers?: string[]; correct?: number; type?: string }
}

// 7-Day Bar Chart Component
function SevenDayBarChart({ days, calorieGoal = 2000 }: { days: WeekDayData[], calorieGoal?: number }) {
  const maxCalories = Math.max(...days.map(d => d.totals.calories), calorieGoal)
  
  return (
    <div className="bg-white border border-stone-100 rounded-xl p-4 mb-5">
      <h3 className="text-sm font-semibold text-stone-900 mb-4">Last 7 Days</h3>
      <div className="flex items-end justify-between gap-2 h-32">
        {days.map((day) => {
          const isOverGoal = day.totals.calories > calorieGoal
          const barHeight = Math.min((day.totals.calories / maxCalories) * 100, 100)
          
          return (
            <div key={day.date} className="flex flex-col items-center flex-1">
              <div className="relative w-full flex items-end justify-center h-24 mb-2">
                {/* Goal line indicator */}
                <div 
                  className="absolute w-full border-t border-dashed border-stone-300 z-10"
                  style={{ bottom: `${(calorieGoal / maxCalories) * 100}%` }}
                />
                {/* Bar */}
                <div
                  className={`w-full max-w-8 rounded-t-md transition-all duration-500 ${
                    isOverGoal ? 'bg-red-500' : 'bg-emerald-500'
                  }`}
                  style={{ height: `${barHeight}%` }}
                  title={`${day.totals.calories} kcal`}
                />
              </div>
              <span className="text-xs text-stone-500 font-medium">{day.dayName}</span>
              <span className="text-[10px] sm:text-xs text-stone-400">{day.totals.calories}</span>
            </div>
          )
        })}
      </div>
      <div className="flex items-center justify-center gap-4 mt-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-emerald-500 rounded" />
          <span className="text-stone-500">≤{calorieGoal}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded" />
          <span className="text-stone-500">&gt;{calorieGoal}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 border-t border-dashed border-stone-300" />
          <span className="text-stone-500">Goal</span>
        </div>
      </div>
    </div>
  )
}

// Meal Detail Modal
function MealDetailModal({ 
  entry, 
  isOpen, 
  onClose 
}: { 
  entry: FoodEntry | null
  isOpen: boolean
  onClose: () => void
}) {
  if (!isOpen || !entry) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-100">
          <h3 className="text-lg font-semibold text-stone-900">Meal Details</h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-lg"
          >
            <X size={20} className="text-stone-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4">
          {/* Photo */}
          {entry.photoUrl ? (
            <div className="mb-4">
              <img 
                src={entry.photoUrl} 
                alt={entry.name}
                className="w-full h-48 object-cover rounded-xl"
              />
            </div>
          ) : (
            <div className="mb-4 h-32 bg-stone-100 rounded-xl flex flex-col items-center justify-center text-stone-400">
              <ImageIcon size={32} className="mb-2" />
              <span className="text-sm">No photo</span>
            </div>
          )}
          
          {/* Name & Time */}
          <div className="mb-4">
            <h4 className="text-xl font-semibold text-stone-900">{entry.name}</h4>
            <p className="text-sm text-stone-500">{entry.time} · {entry.date}</p>
          </div>
          
          {/* Nutrient Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-orange-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-orange-600">{entry.calories}</p>
              <p className="text-xs text-orange-500">kcal</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-blue-600">{entry.protein}g</p>
              <p className="text-xs text-blue-500">protein</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-green-600">{entry.carbs}g</p>
              <p className="text-xs text-green-500">carbs</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-purple-600">{entry.fat}g</p>
              <p className="text-xs text-purple-500">fat</p>
            </div>
          </div>
          
          {/* Notes/Belief */}
          {(entry.notes || entry.belief) && (
            <div className="bg-stone-50 rounded-xl p-4">
              <p className="text-xs font-medium text-stone-500 uppercase mb-2">Notes</p>
              <p className="text-sm text-stone-700">{entry.notes || entry.belief}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Sidebar Component
function Sidebar({ 
  navigation, 
  activeItem, 
  setActiveItem,
  expandedFolders,
  toggleFolder,
  isOpen,
  onClose
}: {
  navigation: NavItem[]
  activeItem: string
  setActiveItem: (id: string) => void
  expandedFolders: Set<string>
  toggleFolder: (id: string) => void
  isOpen: boolean
  onClose: () => void
}) {
  const renderNavItem = (item: NavItem, depth: number = 0) => {
    const isExpanded = expandedFolders.has(item.id)
    const isActive = activeItem === item.id
    const hasChildren = item.children && item.children.length > 0
    
    return (
      <div key={item.id}>
        <button
          onClick={() => {
            if (hasChildren) {
              toggleFolder(item.id)
            } else {
              setActiveItem(item.id)
              onClose()
            }
          }}
          className={`w-full flex items-center gap-2 px-2 py-2.5 rounded-lg text-sm transition-all group min-h-[44px]
            ${isActive ? 'bg-orange-100 text-orange-700' : 'text-stone-600 hover:bg-stone-100'}`}
          style={{ paddingLeft: `${8 + depth * 12}px` }}
        >
          {hasChildren ? (
            <span className="w-4 h-4 flex items-center justify-center text-stone-400">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          ) : (
            <span className="w-4" />
          )}
          
          {item.icon && (
            <span className={isActive ? 'text-orange-500' : 'text-stone-400 group-hover:text-stone-500'}>
              {item.icon}
            </span>
          )}
          
          <span className="flex-1 text-left truncate">{item.name}</span>
        </button>
        
        {hasChildren && isExpanded && (
          <div className="mt-0.5">
            {item.children!.map(child => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }
  
  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-72 border-r border-stone-200/50 flex flex-col h-screen
        bg-stone-50 lg:bg-stone-100/50
        shadow-xl lg:shadow-none
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="h-14 flex items-center gap-3 px-4 border-b border-stone-200/50">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-pink-600 rounded-lg flex items-center justify-center shadow-sm shadow-orange-500/20">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <span className="font-semibold text-stone-800">Velum</span>
          <button 
            onClick={onClose}
            className="ml-auto lg:hidden p-2.5 hover:bg-stone-200 rounded-lg"
          >
            <X size={18} className="text-stone-500" />
          </button>
        </div>
        
        {/* Search */}
        <div className="px-3 py-3">
          <button className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-stone-400 hover:bg-stone-200/50 rounded-lg transition-colors min-h-[44px]">
            <Search size={16} />
            <span>Search</span>
          </button>
        </div>
        
        {/* Navigation */}
        <div className="flex-1 overflow-auto px-3 pb-4">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider px-2 mb-2">
            WORKSPACE
          </p>
          <nav className="space-y-0.5">
            {navigation.map(item => renderNavItem(item))}
          </nav>
        </div>
        
        {/* Settings */}
        <div className="p-3 border-t border-stone-200/50">
          <button className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-stone-500 hover:bg-stone-200/50 rounded-lg transition-colors min-h-[44px]">
            <Settings size={16} />
            <span>Settings</span>
          </button>
        </div>
      </aside>
    </>
  )
}

// Nutrition Today View
function NutritionTodayView({
  nutritionData,
}: {
  nutritionData: NutritionData
}) {
  const [activeTab, setActiveTab] = useState('today')
  const [weekData, setWeekData] = useState<WeekDayData[]>([])
  const { insights: nutritionInsights } = useInsights('nutrition')
  const { entries, totals, goals } = nutritionData
  
  const remaining = goals.calories - totals.calories
  const fiberTotal = entries.reduce((sum, e) => sum + (e.fiber || 0), 0)
  
  // Fetch 7-day data
  useEffect(() => {
    const fetchWeekData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]
        const response = await fetch(`/api/nutrition/week?date=${today}`)
        if (response.ok) {
          const data = await response.json()
          setWeekData(data.days || [])
        }
      } catch (error) {
        console.error('Error fetching week data:', error)
      }
    }
    fetchWeekData()
  }, [])
  
  // Meal emoji based on food name
  const getMealEmoji = (name: string, time: string) => {
    const lower = name.toLowerCase()
    if (lower.includes('coffee') || lower.includes('tea') || lower.includes('latte') || lower.includes('cappuccino')) return '\u2615'
    if (lower.includes('yogurt') || lower.includes('chia') || lower.includes('berry') || lower.includes('raspberry')) return '\uD83E\uDED0'
    if (lower.includes('chicken')) return '\uD83C\uDF57'
    if (lower.includes('salmon') || lower.includes('fish') || lower.includes('tuna')) return '\uD83C\uDF63'
    if (lower.includes('apple')) return '\uD83C\uDF4E'
    if (lower.includes('banana')) return '\uD83C\uDF4C'
    if (lower.includes('salad') || lower.includes('veggie')) return '\uD83E\uDD57'
    if (lower.includes('egg')) return '\uD83E\uDD5A'
    if (lower.includes('bread') || lower.includes('toast') || lower.includes('sandwich')) return '\uD83E\uDD6A'
    if (lower.includes('rice')) return '\uD83C\uDF5A'
    if (lower.includes('pasta') || lower.includes('noodle')) return '\uD83C\uDF5D'
    if (lower.includes('steak') || lower.includes('beef') || lower.includes('meat')) return '\uD83E\uDD69'
    if (lower.includes('pizza')) return '\uD83C\uDF55'
    if (lower.includes('soup')) return '\uD83C\uDF72'
    if (lower.includes('smoothie') || lower.includes('shake') || lower.includes('protein')) return '\uD83E\uDD64'
    if (lower.includes('nuts') || lower.includes('almond')) return '\uD83E\uDD5C'
    if (lower.includes('oat') || lower.includes('cereal') || lower.includes('granola')) return '\uD83E\uDD63'
    // Time-based fallback
    const hour = parseInt(time.split(':')[0])
    if (hour < 10) return '\uD83E\uDD63'
    if (hour < 14) return '\uD83E\uDD57'
    if (hour < 17) return '\uD83C\uDF4E'
    return '\uD83C\uDF7D\uFE0F'
  }
  
  // AI insight
  const generateInsight = () => {
    const parts: string[] = []
    if (remaining > 0) {
      parts.push(`You've got ${remaining} calories left today.`)
    } else {
      parts.push(`You're ${Math.abs(remaining)} calories over your goal today.`)
    }
    const proteinPct = Math.round((totals.protein / goals.protein) * 100)
    const carbsPct = Math.round((totals.carbs / goals.carbs) * 100)
    const fatPct = Math.round((totals.fat / goals.fat) * 100)
    if (proteinPct < 50) {
      parts.push('Protein is low \u2014 a chicken breast or Greek yogurt would help hit your target.')
    } else if (fatPct > 90) {
      parts.push('Fat intake is nearing your limit \u2014 consider lighter options for remaining meals.')
    } else if (carbsPct < 40) {
      parts.push('Carbs are low \u2014 some rice or whole grain bread could help balance your macros.')
    } else {
      parts.push('Your macros are looking balanced. Keep it up!')
    }
    return parts.join(' ')
  }
  
  return (
    <div className="max-w-2xl lg:max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Nutrition</h1>
          <p className="text-sm text-stone-400">Track your daily intake</p>
        </div>
        <button className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium rounded-full shadow-sm hover:shadow-md transition-all">
          + Log food
        </button>
      </div>

      {/* Toggle */}
      <div className="flex p-1 bg-stone-100 rounded-lg mb-5">
        <button
          onClick={() => setActiveTab('today')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all min-h-[44px] ${
            activeTab === 'today' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setActiveTab('week')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all min-h-[44px] ${
            activeTab === 'week' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500'
          }`}
        >
          Past 7 days
        </button>
      </div>

      {activeTab === 'today' ? (
        <>
          {/* Dark Hero Card */}
          <div className="relative bg-gradient-to-br from-[#1a1d2e] to-[#252840] rounded-2xl p-4 sm:p-5 mb-6 overflow-hidden">
            {/* Top metrics row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
              <div className="text-center">
                <p className="text-[10px] sm:text-xs font-semibold text-orange-400 uppercase tracking-wider mb-0.5">Goal</p>
                <p className="text-sm font-bold text-orange-400">{goals.calories}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] sm:text-xs font-semibold text-orange-400 uppercase tracking-wider mb-0.5">Left</p>
                <p className="text-sm font-bold text-orange-400">{remaining}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] sm:text-xs font-semibold text-stone-400 uppercase tracking-wider mb-0.5">Fiber</p>
                <p className="text-sm font-bold text-white">{fiberTotal > 0 ? `${fiberTotal}g` : '--'}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] sm:text-xs font-semibold text-stone-400 uppercase tracking-wider mb-0.5">Water</p>
                <p className="text-sm font-bold text-white">--</p>
              </div>
            </div>

            {/* Big calorie number */}
            <div className="text-center mb-5">
              <p className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight">{totals.calories}</p>
              <p className="text-xs sm:text-sm text-stone-400 mt-1">Calories</p>
            </div>

            {/* Macro breakdown */}
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-sm text-stone-300">Protein <span className="font-semibold text-white">{totals.protein}</span> <span className="text-stone-500">/{goals.protein}g</span></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                <span className="text-sm text-stone-300">Carbs <span className="font-semibold text-white">{totals.carbs}</span> <span className="text-stone-500">/{goals.carbs}g</span></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                <span className="text-sm text-stone-300">Fat <span className="font-semibold text-white">{totals.fat}</span> <span className="text-stone-500">/{goals.fat}g</span></span>
              </div>
            </div>
          </div>

          {/* Meals List */}
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-stone-900 mb-3">Meals</h3>

            <div className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 p-3 bg-white border border-stone-100 rounded-xl hover:border-stone-200 transition-all">
                  <div className="w-10 h-10 bg-stone-50 rounded-full flex items-center justify-center text-lg">
                    {getMealEmoji(entry.name, entry.time)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">{entry.name}</p>
                    <p className="text-xs text-stone-400">{entry.time}</p>
                  </div>
                  <p className="text-sm font-semibold text-stone-900">{entry.calories} kcal</p>
                </div>
              ))}

              {entries.length === 0 && (
                <p className="text-stone-400 text-center py-8 text-sm border border-dashed border-stone-200 rounded-xl">
                  No meals logged today
                </p>
              )}
            </div>

            <button className="w-full mt-3 p-3 text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors">
              + Add meal
            </button>
          </div>

          {/* AI Insight Card */}
          <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Sparkles size={16} className="text-violet-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-stone-900 mb-1">AI Insight</p>
                <p className="text-xs text-stone-600 leading-relaxed">{generateInsight()}</p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <WeekView onDayClick={(day) => console.log('Selected:', day)} />
      )}
      {nutritionInsights.map((ni) => (
        <AgentInsight key={ni.agentId} agent={ni.agent} emoji={ni.emoji} insight={ni.insight} updatedAt={ni.updatedAt} type={ni.type} />
      ))}
    </div>
  )
}

function MacroStat({ label, current, goal, color }: { label: string; current: number; goal: number; color: string }) {
  const pct = Math.round((current / goal) * 100)
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-stone-400">{label}</span>
        <span className="text-xs font-semibold text-white">{current}<span className="text-stone-500 font-normal">/{goal}g</span></span>
      </div>
      <div className="h-1.5 bg-stone-700 rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  )
}

// Week View Component
function WeekView({ onDayClick }: { onDayClick: (day: WeekDayData) => void }) {
  const [weekData, setWeekData] = useState<WeekDayData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<WeekDayData | null>(null)
  
  useEffect(() => {
    const fetchWeek = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]
        const response = await fetch(`/api/nutrition/week?date=${today}`)
        if (response.ok) {
          const data = await response.json()
          setWeekData(data.days)
        }
      } catch (error) {
        console.error('Error fetching week:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchWeek()
  }, [])
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }
  
  if (selectedDay) {
    return (
      <div className="max-w-2xl lg:max-w-3xl mx-auto">
        <button 
          onClick={() => setSelectedDay(null)}
          className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 mb-4"
        >
          <ArrowLeft size={16} />
          Back to week
        </button>
        
        <div className="bg-white border border-stone-100 rounded-xl p-5 mb-5">
          <h2 className="text-lg font-semibold text-stone-900 mb-1">
            {new Date(selectedDay.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h2>
          <p className="text-sm text-stone-500 mb-4">
            {selectedDay.totals.calories} kcal · {selectedDay.totals.protein}g protein · {selectedDay.entries.length} meals
          </p>
          
          <div className="space-y-2">
            {selectedDay.entries.length > 0 ? (
              selectedDay.entries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg">
                  <div className="w-8 h-8 bg-stone-200 rounded-lg flex items-center justify-center">🍽️</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-stone-900">{entry.name}</p>
                    <p className="text-xs text-stone-400">{entry.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-stone-900">{entry.calories}</p>
                    <p className="text-xs text-stone-400">kcal</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-stone-400 text-center py-4">No meals logged</p>
            )}
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="max-w-2xl lg:max-w-3xl mx-auto">
      <h2 className="text-lg font-semibold text-stone-900 mb-4">Past 7 Days</h2>
      
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-6">
        {weekData.map((day) => {
          const progress = Math.round((day.totals.calories / day.goals.calories) * 100)
          const isToday = day.date === new Date().toISOString().split('T')[0]

          return (
            <button
              key={day.date}
              onClick={() => setSelectedDay(day)}
              className={`flex flex-col items-center p-2 sm:p-3 rounded-xl transition-all ${
                isToday ? 'bg-orange-100 border-2 border-orange-300' : 'bg-white border border-stone-100 hover:border-stone-300'
              }`}
            >
              <span className="text-[10px] sm:text-xs text-stone-500 mb-1">{day.dayName}</span>
              <span className="text-base sm:text-lg font-bold text-stone-900 mb-1 sm:mb-2">{day.dayNumber}</span>

              {/* Mini ring */}
              <div className="relative w-8 h-8 sm:w-10 sm:h-10">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e5e5" strokeWidth="12" />
                  <circle
                    cx="50" cy="50" r="42" fill="none"
                    stroke={progress > 100 ? '#ef4444' : '#f97316'}
                    strokeWidth="12" strokeLinecap="round"
                    strokeDasharray={`${Math.min(progress, 100) * 2.64} 264`}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[8px] sm:text-[10px] font-medium">{Math.min(progress, 100)}%</span>
                </div>
              </div>

              <span className={`text-[10px] sm:text-xs mt-1 ${progress > day.goals.calories ? 'text-red-500' : 'text-stone-500'}`}>
                {day.totals.calories}
              </span>
            </button>
          )
        })}
      </div>
      
      {/* Weekly Summary */}
      <div className="bg-stone-100 rounded-xl p-4">
        <h3 className="text-sm font-medium text-stone-700 mb-3">Weekly Average</h3>
        {weekData.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-stone-900">
                {Math.round(weekData.reduce((a, d) => a + d.totals.calories, 0) / 7)}
              </p>
              <p className="text-xs text-stone-500">kcal/day</p>
            </div>
            <div>
              <p className="text-lg font-bold text-stone-900">
                {Math.round(weekData.reduce((a, d) => a + d.totals.protein, 0) / 7)}
              </p>
              <p className="text-xs text-stone-500">protein</p>
            </div>
            <div>
              <p className="text-lg font-bold text-stone-900">
                {Math.round(weekData.reduce((a, d) => a + d.totals.carbs, 0) / 7)}
              </p>
              <p className="text-xs text-stone-500">carbs</p>
            </div>
            <div>
              <p className="text-lg font-bold text-stone-900">
                {Math.round(weekData.reduce((a, d) => a + d.entries.length, 0) / 7)}
              </p>
              <p className="text-xs text-stone-500">meals/day</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Goal type
interface Goal {
  id: string
  title: string
  area: string
  objective: string
  keyMetric: string
  targetValue: number
  currentValue: number
  unit: string
  horizon: 'year' | '3years' | '5years' | '10years' | 'bucket'
  createdAt: string
  completedAt?: string
}

// Goals View with Life Timeline
function GoalsView() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [expandedYear, setExpandedYear] = useState<number | null>(null)
  const [zoomLevel, setZoomLevel] = useState<'macro' | 'micro'>('macro')
  const [goalsTab, setGoalsTab] = useState<'life' | 'goals'>('life')
  const [formData, setFormData] = useState({ birthDate: '', country: '', lifeExpectancy: 85 })
  
  // Goal-related state
  const [activeHorizon, setActiveHorizon] = useState<'year' | '3years' | '5years' | '10years' | 'bucket'>('year')
  const [timelineHorizon, setTimelineHorizon] = useState<'year' | '3years' | '5years' | '10years' | 'bucket'>('year')
  const [goals, setGoals] = useState<Goal[]>([])
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [newGoal, setNewGoal] = useState({
    title: '',
    area: '',
    objective: '',
    keyMetric: '',
    targetValue: '',
    unit: ''
  })

  const horizons: { key: 'year' | '3years' | '5years' | '10years' | 'bucket', label: string }[] = [
    { key: 'year', label: 'This Year' },
    { key: '3years', label: '3 Year' },
    { key: '5years', label: '5 Year' },
    { key: '10years', label: '10 Year' },
    { key: 'bucket', label: 'Bucket List' },
  ]

  const phases = [
    { name: 'Childhood', start: 0, end: 5, color: '#fbbf24' },
    { name: 'School', start: 6, end: 17, color: '#f97316' },
    { name: 'University', start: 18, end: 22, color: '#ef4444' },
    { name: 'Early Career', start: 23, end: 35, color: '#8b5cf6' },
    { name: 'Growth', start: 36, end: 50, color: '#3b82f6' },
    { name: 'Prime', start: 51, end: 65, color: '#06b6d4' },
    { name: 'Freedom', start: 66, end: 85, color: '#10b981' },
  ]

  const getPhase = (year: number) => phases.find(p => year >= p.start && year <= p.end)

  // Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/profile')
        if (response.ok) {
          const data = await response.json()
          setProfile(data.profile)
          if (data.profile) {
            setFormData({
              birthDate: data.profile.birth_date.split('T')[0],
              country: data.profile.country || '',
              lifeExpectancy: data.profile.life_expectancy
            })
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])
  
  // Fetch ALL goals once
  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const response = await fetch('/api/goals')
        if (response.ok) {
          const data = await response.json()
          setGoals(data.goals || [])
        }
      } catch (error) {
        console.error('Error fetching goals:', error)
      }
    }
    fetchGoals()
  }, [])

  // Save profile
  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthDate: formData.birthDate,
          country: formData.country,
          lifeExpectancy: Number(formData.lifeExpectancy)
        })
      })
      if (response.ok) {
        const refresh = await fetch('/api/profile')
        const data = await refresh.json()
        setProfile(data.profile)
        setShowSettings(false)
      }
    } catch (error) {
      console.error('Error saving profile:', error)
    }
  }
  
  // Add new goal
  const addGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newGoal,
          targetValue: Number(newGoal.targetValue) || 0,
          horizon: activeHorizon
        })
      })
      if (response.ok) {
        const data = await response.json()
        setGoals(prev => [data.goal, ...prev])
        setNewGoal({ title: '', area: '', objective: '', keyMetric: '', targetValue: '', unit: '' })
        setShowAddGoal(false)
      }
    } catch (error) {
      console.error('Error adding goal:', error)
    }
  }
  
  // Update goal progress
  const updateProgress = async (goalId: string, delta: number) => {
    const goal = goals.find(g => g.id === goalId)
    if (!goal) return
    
    const newValue = Math.max(0, Math.min(goal.targetValue, goal.currentValue + delta))
    
    try {
      const response = await fetch('/api/goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: goalId, currentValue: newValue })
      })
      if (response.ok) {
        const data = await response.json()
        setGoals(prev => prev.map(g => g.id === goalId ? data.goal : g))
      }
    } catch (error) {
      console.error('Error updating goal:', error)
    }
  }
  
  // Toggle bucket list item completion
  const toggleBucketItem = async (goalId: string, completed: boolean) => {
    try {
      const response = await fetch('/api/goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: goalId, completed })
      })
      if (response.ok) {
        const data = await response.json()
        setGoals(prev => prev.map(g => g.id === goalId ? data.goal : g))
      }
    } catch (error) {
      console.error('Error toggling bucket item:', error)
    }
  }
  
  // Delete goal
  const deleteGoal = async (goalId: string) => {
    try {
      await fetch(`/api/goals?id=${goalId}`, { method: 'DELETE' })
      setGoals(prev => prev.filter(g => g.id !== goalId))
    } catch (error) {
      console.error('Error deleting goal:', error)
    }
  }

  // Filtered goals for active horizon
  const filteredGoals = goals.filter(g => g.horizon === activeHorizon)

  // Accomplishment stats per horizon
  const getHorizonStats = (horizon: string) => {
    const hGoals = goals.filter(g => g.horizon === horizon)
    const completed = hGoals.filter(g => 
      g.completedAt || (g.horizon !== 'bucket' && g.targetValue > 0 && g.currentValue >= g.targetValue)
    ).length
    return { total: hGoals.length, completed }
  }

  const timelineStats = getHorizonStats(timelineHorizon)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  // Show profile setup form if no profile
  if (!profile) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6">
        <div className="bg-white border border-stone-100 rounded-2xl p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-stone-900 mb-2">Welcome to Goals</h2>
          <p className="text-sm text-stone-500 mb-6">Set up your profile to see your life timeline</p>
          
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Birth Date</label>
              <input
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Country (optional)</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({...formData, country: e.target.value})}
                placeholder="Spain"
                className="w-full px-3 py-2 border border-stone-200 rounded-lg"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-stone-900 text-white rounded-lg font-medium"
            >
              Get Started
            </button>
          </form>
        </div>
      </div>
    )
  }

  const { currentAge, weeksRemaining, percentLived, yearsRemaining } = profile

  return (
    <div className="max-w-2xl lg:max-w-3xl mx-auto">
      {/* Tab Switcher */}
      <div className="flex p-1 bg-stone-100 rounded-lg mb-5">
        <button
          onClick={() => setGoalsTab('life')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all min-h-[44px] ${
            goalsTab === 'life' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          Life Timeline
        </button>
        <button
          onClick={() => setGoalsTab('goals')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all min-h-[44px] ${
            goalsTab === 'goals' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          Goals
        </button>
      </div>

      {goalsTab === 'life' && (
        <>
          {/* Life Timeline Widget */}
      <div className="relative bg-gradient-to-br from-[#1a1d2e] to-[#252840] rounded-2xl p-4 sm:p-5 mb-6 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative">
          {/* Header with title, toggle, settings */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Life Timeline</h2>
              <p className="text-xs text-stone-400">Week {Math.floor(profile.ageInWeeks % 52) + 1} of {new Date().getFullYear()}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-stone-700/50 rounded-lg p-0.5">
                <button
                  onClick={() => { setZoomLevel('macro'); setExpandedYear(null) }}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    zoomLevel === 'macro'
                      ? 'bg-stone-600 text-white'
                      : 'text-stone-400 hover:text-stone-300'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setZoomLevel('micro')}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    zoomLevel === 'micro'
                      ? 'bg-stone-600 text-white'
                      : 'text-stone-400 hover:text-stone-300'
                  }`}
                >
                  All Weeks
                </button>
              </div>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 bg-stone-700/50 rounded-lg text-stone-400 hover:text-white transition-colors"
              >
                <Settings size={16} />
              </button>
            </div>
          </div>

          {/* Big weeks remaining display */}
          <div className="text-center mb-4">
            <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">{weeksRemaining.toLocaleString()}</p>
            <p className="text-xs text-stone-400 uppercase tracking-wider mt-1">weeks remaining</p>
          </div>

          {/* Phase legend */}
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mb-4">
            {phases.map(phase => (
              <div key={phase.name} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: phase.color }} />
                <span className="text-[10px] sm:text-xs text-stone-400">{phase.name}</span>
              </div>
            ))}
          </div>

          {/* Weeks visualization */}
          {zoomLevel === 'macro' ? (
            <div className="mb-4">
              <p className="text-xs text-stone-500 text-center mb-2">Click any year to see its weeks</p>
              <div className="max-h-[calc(100vh-360px)] overflow-y-auto space-y-px pr-1 scrollbar-thin">
                {Array.from({ length: formData.lifeExpectancy + 1 }, (_, year) => {
                  const phase = getPhase(year)
                  const isLived = year < currentAge
                  const isCurrent = year === currentAge
                  const currentWeekOfYear = Math.floor(profile.ageInWeeks % 52) + 1
                  const isExpanded = expandedYear === year

                  return (
                    <div key={year}>
                      <button
                        onClick={() => setExpandedYear(isExpanded ? null : year)}
                        className="w-full flex items-center gap-2 py-0.5 group"
                      >
                        <span className={`text-[10px] sm:text-xs w-6 text-right tabular-nums ${isCurrent ? 'text-white font-bold' : 'text-stone-500'}`}>
                          {year}
                        </span>
                        <div className="flex-1 h-2.5 bg-stone-700/30 rounded-full overflow-hidden relative">
                          {isCurrent ? (
                            <>
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${(currentWeekOfYear / 52) * 100}%`,
                                  backgroundColor: phase?.color || '#6b7280',
                                  opacity: 0.7,
                                }}
                              />
                              <div
                                className="absolute top-0 w-0.5 h-full bg-white rounded-full"
                                style={{ left: `${(currentWeekOfYear / 52) * 100}%` }}
                              />
                            </>
                          ) : isLived ? (
                            <div
                              className="h-full w-full rounded-full"
                              style={{
                                backgroundColor: phase?.color || '#6b7280',
                                opacity: 0.3,
                              }}
                            />
                          ) : (
                            <div
                              className="h-full w-full rounded-full opacity-0 group-hover:opacity-20 transition-opacity"
                              style={{ backgroundColor: phase?.color || '#6b7280' }}
                            />
                          )}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="ml-7 my-1 p-2 bg-stone-800/50 rounded-lg">
                          <p className="text-xs text-stone-400 mb-1.5">
                            Age {year} &middot; {phase?.name || 'Life'} &middot; 52 weeks
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gap: '3px' }}>
                            {Array.from({ length: 52 }, (_, w) => {
                              const weekNum = w + 1
                              const isWeekLived = isLived || (isCurrent && weekNum <= currentWeekOfYear)
                              const isCurrentWeek = isCurrent && weekNum === currentWeekOfYear

                              return (
                                <div
                                  key={w}
                                  className="aspect-square rounded-[2px]"
                                  style={{
                                    backgroundColor: isCurrentWeek
                                      ? '#ffffff'
                                      : isWeekLived
                                      ? phase?.color || '#6b7280'
                                      : 'rgba(120, 113, 108, 0.15)',
                                    opacity: isCurrentWeek ? 1 : isWeekLived ? (isLived ? 0.4 : 0.7) : 1,
                                  }}
                                  title={`Week ${weekNum}${isCurrentWeek ? ' (now)' : ''}`}
                                />
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="mb-4 max-h-[calc(100vh-360px)] overflow-y-auto pr-1 scrollbar-thin">
              {phases.map(phase => {
                const totalWeeks = (phase.end - phase.start + 1) * 52
                return (
                  <div key={phase.name} className="mb-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: phase.color }} />
                      <span className="text-xs text-stone-300 font-medium">{phase.name}</span>
                      <span className="text-[10px] sm:text-xs text-stone-500">({phase.start}-{phase.end})</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(26, 1fr)', gap: '1px' }}>
                      {Array.from({ length: totalWeeks }, (_, i) => {
                        const yearOffset = Math.floor(i / 52)
                        const weekInYear = (i % 52) + 1
                        const age = phase.start + yearOffset
                        const totalWeekIndex = age * 52 + weekInYear
                        const currentTotalWeek = currentAge * 52 + Math.floor(profile.ageInWeeks % 52) + 1
                        const isLived = totalWeekIndex < currentTotalWeek
                        const isCurrent = totalWeekIndex === currentTotalWeek

                        return (
                          <div
                            key={i}
                            className="aspect-square rounded-[1px]"
                            style={{
                              backgroundColor: isCurrent
                                ? '#ffffff'
                                : isLived
                                ? phase.color
                                : 'rgba(120, 113, 108, 0.12)',
                              opacity: isCurrent ? 1 : isLived ? 0.4 : 1,
                            }}
                            title={`Age ${age}, Week ${weekInYear}${isCurrent ? ' (now)' : ''}`}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Accomplishment Stats */}
          <div className="border-t border-stone-700/50 pt-4">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {horizons.map(h => (
                <button
                  key={h.key}
                  onClick={() => setTimelineHorizon(h.key)}
                  className={`px-3 py-2 rounded-full text-xs font-medium transition-all min-h-[36px] ${
                    timelineHorizon === h.key
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      : 'text-stone-400 hover:text-stone-300 border border-transparent'
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>

            <div>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-2xl font-bold text-white">{timelineStats.completed}</span>
                <span className="text-sm text-stone-400">of {timelineStats.total} goals accomplished</span>
              </div>
              {timelineStats.total > 0 ? (
                <div className="h-1.5 bg-stone-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${(timelineStats.completed / timelineStats.total) * 100}%` }}
                  />
                </div>
              ) : (
                <p className="text-xs text-stone-500">No goals set for this horizon yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Motivational insight card */}
      {(() => {
        const currentPhase = getPhase(currentAge)
        const insightTexts: Record<string, string> = {
          'Childhood': `You're in the magical years of childhood. Every week is full of wonder and new discoveries. ${weeksRemaining.toLocaleString()} weeks stretch ahead of you like an endless adventure.`,
          'School': `Your school years are shaping who you'll become. With ${weeksRemaining.toLocaleString()} weeks ahead, every lesson and friendship matters. Make each week count.`,
          'University': `These university years are a launchpad. You have ${weeksRemaining.toLocaleString()} weeks remaining to build the foundation for everything that follows.`,
          'Early Career': `You're building momentum in your early career. With ${weeksRemaining.toLocaleString()} weeks left, you have incredible runway to grow, pivot, and create impact.`,
          'Growth': `You're in your growth era -- experience meets ambition. ${weeksRemaining.toLocaleString()} weeks remain to deepen mastery and pursue what truly matters to you.`,
          'Prime': `These are your prime years. With ${weeksRemaining.toLocaleString()} weeks ahead, you bring wisdom and energy together. This is your time to lead and inspire.`,
          'Freedom': `You've entered the freedom years. ${weeksRemaining.toLocaleString()} weeks to savor the life you've built, explore new passions, and share your wisdom.`,
        }
        const text = currentPhase ? insightTexts[currentPhase.name] : `You have ${weeksRemaining.toLocaleString()} weeks remaining. Make each one intentional.`
        return (
          <div className="bg-white rounded-xl p-3 mb-6 flex gap-2.5 border border-stone-100">
            <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xs">&#9203;</span>
            </div>
            <p className="text-xs text-stone-500 leading-relaxed">{text}</p>
          </div>
        )
      })()}

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white border border-stone-100 rounded-xl p-4 mb-6">
          <h3 className="font-medium text-stone-900 mb-4">Profile Settings</h3>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-stone-600 mb-1">Birth Date</label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-600 mb-1">Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({...formData, country: e.target.value})}
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm min-h-[44px]"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2.5 bg-stone-900 text-white rounded-lg text-sm min-h-[44px]">
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="px-4 py-2.5 text-stone-600 text-sm min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
        </>
      )}

      {goalsTab === 'goals' && (
        <>
          {/* Goals Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-stone-900">Goals</h2>
        <button
          onClick={() => setShowAddGoal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium rounded-full shadow-sm hover:shadow-md transition-all min-h-[44px]"
        >
          + Add Goal
        </button>
      </div>

      {/* Horizon Tabs */}
      <div className="flex p-1 bg-stone-100 rounded-lg mb-5 overflow-x-auto">
        {horizons.map(h => (
          <button
            key={h.key}
            onClick={() => setActiveHorizon(h.key)}
            className={`flex-1 min-w-[4rem] py-2 text-[11px] sm:text-xs font-medium rounded-md transition-all whitespace-nowrap ${
              activeHorizon === h.key
                ? 'bg-white shadow-sm text-stone-900'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {h.label}
          </button>
        ))}
      </div>

      {/* Add Goal Form */}
      {showAddGoal && (
        <div className="bg-white border border-stone-200 rounded-xl p-4 mb-5">
          <h3 className="font-semibold text-stone-900 mb-4">
            New {activeHorizon === 'bucket' ? 'Bucket List Item' : 'Goal'}
          </h3>
          <form onSubmit={addGoal} className="space-y-3">
            <input
              type="text"
              placeholder="Title"
              value={newGoal.title}
              onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
              required
            />
            <input
              type="text"
              placeholder="Area (e.g., Health, Career, Travel)"
              value={newGoal.area}
              onChange={(e) => setNewGoal({...newGoal, area: e.target.value})}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
              required
            />
            {activeHorizon !== 'bucket' && (
              <>
                <input
                  type="text"
                  placeholder="Key Metric (e.g., Run 1000km, Save $10k)"
                  value={newGoal.keyMetric}
                  onChange={(e) => setNewGoal({...newGoal, keyMetric: e.target.value})}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Target Value"
                    value={newGoal.targetValue}
                    onChange={(e) => setNewGoal({...newGoal, targetValue: e.target.value})}
                    className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Unit (km, $, lbs)"
                    value={newGoal.unit}
                    onChange={(e) => setNewGoal({...newGoal, unit: e.target.value})}
                    className="w-24 px-3 py-2 border border-stone-200 rounded-lg text-sm"
                  />
                </div>
              </>
            )}
            <textarea
              placeholder="Objective description"
              value={newGoal.objective}
              onChange={(e) => setNewGoal({...newGoal, objective: e.target.value})}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm resize-none"
              rows={2}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowAddGoal(false)}
                className="flex-1 px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Goal Cards */}
      <div className="space-y-3">
        {filteredGoals.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-stone-200 rounded-xl">
            <Target size={32} className="mx-auto mb-2 text-stone-300" />
            <p className="text-sm text-stone-400">No goals yet for this horizon</p>
            <button
              onClick={() => setShowAddGoal(true)}
              className="mt-3 text-sm text-orange-500 hover:text-orange-600 font-medium"
            >
              + Create your first goal
            </button>
          </div>
        ) : (
          filteredGoals.map((goal) => {
            const isBucket = goal.horizon === 'bucket'
            const isCompleted = goal.completedAt || (!isBucket && goal.targetValue > 0 && goal.currentValue >= goal.targetValue)
            const progress = isBucket
              ? (goal.completedAt ? 100 : 0)
              : goal.targetValue > 0 ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100)) : 0

            return (
              <div
                key={goal.id}
                className={`bg-white border rounded-xl p-4 transition-all ${
                  isCompleted ? 'border-emerald-200 bg-emerald-50/30' : 'border-stone-100 hover:border-stone-200'
                }`}
              >
                {/* Header: area tag + delete */}
                <div className="flex items-start justify-between mb-2">
                  <span className="inline-block px-2.5 py-0.5 bg-stone-100 rounded-full text-[11px] font-medium text-stone-600">
                    {goal.area}
                  </span>
                  <button
                    onClick={() => deleteGoal(goal.id)}
                    className="p-1.5 text-stone-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Title + checkbox for bucket */}
                <div className="flex items-center gap-2.5 mb-1">
                  {isBucket && (
                    <button
                      onClick={() => toggleBucketItem(goal.id, !goal.completedAt)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                        goal.completedAt
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-stone-300 hover:border-emerald-400'
                      }`}
                    >
                      {goal.completedAt && <CheckSquare size={12} />}
                    </button>
                  )}
                  <h4 className={`font-semibold text-stone-900 ${isCompleted ? 'line-through opacity-60' : ''}`}>
                    {goal.title}
                  </h4>
                </div>

                {/* Objective */}
                {goal.objective && (
                  <p className="text-sm text-stone-500 mb-3 leading-relaxed">{goal.objective}</p>
                )}

                {/* Metric + Goal display for non-bucket */}
                {!isBucket && (goal.keyMetric || goal.targetValue > 0) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 p-3 bg-stone-50 rounded-lg">
                    <div>
                      <p className="text-xs text-stone-400 uppercase tracking-wider font-semibold mb-0.5">Metric</p>
                      <p className="text-sm font-medium text-stone-800">{goal.keyMetric || '\u2014'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-400 uppercase tracking-wider font-semibold mb-0.5">Goal</p>
                      <p className="text-sm font-medium text-stone-800">
                        {goal.targetValue > 0 ? `${goal.targetValue.toLocaleString()} ${goal.unit}` : '\u2014'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Progress bar for non-bucket */}
                {!isBucket && goal.targetValue > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className={`font-medium ${isCompleted ? 'text-emerald-600' : 'text-stone-500'}`}>
                        {progress}% complete
                      </span>
                      <span className="font-semibold text-stone-700">
                        {goal.currentValue.toLocaleString()} / {goal.targetValue.toLocaleString()} {goal.unit}
                      </span>
                    </div>
                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          progress >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-orange-500 to-amber-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    {/* +/- Controls */}
                    <div className="flex items-center justify-center gap-3 mt-2.5">
                      <button
                        onClick={() => updateProgress(goal.id, -1)}
                        className="w-10 h-10 flex items-center justify-center bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-600 transition-colors text-sm font-medium"
                      >
                        \u2212
                      </button>
                      <span className="text-[11px] text-stone-400">Adjust progress</span>
                      <button
                        onClick={() => updateProgress(goal.id, 1)}
                        className="w-10 h-10 flex items-center justify-center bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-600 transition-colors text-sm font-medium"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {/* Bucket list completion indicator */}
                {isBucket && goal.completedAt && (
                  <p className="text-xs text-emerald-600 mt-2 font-medium">
                    Accomplished on {new Date(goal.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
            )
          })
        )}
      </div>
        </>
      )}
    </div>
  )
}

// Fitness View Component
function FitnessView() {
  const [fitnessData, setFitnessData] = useState<FitnessWeek | null>(null)
  const [weeksData, setWeeksData] = useState<FitnessWeek[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'today' | 'week'>('week')
  const [todaySteps, setTodaySteps] = useState(0)
  const { insights: fitnessInsights } = useInsights('fitness')

  // Generate week key for a date
  const getWeekKey = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    return `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`
  }

  // Format relative date label
  const formatRelativeDate = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    if (dateStr === today) return 'Today'
    if (dateStr === yesterday) return 'Yesterday'
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Format duration as mm:ss
  const formatDuration = (mins: number) => {
    const wholeMins = Math.floor(mins)
    const secs = Math.round((mins - wholeMins) * 60)
    return `${wholeMins}:${String(secs).padStart(2, '0')}`
  }


  // Fetch fitness data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const weekKey = getWeekKey(new Date())
        const response = await fetch(`/api/fitness?week=${weekKey}`)
        const data = await response.json()
        setFitnessData(data)
        setWeeksData([data])

        // Calculate today's steps
        const today = new Date().toISOString().split('T')[0]
        const todayEntry = data?.entries.find((e: FitnessEntry) =>
          e.type === 'steps' && e.date === today
        )
        setTodaySteps(todayEntry?.steps || 0)
      } catch (error) {
        console.error('Error fetching fitness data:', error)
      }
      setLoading(false)
    }
    fetchData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading || !fitnessData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  // Get activities (runs, swims, cycles) sorted by date/time descending
  const today = new Date().toISOString().split('T')[0]
  const getActivities = () => {
    const activityTypes = ['run', 'swim', 'cycle', 'jiujitsu']
    let activities = fitnessData.entries.filter(e => activityTypes.includes(e.type))
    if (viewMode === 'today') {
      activities = activities.filter(e => e.date === today)
    }
    return activities.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date)
      if (dateCompare !== 0) return dateCompare
      return (b.timestamp || '').localeCompare(a.timestamp || '')
    })
  }

  // Activity icon config
  const getActivityStyle = (type: string) => {
    switch (type) {
      case 'run': return { bg: 'bg-emerald-50', text: 'text-emerald-600', emoji: '\u{1F3C3}', label: 'Run' }
      case 'swim': return { bg: 'bg-blue-50', text: 'text-blue-600', emoji: '\u{1F3CA}', label: 'Pool session' }
      case 'cycle': return { bg: 'bg-orange-50', text: 'text-orange-600', emoji: '\u{1F6B4}', label: 'Ride' }
      case 'jiujitsu': return { bg: 'bg-red-50', text: 'text-red-600', emoji: '\u{1F94B}', label: 'Jiu-Jitsu' }
      default: return { bg: 'bg-stone-50', text: 'text-stone-600', emoji: '\u{1F3CB}', label: 'Activity' }
    }
  }

  // Totals
  const totalKm = fitnessData.totals.totalDistance
  const runKm = fitnessData.totals.runDistance || 0
  const swimKm = fitnessData.totals.swimDistance || 0
  const cycleKm = fitnessData.totals.cycleDistance || 0
  const jiujitsuSessions = fitnessData.totals.jiujitsu || fitnessData.entries.filter(e => e.type === 'jiujitsu').length

  // Latest body metrics from advanced
  const latestHrv = fitnessData.advanced?.latestHrv || 0
  const latestVo2 = fitnessData.advanced?.avgVo2max || 0
  const latestWeight = fitnessData.advanced?.latestWeight || 0
  const latestFat = fitnessData.advanced?.latestBodyFat || 0

  // Generate AI insight
  const generateInsight = () => {
    const parts: string[] = []
    if (latestHrv > 0 && weeksData.length > 1) {
      parts.push(`Your HRV is at ${latestHrv} ms.`)
    }
    if (fitnessData.totals.runs > 0) {
      const remainingRuns = (fitnessData.goals.runs || 3) - fitnessData.totals.runs
      if (remainingRuns > 0) parts.push(`${remainingRuns} more run${remainingRuns > 1 ? 's' : ''} to hit your weekly goal.`)
      else parts.push('You hit your running goal this week!')
    }
    if (totalKm > 0) {
      parts.push(`${totalKm.toFixed(1)} km total this week across all activities.`)
    }
    if (parts.length === 0) return 'Log some activities to get personalized insights here.'
    return parts.join(' ')
  }

  const activities = getActivities()

  return (
    <div className="max-w-2xl lg:max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Fitness</h1>
          <p className="text-sm text-stone-400">Track your activity</p>
        </div>
        <button className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium rounded-full shadow-sm hover:shadow-md transition-all">
          + Log activity
        </button>
      </div>

      {/* Today / This week toggle */}
      <div className="flex p-1 bg-stone-100 rounded-lg mb-5">
        <button
          onClick={() => setViewMode('today')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all min-h-[44px] ${
            viewMode === 'today' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setViewMode('week')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all min-h-[44px] ${
            viewMode === 'week' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500'
          }`}
        >
          This week
        </button>
      </div>

      {/* Dark Hero Card */}
      <div className="relative bg-gradient-to-br from-[#1a1d2e] to-[#252840] rounded-2xl p-4 sm:p-5 mb-6 overflow-hidden">
        {/* Metrics pills row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          <div className="text-center">
            <p className="text-[10px] sm:text-xs font-semibold text-orange-400 uppercase tracking-wider mb-0.5">HRV</p>
            <p className="text-sm font-bold text-white">{latestHrv || '--'} <span className="text-[10px] text-stone-500 font-normal">ms</span></p>
          </div>
          <div className="text-center">
            <p className="text-[10px] sm:text-xs font-semibold text-blue-400 uppercase tracking-wider mb-0.5">VO&#8322;</p>
            <p className="text-sm font-bold text-white">{latestVo2 || '--'}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] sm:text-xs font-semibold text-stone-400 uppercase tracking-wider mb-0.5">Weight</p>
            <p className="text-sm font-bold text-white">{latestWeight || '--'} <span className="text-[10px] text-stone-500 font-normal">kg</span></p>
          </div>
          <div className="text-center">
            <p className="text-[10px] sm:text-xs font-semibold text-stone-400 uppercase tracking-wider mb-0.5">Fat</p>
            <p className="text-sm font-bold text-white">{latestFat || '--'}<span className="text-[10px] text-stone-500 font-normal">%</span></p>
          </div>
        </div>

        {/* Big kilometer number */}
        <div className="text-center mb-5">
          <p className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight">{Math.round(totalKm)}</p>
          <p className="text-xs sm:text-sm text-stone-400 mt-1">Kilometers</p>
        </div>

        {/* Activity type breakdown */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{'\u{1F6B4}'}</span>
            <span className="text-sm text-stone-300">{cycleKm.toFixed(1)} km</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{'\u{1F3C3}'}</span>
            <span className="text-sm text-stone-300">{runKm.toFixed(1)} km</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{'\u{1F3CA}'}</span>
            <span className="text-sm text-stone-300">{swimKm.toFixed(1)} km</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{'\u{1F94B}'}</span>
            <span className="text-sm text-stone-300">{jiujitsuSessions} {jiujitsuSessions === 1 ? 'session' : 'sessions'}</span>
          </div>
        </div>
      </div>

      {/* Jiu-Jitsu Weekly Card */}
      <div className="flex items-center gap-3 p-4 bg-white border border-stone-100 rounded-xl mb-5">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
          jiujitsuSessions > 0 ? 'bg-emerald-100' : 'bg-stone-100'
        }`}>
          {jiujitsuSessions > 0 ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 10.5L8 14.5L16 6.5" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <span className="text-stone-400 text-sm">{'\u{1F94B}'}</span>
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-stone-900">Jiu-Jitsu</p>
          <p className="text-xs text-stone-400">
            {jiujitsuSessions > 0
              ? `${jiujitsuSessions} session${jiujitsuSessions > 1 ? 's' : ''} this week`
              : 'No sessions this week'}
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          jiujitsuSessions > 0
            ? 'bg-emerald-50 text-emerald-600'
            : 'bg-stone-50 text-stone-400'
        }`}>
          {jiujitsuSessions > 0 ? 'Done' : 'Pending'}
        </div>
      </div>

      {/* Activities List */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-stone-900">Activities</h3>
          <span className="text-xs text-stone-400">{activities.length} this {viewMode === 'today' ? 'day' : 'week'}</span>
        </div>

        <div className="space-y-2">
          {activities.map((entry) => {
            const style = getActivityStyle(entry.type)
            return (
              <div key={entry.id} className="flex items-center gap-3 p-3 bg-white border border-stone-100 rounded-xl hover:border-stone-200 transition-all">
                <div className={`w-10 h-10 ${style.bg} rounded-full flex items-center justify-center text-lg`}>
                  {style.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900">{entry.name || style.label}</p>
                  <p className="text-xs text-stone-400">
                    {formatRelativeDate(entry.date)}
                    {entry.duration ? ` · ${formatDuration(entry.duration)}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  {entry.distanceKm ? (
                    <p className="text-sm font-semibold text-stone-900">{entry.distanceKm.toFixed(1)} km</p>
                  ) : entry.calories ? (
                    <p className="text-sm font-semibold text-stone-900">{entry.calories} cal</p>
                  ) : null}
                </div>
              </div>
            )
          })}

          {activities.length === 0 && (
            <p className="text-stone-400 text-center py-8 text-sm border border-dashed border-stone-200 rounded-xl">
              No activities logged {viewMode === 'today' ? 'today' : 'this week'}
            </p>
          )}
        </div>

        <button className="w-full mt-3 p-3 text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors">
          + Add activity
        </button>
      </div>

      {/* AI Insight Card */}
      <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkles size={16} className="text-violet-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-stone-900 mb-1">AI Insight</p>
            <p className="text-xs text-stone-600 leading-relaxed">{generateInsight()}</p>
          </div>
        </div>
      </div>
      {fitnessInsights.map((fi) => (
        <AgentInsight key={fi.agentId} agent={fi.agent} emoji={fi.emoji} insight={fi.insight} updatedAt={fi.updatedAt} type={fi.type} />
      ))}
    </div>
  )
}


// Budget View Component
function BudgetView() {
  const [loading, setLoading] = useState(true)
  const [weeklyData, setWeeklyData] = useState<BudgetWeekDisplay[]>([])
  const { insights: budgetInsights } = useInsights('budget')

  const WEEKLY_BUDGET = 70
  const totalBudget = 350 // 5 weeks × €70
  
  // Helper to get ISO week number
  const getISOWeek = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  }

  // Generate week keys for current month (Week 1-5)
  const getWeekKeys = () => {
    const now = new Date()
    const year = now.getFullYear()
    const currentWeek = getISOWeek(now)

    const weeks: string[] = []
    for (let weekNum = 1; weekNum <= 5; weekNum++) {
      const targetWeek = Math.max(1, currentWeek - 2 + weekNum)
      weeks.push(`${year}-W${String(targetWeek).padStart(2, '0')}`)
    }
    return weeks
  }
  
  // Fetch budget data for all weeks
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const weekKeys = getWeekKeys()
        const weeksData = await Promise.all(
          weekKeys.map(async (weekKey, index) => {
            try {
              const response = await fetch(`/api/budget?week=${weekKey}`)
              if (!response.ok) throw new Error('Failed to fetch')
              const data = await response.json()
              return {
                weekNum: index + 1,
                weekLabel: `Week ${index + 1} Budget`,
                weekKey: weekKey,
                budget: WEEKLY_BUDGET,
                spent: data.totalSpent || 0,
                remaining: data.remaining || WEEKLY_BUDGET,
                expenditures: (data.entries || []).map((entry: { id: string; description: string; category: string; amount: number; date: string; reason?: string }) => ({
                  id: entry.id,
                  description: entry.description,
                  category: entry.category === 'Food' ? 'Food - Eating Out' : 'Miscellaneous',
                  amount: entry.amount,
                  date: entry.date,
                  reason: entry.reason
                }))
              }
            } catch (error) {
              // Return empty week on error
              return {
                weekNum: index + 1,
                weekLabel: `Week ${index + 1} Budget`,
                weekKey: weekKey,
                budget: WEEKLY_BUDGET,
                spent: 0,
                remaining: WEEKLY_BUDGET,
                expenditures: []
              }
            }
          })
        )
        setWeeklyData(weeksData)
      } catch (error) {
        console.error('Error fetching budget data:', error)
      }
      setLoading(false)
    }
    
    fetchData()
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [])
  
  const totalSpent = weeklyData.reduce((a, w) => a + (w.spent || 0), 0)
  const totalRemaining = totalBudget - totalSpent
  const progress = Math.round((totalSpent / totalBudget) * 100)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl lg:max-w-3xl mx-auto">
      {/* Hero Stats Card with Weekly Budget Widget */}
      <div className="relative bg-gradient-to-br from-stone-900 to-stone-800 rounded-2xl p-4 sm:p-5 mb-5 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-4 sm:gap-5 mb-5">
            {/* Ring */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-stone-700" />
                <circle 
                  cx="50" cy="50" r="42" fill="none" stroke="url(#budgetRingGrad)" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${Math.min(progress, 100) * 2.64} 264`}
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="budgetRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-white">€{totalSpent}</span>
                <span className="text-xs text-stone-400 uppercase">spent</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-stone-400 mb-1">Remaining</p>
              <p className="text-2xl sm:text-3xl font-bold text-white">€{totalRemaining}</p>
              <p className="text-[10px] sm:text-xs text-stone-500">of €{totalBudget} monthly budget</p>
            </div>
          </div>
          
          {/* Weekly Budget Widget */}
          <div className="bg-stone-800/50 rounded-xl p-3 mb-4">
            <p className="text-xs text-stone-400 mb-2">Weekly Budgets</p>
            <div className="flex gap-1.5 sm:gap-2">
              {weeklyData.map((week) => (
                <div key={week.weekNum} className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] sm:text-xs text-stone-500">W{week.weekNum}</span>
                    <span className="text-[10px] sm:text-xs text-stone-400">€{week.remaining}</span>
                  </div>
                  <div className="h-6 sm:h-8 bg-stone-700 rounded-md overflow-hidden relative">
                    <div 
                      className={`absolute bottom-0 left-0 right-0 transition-all duration-500 ${
                        week.spent > week.budget * 0.8 ? 'bg-red-500' : week.spent > 0 ? 'bg-emerald-500' : 'bg-stone-600'
                      }`}
                      style={{ height: `${Math.min((week.spent / week.budget) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Expenditures by Week */}
      <div className="space-y-4">
        {weeklyData.map((week) => (
          <div key={week.weekNum} className="bg-white border border-stone-100 rounded-xl overflow-hidden">
            {/* Week Header */}
            <div className="flex items-center justify-between p-3 bg-stone-50 border-b border-stone-100 gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
                <span className="text-xs sm:text-sm font-semibold text-stone-900 whitespace-nowrap">{week.weekLabel}</span>
                <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap ${
                  week.spent > week.budget * 0.9 ? 'bg-red-100 text-red-600' :
                  week.spent > week.budget * 0.7 ? 'bg-amber-100 text-amber-600' :
                  'bg-emerald-100 text-emerald-600'
                }`}>
                  €{week.remaining} left
                </span>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-xs sm:text-sm font-bold text-stone-900">€{week.spent}</span>
                <span className="text-[10px] sm:text-xs text-stone-400"> / €{week.budget}</span>
              </div>
            </div>
            
            {/* Week Progress Bar */}
            <div className="px-3 py-2 border-b border-stone-100">
              <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    week.spent > week.budget ? 'bg-red-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min((week.spent / week.budget) * 100, 100)}%` }}
                />
              </div>
            </div>
            
            {/* Expenditures List */}
            <div className="divide-y divide-stone-50">
              {week.expenditures.length > 0 ? (
                week.expenditures.map((entry: BudgetExpenditure) => (
                  <div key={entry.id} className="flex items-center gap-3 p-3 hover:bg-stone-50 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                      entry.category.includes('Food') ? 'bg-emerald-50' : 'bg-blue-50'
                    }`}>
                      {entry.category.includes('Food') ? '🍽️' : '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-900 truncate">{entry.description}</p>
                      <p className="text-xs text-stone-400">
                        {entry.category}
                        {entry.reason && (
                          <span className="ml-1 text-stone-500 italic">— "{entry.reason}"</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-stone-900">€{entry.amount}</p>
                      <p className="text-xs text-stone-400">{entry.date}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-stone-400 text-center py-4 text-sm">No expenditures this week</p>
              )}
            </div>
          </div>
        ))}
      </div>
      {budgetInsights.map((bi) => (
        <AgentInsight key={bi.agentId} agent={bi.agent} emoji={bi.emoji} insight={bi.insight} updatedAt={bi.updatedAt} type={bi.type} />
      ))}
    </div>
  )
}

// Spanish Flashcards & Exercises View
function SpanishView() {
  const [cards, setCards] = useState<SpanishCard[]>([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [progress, setProgress] = useState<SpanishProgress | null>(null)
  const [exercises, setExercises] = useState<SpanishExercise[]>([])
  const [exerciseAnswers, setExerciseAnswers] = useState<Record<string, string>>({})
  const [exerciseFeedback, setExerciseFeedback] = useState<Record<string, { correct: boolean; feedback: string }>>({})
  const [activeTab, setActiveTab] = useState<'cards' | 'exercises'>('cards')
  const [loading, setLoading] = useState(true)

  // Fetch due cards, progress, and exercises on mount
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        const [cardsRes, progressRes, exercisesRes] = await Promise.all([
          fetch('/api/spanish?action=due'),
          fetch('/api/spanish?action=progress'),
          fetch('/api/spanish/exercises?type=daily'),
        ])
        if (cardsRes.ok) {
          const data = await cardsRes.json()
          setCards(data.cards || [])
        }
        if (progressRes.ok) {
          const data = await progressRes.json()
          setProgress(data)
        }
        if (exercisesRes.ok) {
          const data = await exercisesRes.json()
          setExercises(data.exercises || [])
        }
      } catch (err) {
        console.error('Failed to fetch spanish data', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const currentCard = cards[currentCardIndex] || null

  const handleRate = async (rating: string) => {
    if (!currentCard) return
    try {
      await fetch('/api/spanish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'review', cardId: currentCard.id, result: rating }),
      })
    } catch (err) {
      console.error('Failed to submit rating', err)
    }
    setFlipped(false)
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(prev => prev + 1)
    } else {
      setCards([])
      setCurrentCardIndex(0)
    }
    setProgress((prev) => prev ? { ...prev, reviewedToday: (prev.reviewedToday || 0) + 1 } : prev)
  }

  const handlePark = async () => {
    if (!currentCard) return
    try {
      await fetch('/api/spanish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'park', cardId: currentCard.id }),
      })
    } catch (err) {
      console.error('Failed to park card', err)
    }
    const remaining = cards.filter((_, i) => i !== currentCardIndex)
    setCards(remaining)
    setCurrentCardIndex(prev => Math.min(prev, remaining.length - 1))
    setFlipped(false)
    setProgress((prev) => {
      if (!prev) return prev
      const currentStats = prev.stats || { total: 0, new_count: 0, learning_count: 0, review_count: 0, parked_count: 0 }
      return { ...prev, stats: { ...currentStats, parked_count: currentStats.parked_count + 1 } }
    })
  }

  const handleExerciseSubmit = async (exerciseId: string, directAnswer?: string) => {
    const answer = directAnswer ?? exerciseAnswers[exerciseId]
    if (answer === undefined || answer === '') return
    try {
      const res = await fetch('/api/spanish/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseId, answer }),
      })
      if (res.ok) {
        const data = await res.json()
        setExerciseFeedback(prev => ({ ...prev, [exerciseId]: { correct: data.correct, feedback: data.feedback } }))
      }
    } catch (err) {
      console.error('Failed to check exercise', err)
    }
  }

  const exerciseTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      verb_conjugation: 'Verb Conjugation',
      cloze: 'Fill in the Blank',
      translation: 'Translation',
      grammar: 'Grammar Quiz',
      writing: 'Writing Prompt',
    }
    return labels[type] || type
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  const dueCount = progress?.stats ? (progress.stats.new_count + progress.stats.learning_count + progress.stats.review_count) : 0
  const reviewedToday = progress?.reviewedToday || 0
  const reviewedPct = progress ? Math.round((reviewedToday / Math.max(1, reviewedToday + dueCount)) * 100) : 0

  return (
    <div className="max-w-2xl lg:max-w-3xl mx-auto">
      {/* Hero Progress Card */}
      <div className="relative bg-gradient-to-br from-stone-900 to-stone-800 rounded-2xl p-4 sm:p-5 mb-5 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-4 sm:gap-5 mb-4">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-stone-700" />
                <circle
                  cx="50" cy="50" r="42" fill="none" stroke="url(#spanishRingGrad)" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${Math.min(reviewedPct, 100) * 2.64} 264`}
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="spanishRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-white">{reviewedToday}</span>
                <span className="text-xs text-stone-400 uppercase">reviewed</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-stone-400 mb-1">Cards Due</p>
              <p className="text-2xl sm:text-3xl font-bold text-white">{dueCount}</p>
              <p className="text-[10px] sm:text-xs text-stone-500">{progress?.stats?.learning_count || 0} learning &middot; {progress?.stats?.review_count || 0} review</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="bg-stone-800/50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-white">{progress?.stats?.total || 0}</p>
              <p className="text-xs text-stone-400 uppercase">Total</p>
            </div>
            <div className="bg-stone-800/50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-white">{progress?.stats?.parked_count || 0}</p>
              <p className="text-xs text-stone-400 uppercase">Parked</p>
            </div>
            <div className="bg-stone-800/50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-white">{Object.keys(exerciseFeedback).length}/{exercises.length}</p>
              <p className="text-xs text-stone-400 uppercase">Exercises</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setActiveTab('cards')}
          className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${activeTab === 'cards' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
        >
          Flashcards {cards.length > 0 && `(${cards.length - currentCardIndex})`}
        </button>
        <button
          onClick={() => setActiveTab('exercises')}
          className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${activeTab === 'exercises' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
        >
          Exercises {exercises.length > 0 && `(${Object.keys(exerciseFeedback).length}/${exercises.length})`}
        </button>
      </div>

      {/* Flashcard Review */}
      {activeTab === 'cards' && (
        <div>
          {currentCard ? (
            <div className="mb-4">
              <div
                onClick={() => setFlipped(!flipped)}
                className="relative bg-white rounded-2xl shadow-sm border border-stone-200 p-5 sm:p-8 min-h-[220px] flex flex-col items-center justify-center cursor-pointer select-none transition-all hover:shadow-md"
              >
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-400">{currentCard.word_type}</span>
                  {currentCard.tags?.[0] && <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-400">{currentCard.tags[0]}</span>}
                </div>
                {!flipped ? (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-stone-900 mb-2">{currentCard.spanish_word}</p>
                    <p className="text-xs text-stone-400">Tap to reveal</p>
                  </div>
                ) : (
                  <div className="text-center animate-in fade-in duration-200">
                    <p className="text-lg font-semibold text-stone-700 mb-1">{currentCard.english_translation}</p>
                    {currentCard.example_sentence_spanish && (
                      <div className="mt-4 text-left bg-stone-50 rounded-xl p-4">
                        <p className="text-sm text-stone-700 italic">&ldquo;{currentCard.example_sentence_spanish}&rdquo;</p>
                        <p className="text-xs text-stone-400 mt-1">&ldquo;{currentCard.example_sentence_english}&rdquo;</p>
                      </div>
                    )}
                  </div>
                )}
                <div className="absolute bottom-3 left-3 text-[10px] text-stone-300">
                  {currentCardIndex + 1} / {cards.length}
                </div>
              </div>

              {/* Rating Buttons */}
              {flipped && (
                <div className="grid grid-cols-2 sm:flex gap-2 mt-3">
                  {[
                    { label: 'Again', value: 'again', color: 'bg-red-500 hover:bg-red-600' },
                    { label: 'Hard', value: 'hard', color: 'bg-orange-500 hover:bg-orange-600' },
                    { label: 'Good', value: 'good', color: 'bg-emerald-500 hover:bg-emerald-600' },
                    { label: 'Easy', value: 'easy', color: 'bg-blue-500 hover:bg-blue-600' },
                  ].map(btn => (
                    <button
                      key={btn.value}
                      onClick={() => handleRate(btn.value)}
                      className={`sm:flex-1 py-3 rounded-xl text-white text-sm font-medium transition-colors min-h-[44px] ${btn.color}`}
                    >
                      {btn.label}
                    </button>
                  ))}
                  <button
                    onClick={handlePark}
                    className="col-span-2 sm:col-span-1 px-3 py-3 rounded-xl bg-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-300 transition-colors min-h-[44px]"
                  >
                    Park
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 text-center">
              <p className="text-lg font-semibold text-stone-700 mb-1">All caught up!</p>
              <p className="text-sm text-stone-400">No cards due for review right now.</p>
            </div>
          )}
        </div>
      )}

      {/* Exercises Section */}
      {activeTab === 'exercises' && (
        <div className="space-y-4">
          {exercises.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 text-center">
              <p className="text-lg font-semibold text-stone-700 mb-1">No exercises today</p>
              <p className="text-sm text-stone-400">Check back later for new exercises.</p>
            </div>
          ) : (
            exercises.map((ex: SpanishExercise) => {
              const fb = exerciseFeedback[ex.id]
              const c = ex.content || {}
              // Build display prompt based on exercise type
              let prompt = ''
              if (ex.type === 'verb_conjugation') {
                prompt = `Conjugate "${c.verb}" (${c.hint}) in ${c.tense} for ${c.pronoun}`
              } else if (ex.type === 'cloze') {
                prompt = c.text || ''
                if (c.hint) prompt += ` (${c.hint})`
              } else if (ex.type === 'translation') {
                prompt = `${c.direction === 'en-to-es' ? 'Translate to Spanish' : 'Translate to English'}: "${c.sourceText}"`
                if (c.hint) prompt += ` (${c.hint})`
              } else if (ex.type === 'grammar') {
                prompt = c.question || ''
              } else if (ex.type === 'writing') {
                prompt = c.prompt || ''
              }
              return (
                <div key={ex.id} className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium uppercase">
                      {exerciseTypeLabel(ex.type)}
                    </span>
                    {ex.difficulty && <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-400">{ex.difficulty}</span>}
                  </div>
                  <p className="text-sm font-medium text-stone-800 mb-3">{prompt}</p>
                  {ex.type === 'grammar' && c.options ? (
                    <div className="grid grid-cols-2 gap-2 mb-1">
                      {c.options.map((opt: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => {
                            if (!fb) {
                              setExerciseAnswers(prev => ({ ...prev, [ex.id]: String(i) }))
                              handleExerciseSubmit(ex.id, String(i))
                            }
                          }}
                          disabled={!!fb}
                          className={`py-3 px-3 rounded-xl text-sm font-medium border transition-colors min-h-[44px] ${
                            fb
                              ? i === ex.answer_key?.correct
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                : exerciseAnswers[ex.id] === String(i)
                                  ? 'bg-red-50 border-red-300 text-red-700'
                                  : 'bg-stone-50 border-stone-200 text-stone-400'
                              : exerciseAnswers[ex.id] === String(i)
                                ? 'bg-stone-900 border-stone-900 text-white'
                                : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : ex.type === 'writing' ? (
                    <textarea
                      value={exerciseAnswers[ex.id] || ''}
                      onChange={e => setExerciseAnswers(prev => ({ ...prev, [ex.id]: e.target.value }))}
                      placeholder="Write your answer..."
                      className="w-full border border-stone-200 rounded-xl p-3 text-sm text-stone-700 resize-none h-24 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400"
                      disabled={!!fb}
                    />
                  ) : (
                    <input
                      type="text"
                      value={exerciseAnswers[ex.id] || ''}
                      onChange={e => setExerciseAnswers(prev => ({ ...prev, [ex.id]: e.target.value }))}
                      placeholder="Type your answer..."
                      className="w-full border border-stone-200 rounded-xl px-3 py-3 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 min-h-[44px]"
                      disabled={!!fb}
                      onKeyDown={e => { if (e.key === 'Enter' && !fb) handleExerciseSubmit(ex.id) }}
                    />
                  )}
                  {fb ? (
                    <div className={`mt-3 p-3 rounded-xl text-sm ${fb.correct ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      <span className="font-medium">{fb.correct ? 'Correct!' : 'Incorrect.'}</span> {fb.feedback}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleExerciseSubmit(ex.id)}
                      disabled={!exerciseAnswers[ex.id]}
                      className="mt-3 px-4 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
                    >
                      Check
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// Books View - Weekly wisdom & domain rotation
function BooksView() {
  const [data, setData] = useState<{
    currentDomain: string
    domainIndex: number
    totalDomains: number
    weekPrinciple: {
      id: string
      domain: string
      title: string
      principle: string
      source: string
      actionPrompt: string
    }
    contextInsight: string
    rawCapture: {
      id: string
      domain: string
      text: string
      source: string
      type: string
    }
    allDomains: string[]
    source: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedAction, setExpandedAction] = useState(false)
  const [copied, setCopied] = useState(false)
  const { insights: knowledgeInsights } = useInsights('knowledge')

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/books?action=daily')
        const result = await response.json()
        setData(result)
      } catch (error) {
        console.error('Error fetching books data:', error)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const handleCopyPrompt = async () => {
    if (!data) return
    try {
      await navigator.clipboard.writeText(data.weekPrinciple.actionPrompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      console.error('Failed to copy')
    }
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-amber-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl lg:max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Books</h1>
          <p className="text-sm text-stone-400">Daily wisdom &amp; insights</p>
        </div>
      </div>

      {/* Dark Hero Card */}
      <div className="relative bg-gradient-to-br from-[#1a1d2e] to-[#252840] rounded-2xl p-4 sm:p-5 mb-6 overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
            <BookOpen size={20} className="text-amber-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-lg">{data.currentDomain}</p>
            <p className="text-stone-400 text-xs">Domain {data.domainIndex}/{data.totalDomains}</p>
          </div>
        </div>

        {/* Domain rotation progress */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: data.totalDomains }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                i < data.domainIndex - 1 ? 'bg-amber-500' : i === data.domainIndex - 1 ? 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.5)]' : 'bg-white/10'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-stone-500 mt-2 uppercase tracking-wider">10-week rotation</p>
      </div>

      {/* Cards Grid */}
      <div className="space-y-4">
        {/* Daily Principle Card */}
        <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Star size={16} className="text-amber-500" />
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Daily Principle</p>
          </div>
          <h3 className="text-lg font-bold text-stone-900 mb-2">{data.weekPrinciple.title}</h3>
          <p className="text-sm text-stone-600 leading-relaxed mb-3">{data.weekPrinciple.principle}</p>
          <p className="text-xs text-stone-400 mb-4">{data.weekPrinciple.source}</p>

          {/* Action Prompt */}
          <div className="bg-stone-50 rounded-xl p-3">
            <button
              onClick={() => setExpandedAction(!expandedAction)}
              className="flex items-center justify-between w-full text-left min-h-[44px]"
            >
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Action Prompt</span>
              <ChevronDown size={14} className={`text-stone-400 transition-transform ${expandedAction ? 'rotate-180' : ''}`} />
            </button>
            {expandedAction && (
              <div className="mt-2">
                <p className="text-sm text-stone-700 leading-relaxed">{data.weekPrinciple.actionPrompt}</p>
                <button
                  onClick={handleCopyPrompt}
                  className="mt-2 flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 transition-colors"
                >
                  {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy prompt'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Context Insight Card */}
        <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Brain size={16} className="text-violet-500" />
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Context Insight</p>
          </div>
          <p className="text-sm text-stone-700 leading-relaxed">{data.contextInsight}</p>
        </div>

        {/* Raw Capture Card */}
        <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={16} className="text-stone-500" />
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
              {data.rawCapture.type === 'quote' ? 'Quote' : 'Passage'}
            </p>
          </div>
          <blockquote className="text-sm text-stone-700 leading-relaxed italic border-l-2 border-amber-300 pl-3 mb-3">
            {data.rawCapture.text}
          </blockquote>
          <p className="text-xs text-stone-400">{data.rawCapture.source}</p>
        </div>
      </div>
      {knowledgeInsights.map((ki) => (
        <AgentInsight key={ki.agentId} agent={ki.agent} emoji={ki.emoji} insight={ki.insight} updatedAt={ki.updatedAt} type={ki.type} />
      ))}
    </div>
  )
}

// Main Dashboard
function Dashboard({
  activeView,
  nutritionData,
  onMenuClick,
}: {
  activeView: string
  nutritionData: NutritionData
  onMenuClick: () => void
}) {
  
  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <header className="h-14 bg-white/80 backdrop-blur-xl border-b border-stone-100 flex items-center justify-between px-4 sm:px-6 md:px-8 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button 
            onClick={onMenuClick}
            className="lg:hidden p-3 -ml-3 hover:bg-stone-100 rounded-lg"
          >
            <Menu size={20} className="text-stone-600" />
          </button>
          
          <div>
            <h1 className="text-base font-semibold text-stone-900">
              {activeView === 'nutrition-today' ? 'Today' : activeView === 'goals' ? 'Goals' : activeView === 'budget' ? 'Budget' : activeView === 'fitness' ? 'Fitness' : activeView === 'spanish' ? 'Spanish' : activeView === 'books' ? 'Books' : 'Velum'}
            </h1>
            <p className="text-xs text-stone-400 hidden sm:block">
              {activeView === 'nutrition-today' ? 'Track your daily nutrition' : activeView === 'goals' ? 'Life planning' : activeView === 'budget' ? 'Weekly spending tracker' : activeView === 'fitness' ? 'Track your activity' : activeView === 'spanish' ? 'Flashcards & exercises' : activeView === 'books' ? 'Daily wisdom & insights' : ''}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="h-11 px-3 sm:px-4 bg-stone-900 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-stone-800 transition-colors">
            <Plus size={14} strokeWidth={2.5} className="hidden sm:block" />
            <span className="hidden sm:inline">{activeView.startsWith('nutrition') ? 'Log food' : 'Add'}</span>
            <Plus size={16} strokeWidth={2.5} className="sm:hidden" />
          </button>
        </div>
      </header>
      
      {/* Content */}
      <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto">
        {activeView === 'nutrition-today' && (
          <NutritionTodayView
            nutritionData={nutritionData}
          />
        )}
        {activeView === 'goals' && (
          <GoalsView />
        )}
        {activeView === 'budget' && (
          <BudgetView />
        )}
        {activeView === 'fitness' && (
          <FitnessView />
        )}
        {activeView === 'spanish' && (
          <SpanishView />
        )}
        {activeView === 'books' && (
          <BooksView />
        )}
        {!['nutrition-today', 'goals', 'budget', 'fitness', 'spanish', 'books'].includes(activeView) && (
          <div className="flex items-center justify-center h-64 text-stone-400">
            <div className="text-center">
              <p className="text-lg font-medium text-stone-500">
                {activeView === 'nutrition-history' ? 'History' : 'Coming soon'}
              </p>
              <p className="text-sm mt-1">This feature is under development</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Route mappings
const pathToActiveItem: Record<string, string> = {
  '/': 'nutrition-today',
  '/nutrition': 'nutrition-today',
  '/nutrition/today': 'nutrition-today',
  '/nutrition/history': 'nutrition-history',
  '/goals': 'goals',
  '/fitness': 'fitness',
  '/spanish': 'spanish',
  '/books': 'books',
  '/budget': 'budget',
  '/tasks': 'tasks',
}

const activeItemToPath: Record<string, string> = {
  'nutrition-today': '/nutrition',
  'nutrition-history': '/nutrition/history',
  'goals': '/goals',
  'fitness': '/fitness',
  'spanish': '/spanish',
  'books': '/books',
  'budget': '/budget',
  'tasks': '/tasks',
}

function getExpandedFoldersForItem(itemId: string): Set<string> {
  const folders = new Set<string>()
  if (itemId.startsWith('nutrition')) folders.add('nutrition')
  if (['spanish', 'books'].includes(itemId)) folders.add('knowledge')
  return folders
}

// Main Page
export default function Home() {
  const pathname = usePathname()
  const router = useRouter()

  const activeItem = pathToActiveItem[pathname] || 'nutrition-today'

  const navigateTo = useCallback((itemId: string) => {
    const path = activeItemToPath[itemId] || '/'
    router.push(path)
  }, [router])

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => getExpandedFoldersForItem(activeItem))
  // Auto-expand folders when navigating to a child item
  useEffect(() => {
    const needed = getExpandedFoldersForItem(activeItem)
    setExpandedFolders(prev => {
      const next = new Set(prev)
      needed.forEach(f => next.add(f))
      return next
    })
  }, [activeItem])

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [nutritionData, setNutritionData] = useState<NutritionData>({
    date: new Date().toISOString().split('T')[0],
    entries: [],
    totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    goals: { calories: 2600, protein: 160, carbs: 310, fat: 80 }
  })
  
  // Fetch nutrition data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]
        const response = await fetch(`/api/nutrition?date=${today}`)
        if (response.ok) {
          const data = await response.json()
          setNutritionData(data)
        }
      } catch (error) {
        console.error('Error fetching nutrition data:', error)
      }
    }
    fetchData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])
  
  const navigation: NavItem[] = [
    {
      id: 'nutrition',
      name: 'Nutrition',
      icon: <Apple size={16} />,
      type: 'folder',
      children: [
        { id: 'nutrition-today', name: 'Today', type: 'page' },
        { id: 'nutrition-history', name: 'History', type: 'page' },
      ]
    },
    {
      id: 'goals',
      name: 'Goals',
      icon: <Target size={16} />,
      type: 'page',
    },
    {
      id: 'fitness',
      name: 'Fitness',
      icon: <Dumbbell size={16} />,
      type: 'page',
    },
    {
      id: 'knowledge',
      name: 'Knowledge',
      icon: <Brain size={16} />,
      type: 'folder',
      children: [
        { id: 'spanish', name: 'Spanish', type: 'page' },
        { id: 'books', name: 'Books', type: 'page' },
      ]
    },
    {
      id: 'tasks',
      name: 'Tasks',
      icon: <CheckSquare size={16} />,
      type: 'page',
    },
    {
      id: 'budget',
      name: 'Budget',
      icon: <Wallet size={16} />,
      type: 'page',
    },
  ]
  
  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }
  
  return (
    <div className="flex h-screen font-sans antialiased bg-stone-50 text-stone-900">
      <Sidebar 
        navigation={navigation}
        activeItem={activeItem}
        setActiveItem={navigateTo}
        expandedFolders={expandedFolders}
        toggleFolder={toggleFolder}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      <div className="flex flex-1 min-w-0 overflow-hidden">
        <Dashboard
          activeView={activeItem}
          nutritionData={nutritionData}
          onMenuClick={() => setSidebarOpen(true)}
        />
      </div>
    </div>
  )
}
