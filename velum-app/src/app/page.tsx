'use client'

'use client'

import React, { useState, useEffect } from 'react'
import { 
  Search, 
  ChevronRight, 
  ChevronDown, 
  ChevronLeft,
  Plus, 
  Send, 
  Settings, 
  Sparkles, 
  X, 
  Apple, 
  Target, 
  Dumbbell, 
  Brain, 
  CheckSquare,
  Flame,
  ArrowLeft
} from 'lucide-react'

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

// Types
interface FoodEntry {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  time: string
  date: string
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

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
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

// Sidebar Component
function Sidebar({ 
  navigation, 
  activeItem, 
  setActiveItem,
  expandedFolders,
  toggleFolder 
}: {
  navigation: NavItem[]
  activeItem: string
  setActiveItem: (id: string) => void
  expandedFolders: Set<string>
  toggleFolder: (id: string) => void
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
            }
          }}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all group
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
    <aside className="w-60 bg-stone-100/50 border-r border-stone-200/50 flex flex-col h-screen">
      {/* Logo */}
      <div className="h-14 flex items-center gap-3 px-4 border-b border-stone-200/50">
        <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-pink-600 rounded-lg flex items-center justify-center shadow-sm shadow-orange-500/20">
          <span className="text-white font-bold text-sm">V</span>
        </div>
        <span className="font-semibold text-stone-800">Velum</span>
      </div>
      
      {/* Search */}
      <div className="px-3 py-3">
        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-400 hover:bg-stone-200/50 rounded-lg transition-colors">
          <Search size={16} />
          <span>Search</span>
        </button>
      </div>
      
      {/* Navigation */}
      <div className="flex-1 overflow-auto px-3 pb-4">
        <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider px-2 mb-2">
          WORKSPACE
        </p>
        <nav className="space-y-0.5">
          {navigation.map(item => renderNavItem(item))}
        </nav>
      </div>
      
      {/* Settings */}
      <div className="p-3 border-t border-stone-200/50">
        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-500 hover:bg-stone-200/50 rounded-lg transition-colors">
          <Settings size={16} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  )
}

// Chat Component
function Chat({ chatOpen, setChatOpen, context }: { chatOpen: boolean; setChatOpen: (open: boolean) => void; context: string }) {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hey! You've got calories left today. Want dinner suggestions? 🍽️",
      timestamp: new Date()
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  
  const sendMessage = async () => {
    if (!message.trim() || isLoading) return
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setMessage('')
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context })
      })
      
      const data = await response.json()
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content || data.reply || "I'm here to help! What would you like to know?",
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting. You can still log food manually!",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, fallbackMessage])
    }
    
    setIsLoading(false)
  }
  
  return (
    <aside className={`bg-white border-l border-stone-100 flex flex-col transition-all duration-300 ${chatOpen ? 'w-72' : 'w-0 overflow-hidden'}`}>
      <div className="h-14 border-b border-stone-100 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm shadow-violet-500/20">
            <Sparkles size={12} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-stone-900">Archie</p>
            <p className="text-[10px] text-stone-400">Online</p>
          </div>
        </div>
        <button onClick={() => setChatOpen(false)} className="p-1.5 hover:bg-stone-100 rounded-lg">
          <X size={14} className="text-stone-400" />
        </button>
      </div>
      
      <div className="flex-1 p-4 overflow-auto">
        <div className="space-y-3">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' ? (
                <div className="flex gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-purple-600 rounded-md flex items-center justify-center flex-shrink-0">
                    <Sparkles size={10} className="text-white" />
                  </div>
                  <div className="flex-1 p-2.5 bg-stone-50 rounded-xl rounded-tl-sm">
                    <p className="text-xs text-stone-700 leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs bg-stone-900 text-white px-3 py-2 rounded-xl rounded-tr-sm">{msg.content}</p>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-purple-600 rounded-md flex items-center justify-center flex-shrink-0">
                <Sparkles size={10} className="text-white" />
              </div>
              <div className="flex-1 p-2.5 bg-stone-50 rounded-xl rounded-tl-sm">
                <p className="text-xs text-stone-500">Thinking...</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-3 border-t border-stone-100">
        <div className="flex items-center gap-2 bg-stone-100 rounded-lg px-3 py-2">
          <input
            type="text"
            placeholder="Ask Archie..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button 
            onClick={sendMessage}
            disabled={isLoading || !message.trim()}
            className="p-1 bg-stone-900 hover:bg-stone-800 rounded transition-colors disabled:opacity-50"
          >
            <Send size={12} className="text-white" />
          </button>
        </div>
      </div>
    </aside>
  )
}

// Nutrition Today View
function NutritionTodayView({ nutritionData }: { nutritionData: NutritionData }) {
  const [activeTab, setActiveTab] = useState('today')
  const { entries, totals, goals } = nutritionData
  
  const progress = Math.round((totals.calories / goals.calories) * 100)
  const remaining = goals.calories - totals.calories
  const [animatedProgress, setAnimatedProgress] = useState(0)
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedProgress(progress), 100)
    return () => clearTimeout(timer)
  }, [progress])
  
  return (
    <div className="max-w-2xl mx-auto">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-stone-100 rounded-lg mb-5 w-fit">
        <button 
          onClick={() => setActiveTab('today')}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${activeTab === 'today' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
        >
          Today
        </button>
        <button 
          onClick={() => setActiveTab('week')}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${activeTab === 'week' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
        >
          Past 7 days
        </button>
      </div>
      
      {/* Hero Stats Card */}
      <div className="relative bg-gradient-to-br from-stone-900 to-stone-800 rounded-2xl p-5 mb-5 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-pink-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-5 mb-5">
            {/* Ring */}
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-stone-700" />
                <circle 
                  cx="50" cy="50" r="42" fill="none" stroke="url(#ringGrad)" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${animatedProgress * 2.64} 264`}
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-white">{totals.calories}</span>
                <span className="text-[9px] text-stone-400 uppercase">kcal</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-xs text-stone-400 mb-1">Remaining</p>
              <p className="text-3xl font-bold text-white">{remaining}</p>
              <p className="text-xs text-stone-500">of {goals.calories} kcal goal</p>
            </div>
          </div>
          <div className="h-px bg-stone-700 mb-4" />
          <div className="grid grid-cols-2 gap-5">
            <MacroStat label="Protein" current={totals.protein} goal={goals.protein} color="from-amber-500 to-orange-500" />
            <MacroStat label="Carbs" current={totals.carbs} goal={goals.carbs} color="from-emerald-500 to-teal-500" />
          </div>
        </div>
      </div>
      
      {/* Content based on active tab */}
      {activeTab === 'today' ? (
        <>
          {/* Meals */}
          <div>
            <h2 className="text-sm font-semibold text-stone-900 mb-3">Meals</h2>
            <div className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="group flex items-center gap-3 p-3 bg-white border border-stone-100 rounded-xl hover:border-stone-200 transition-all cursor-pointer">
                  <div className="w-9 h-9 bg-stone-50 rounded-lg flex items-center justify-center text-base">
                    🍽️
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-900 truncate">{entry.name}</p>
                    <p className="text-[10px] text-stone-400">{entry.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-stone-900">{entry.calories}</p>
                    <p className="text-[10px] text-stone-400">kcal</p>
                  </div>
                </div>
              ))}
              <button className="w-full p-3 border border-dashed border-stone-200 rounded-xl hover:border-stone-300 hover:bg-white transition-all text-sm text-stone-400 hover:text-stone-600">
                + Add meal
              </button>
            </div>
          </div>
        </>
      ) : (
        <WeekView onDayClick={(day) => console.log('Selected:', day)} />
      )}
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
      <div className="max-w-2xl mx-auto">
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
    <div className="max-w-2xl mx-auto">
      <h2 className="text-lg font-semibold text-stone-900 mb-4">Past 7 Days</h2>
      
      <div className="grid grid-cols-7 gap-2 mb-6">
        {weekData.map((day) => {
          const progress = Math.round((day.totals.calories / day.goals.calories) * 100)
          const isToday = day.date === new Date().toISOString().split('T')[0]
          
          return (
            <button
              key={day.date}
              onClick={() => setSelectedDay(day)}
              className={`flex flex-col items-center p-3 rounded-xl transition-all ${
                isToday ? 'bg-orange-100 border-2 border-orange-300' : 'bg-white border border-stone-100 hover:border-stone-300'
              }`}
            >
              <span className="text-xs text-stone-500 mb-1">{day.dayName}</span>
              <span className="text-lg font-bold text-stone-900 mb-2">{day.dayNumber}</span>
              
              {/* Mini ring */}
              <div className="relative w-10 h-10">
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
                  <span className="text-[9px] font-medium">{Math.min(progress, 100)}%</span>
                </div>
              </div>
              
              <span className={`text-xs mt-1 ${progress > day.goals.calories ? 'text-red-500' : 'text-stone-500'}`}>
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
          <div className="grid grid-cols-4 gap-4 text-center">
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

// Goals View with Life Timeline
function GoalsView() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [viewMode, setViewMode] = useState<'years' | 'weeks'>('years')
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [formData, setFormData] = useState({ birthDate: '', country: '', lifeExpectancy: 85 })

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
          lifeExpectancy: parseInt(formData.lifeExpectancy as any)
        })
      })
      if (response.ok) {
        // Refresh profile
        const refresh = await fetch('/api/profile')
        const data = await refresh.json()
        setProfile(data.profile)
        setShowSettings(false)
      }
    } catch (error) {
      console.error('Error saving profile:', error)
    }
  }

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
      <div className="max-w-md mx-auto p-6">
        <div className="bg-white border border-stone-100 rounded-2xl p-6">
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

  const { currentAge, weeksRemaining, totalWeeks, percentLived, life_expectancy, yearsRemaining } = profile

  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* Header with stats */}
      <div className="relative bg-gradient-to-br from-stone-900 to-stone-800 rounded-2xl p-6 mb-6 text-white">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs text-stone-400 mb-1">Week {Math.floor(profile.ageInWeeks % 52) + 1} of 2026</p>
              <h2 className="text-4xl font-bold">{weeksRemaining.toLocaleString()}</h2>
              <p className="text-sm text-stone-400">weeks remaining</p>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-stone-700 rounded-lg text-stone-300 hover:text-white"
            >
              <Settings size={18} />
            </button>
          </div>
          
          <div className="flex gap-6 text-sm">
            <div>
              <p className="font-semibold text-lg">{currentAge}</p>
              <p className="text-stone-500 text-xs">years old</p>
            </div>
            <div>
              <p className="font-semibold text-lg">{yearsRemaining}</p>
              <p className="text-stone-500 text-xs">years left</p>
            </div>
            <div>
              <p className="font-semibold text-lg">{percentLived}%</p>
              <p className="text-stone-500 text-xs">complete</p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white border border-stone-100 rounded-xl p-4 mb-6">
          <h3 className="font-medium text-stone-900 mb-4">Profile Settings</h3>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-stone-600 mb-1">Birth Date</label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-600 mb-1">Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({...formData, country: e.target.value})}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm">
                Save Changes
              </button>
              <button 
                type="button" 
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-stone-600 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View Toggle */}
      <div className="flex gap-1 p-1 bg-stone-100 rounded-lg mb-6 w-fit">
        <button
          onClick={() => { setViewMode('years'); setSelectedYear(null); }}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${viewMode === 'years' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
        >
          Years
        </button>
        <button
          onClick={() => setViewMode('weeks')}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${viewMode === 'weeks' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
        >
          Weeks
        </button>
      </div>

      {/* Years View */}
      {viewMode === 'years' && !selectedYear && (
        <div className="bg-white border border-stone-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-stone-900">Your Timeline</h3>
            <p className="text-xs text-stone-400">Click current year to expand</p>
          </div>
          
          <div className="space-y-2">
            {Array.from({ length: Math.ceil(life_expectancy / 10) }, (_, i) => {
              const decadeStart = i * 10
              const decadeEnd = Math.min(decadeStart + 10, life_expectancy)
              
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-stone-400 w-6">{decadeStart}</span>
                  <div className="flex-1 flex gap-1">
                    {Array.from({ length: decadeEnd - decadeStart }, (_, y) => {
                      const year = decadeStart + y
                      const isLived = year < currentAge
                      const isCurrent = year === currentAge
                      
                      return (
                        <button
                          key={year}
                          onClick={() => isCurrent && setSelectedYear(year)}
                          className={`flex-1 h-8 rounded transition-all ${
                            isCurrent 
                              ? 'bg-gradient-to-t from-orange-500 to-amber-400 cursor-pointer hover:scale-105' 
                              : isLived 
                                ? 'bg-stone-700' 
                                : 'bg-stone-100'
                          }`}
                          title={`Age ${year}`}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
          
          <div className="flex items-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-stone-700 rounded" />
              <span className="text-stone-500">Lived</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gradient-to-t from-orange-500 to-amber-400 rounded" />
              <span className="text-stone-500">Current</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-stone-100 rounded" />
              <span className="text-stone-500">Future</span>
            </div>
          </div>
        </div>
      )}

      {/* Year Detail View */}
      {viewMode === 'years' && selectedYear !== null && (
        <div className="bg-white border border-stone-100 rounded-xl p-4">
          <button 
            onClick={() => setSelectedYear(null)}
            className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 mb-4"
          >
            <ArrowLeft size={16} />
            Back to timeline
          </button>
          
          <h3 className="font-semibold text-stone-900 mb-1">Age {selectedYear}</h3>
          <p className="text-sm text-stone-500 mb-4">
            {selectedYear === currentAge ? `Week ${Math.floor(profile.ageInWeeks % 52) + 1} of 52` : 'All weeks'}
          </p>
          
          <div className="space-y-3">
            {['Q1', 'Q2', 'Q3', 'Q4'].map((q, qi) => {
              const weeksInQuarter = 13
              const quarterStart = qi * weeksInQuarter
              
              return (
                <div key={q} className="flex items-center gap-2">
                  <span className="text-xs text-stone-400 w-8">{q}</span>
                  <div className="flex-1 flex gap-0.5">
                    {Array.from({ length: weeksInQuarter }, (_, w) => {
                      const weekOfYear = quarterStart + w
                      const isPassed = selectedYear < currentAge || 
                        (selectedYear === currentAge && weekOfYear < profile.ageInWeeks % 52)
                      const isCurrent = selectedYear === currentAge && weekOfYear === Math.floor(profile.ageInWeeks % 52)
                      
                      return (
                        <div
                          key={w}
                          className={`flex-1 aspect-square rounded-[2px] ${
                            isCurrent 
                              ? 'bg-gradient-to-br from-orange-500 to-pink-500' 
                              : isPassed 
                                ? 'bg-stone-600' 
                                : 'bg-stone-200'
                          }`}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
          
          {selectedYear === currentAge && (
            <div className="mt-4 pt-4 border-t border-stone-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-stone-600">Year progress</span>
                <span className="text-sm font-semibold">{Math.round((profile.ageInWeeks % 52) / 52 * 100)}%</span>
              </div>
              <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full"
                  style={{ width: `${(profile.ageInWeeks % 52) / 52 * 100}%` }}
                />
              </div>
              <p className="text-xs text-stone-400 mt-2">{52 - (profile.ageInWeeks % 52)} weeks until your next birthday</p>
            </div>
          )}
        </div>
      )}

      {/* Weeks View - Life in Weeks */}
      {viewMode === 'weeks' && (
        <div className="bg-white border border-stone-100 rounded-xl p-4">
          <h3 className="font-medium text-stone-900 mb-4">Life in Weeks</h3>
          <div className="overflow-x-auto">
            <div className="inline-flex flex-col items-center gap-0.5">
              {Array.from({ length: life_expectancy }, (_, year) => {
                const showYearLabel = year % 5 === 0 || year === life_expectancy - 1
                return (
                  <div key={year} className="flex items-center gap-2">
                    {/* Year label on the left */}
                    <span className="text-[10px] text-stone-400 w-6 text-right">
                      {showYearLabel ? year : ''}
                    </span>
                    {/* Weeks grid for this year */}
                    <div className="flex gap-0.5">
                      {Array.from({ length: 52 }, (_, week) => {
                        const totalWeek = year * 52 + week
                        const isLived = totalWeek < profile.ageInWeeks
                        const isCurrent = totalWeek === profile.ageInWeeks
                        
                        return (
                          <div
                            key={`${year}-${week}`}
                            className={`w-1.5 h-1.5 rounded-[1px] ${
                              isCurrent 
                                ? 'bg-gradient-to-br from-orange-500 to-pink-500' 
                                : isLived 
                                  ? 'bg-stone-700' 
                                  : 'bg-stone-200'
                            }`}
                            title={`Year ${year + 1}, Week ${week + 1}`}
                          />
                        )
                      })}
                    </div>
                    {/* Year label on the right */}
                    <span className="text-[10px] text-stone-400 w-6 text-left">
                      {showYearLabel ? year : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
          <p className="text-xs text-stone-400 mt-2">Each dot = 1 week • {totalWeeks.toLocaleString()} total weeks</p>
        </div>
      )}
    </div>
  )
}

// Main Dashboard
function Dashboard({ activeView, nutritionData }: { activeView: string; nutritionData: NutritionData }) {
  const { entries, totals, goals } = nutritionData
  const chatContext = `Today's intake: ${Math.round(totals.calories)} calories, ${Math.round(totals.protein)}g protein, ${Math.round(totals.carbs)}g carbs, ${Math.round(totals.fat)}g fat. Goals: ${goals.calories} cal, ${goals.protein}g protein, ${goals.carbs}g carbs, ${goals.fat}g fat.`
  
  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <header className="h-14 bg-white/80 backdrop-blur-xl border-b border-stone-100 flex items-center justify-between px-6 sticky top-0 z-10">
        <div>
          <h1 className="text-base font-semibold text-stone-900">
            {activeView === 'nutrition-today' ? 'Today' : activeView === 'goals' ? 'Goals' : 'Velum'}
          </h1>
          <p className="text-xs text-stone-400">
            {activeView === 'nutrition-today' ? 'Track your daily nutrition' : activeView === 'goals' ? 'Life planning' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 px-4 bg-stone-900 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-stone-800 transition-colors">
            <Plus size={14} strokeWidth={2.5} />
            {activeView.startsWith('nutrition') ? 'Log food' : 'Add'}
          </button>
        </div>
      </header>
      
      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {activeView === 'nutrition-today' && (
          <NutritionTodayView nutritionData={nutritionData} />
        )}
        {activeView === 'goals' && (
          <GoalsView />
        )}
        {!['nutrition-today', 'goals'].includes(activeView) && (
          <div className="flex items-center justify-center h-64 text-stone-400">
            <div className="text-center">
              <p className="text-lg font-medium text-stone-500">
                {activeView === 'nutrition-history' ? 'History' : activeView === 'fitness' ? 'Fitness' : 'Coming soon'}
              </p>
              <p className="text-sm mt-1">This feature is under development</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Main Page
export default function Home() {
  const [activeItem, setActiveItem] = useState('nutrition-today')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['nutrition']))
  const [chatOpen, setChatOpen] = useState(true)
  const [nutritionData, setNutritionData] = useState<NutritionData>({
    date: new Date().toISOString().split('T')[0],
    entries: [],
    totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    goals: { calories: 2000, protein: 150, carbs: 200, fat: 65 }
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
      type: 'page',
    },
    {
      id: 'tasks',
      name: 'Tasks',
      icon: <CheckSquare size={16} />,
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
        setActiveItem={setActiveItem}
        expandedFolders={expandedFolders}
        toggleFolder={toggleFolder}
      />
      
      <div className="flex flex-1 min-w-0">
        <Dashboard activeView={activeItem} nutritionData={nutritionData} />
        
        <Chat 
          chatOpen={chatOpen} 
          setChatOpen={setChatOpen}
          context={`Today's intake: ${nutritionData.totals.calories} calories, ${nutritionData.totals.protein}g protein, ${nutritionData.totals.carbs}g carbs`}
        />
      </div>
    </div>
  )
}
