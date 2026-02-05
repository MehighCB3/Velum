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
  ArrowLeft,
  Wallet,
  Menu,
  Star,
  ImageIcon,
  Trash2
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
  type: 'steps' | 'run' | 'swim' | 'cycle' | 'vo2max' | 'training_load' | 'stress' | 'recovery' | 'hrv' | 'weight' | 'body_fat'
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
              <span className="text-[10px] text-stone-500 font-medium">{day.dayName}</span>
              <span className="text-[9px] text-stone-400">{day.totals.calories}</span>
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
          <div className="grid grid-cols-4 gap-3 mb-4">
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

// Edit Meal Modal (uses chat)
function EditMealModal({
  entry,
  isOpen,
  onClose,
  onSendToChat
}: {
  entry: FoodEntry | null
  isOpen: boolean
  onClose: () => void
  onSendToChat: (message: string) => void
}) {
  const [editText, setEditText] = useState('')
  
  useEffect(() => {
    if (entry && isOpen) {
      setEditText(`Change '${entry.name}' to `)
    }
  }, [entry, isOpen])
  
  if (!isOpen || !entry) return null
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editText.trim()) {
      const context = `Editing meal: "${entry.name}" (${entry.calories} cal, ${entry.protein}g protein, ${entry.carbs}g carbs, ${entry.fat}g fat) logged at ${entry.time}. User wants to correct it.`
      onSendToChat(`${editText}\n\n[Context: ${context}]`)
      onClose()
    }
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-stone-900">Correct with AI</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-lg"
          >
            <X size={20} className="text-stone-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-stone-600 mb-4">
            Tell Archie how to correct <strong>{entry.name}</strong>:
          </p>
          
          <form onSubmit={handleSubmit}>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
              rows={3}
              placeholder="e.g., Change 'burger' to 'grilled chicken sandwich'"
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Send to Archie
              </button>
            </div>
          </form>
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
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-72 bg-stone-100/50 border-r border-stone-200/50 flex flex-col h-screen
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
            className="ml-auto lg:hidden p-1.5 hover:bg-stone-200 rounded-lg"
          >
            <X size={18} className="text-stone-500" />
          </button>
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
    </>
  )
}

// Chat Component
function Chat({ 
  chatOpen, 
  setChatOpen, 
  context,
  externalMessage,
  onExternalMessageHandled
}: { 
  chatOpen: boolean
  setChatOpen: (open: boolean) => void
  context: string
  externalMessage?: string | null
  onExternalMessageHandled?: () => void
}) {
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
  
  // Handle external messages (from edit modal)
  useEffect(() => {
    if (externalMessage && onExternalMessageHandled) {
      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: externalMessage,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, userMessage])
      
      // Open chat
      setChatOpen(true)
      
      // Send to API
      handleSendMessage(externalMessage)
      
      // Mark as handled
      onExternalMessageHandled()
    }
  }, [externalMessage])
  
  const handleSendMessage = async (msg: string) => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, context })
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
  
  const sendMessage = async () => {
    if (!message.trim() || isLoading) return
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    const msgToSend = message
    setMessage('')
    
    await handleSendMessage(msgToSend)
  }
  
  return (
    <>
      {/* Mobile overlay */}
      {chatOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setChatOpen(false)}
        />
      )}
      
      {/* Chat panel */}
      <aside className={`
        fixed lg:static inset-y-0 right-0 z-50
        bg-white border-l border-stone-100 flex flex-col
        transition-all duration-300 ease-in-out
        w-full lg:w-72
        ${chatOpen ? 'translate-x-0' : 'translate-x-full lg:w-0 lg:overflow-hidden lg:opacity-0'}
      `}>
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
                  <p className="text-xs bg-stone-900 text-white px-3 py-2 rounded-xl rounded-tr-sm max-w-[80%]">{msg.content}</p>
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
    </>
  )
}

// Nutrition Today View
function NutritionTodayView({ 
  nutritionData,
  onSendToChat
}: { 
  nutritionData: NutritionData
  onSendToChat: (message: string) => void
}) {
  const [activeTab, setActiveTab] = useState('today')
  const [weekData, setWeekData] = useState<WeekDayData[]>([])
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
    <div className="max-w-2xl mx-auto">
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
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'today' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setActiveTab('week')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'week' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500'
          }`}
        >
          Past 7 days
        </button>
      </div>

      {activeTab === 'today' ? (
        <>
          {/* Dark Hero Card */}
          <div className="relative bg-gradient-to-br from-[#1a1d2e] to-[#252840] rounded-2xl p-5 mb-6 overflow-hidden">
            {/* Top metrics row */}
            <div className="flex items-center justify-between mb-6">
              <div className="text-center flex-1">
                <p className="text-[10px] font-semibold text-orange-400 uppercase tracking-wider mb-0.5">Goal</p>
                <p className="text-sm font-bold text-orange-400">{goals.calories}</p>
              </div>
              <div className="text-center flex-1">
                <p className="text-[10px] font-semibold text-orange-400 uppercase tracking-wider mb-0.5">Remaining</p>
                <p className="text-sm font-bold text-orange-400">{remaining}</p>
              </div>
              <div className="text-center flex-1">
                <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-0.5">Fiber</p>
                <p className="text-sm font-bold text-white">{fiberTotal > 0 ? `${fiberTotal}g` : '--'}</p>
              </div>
              <div className="text-center flex-1">
                <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-0.5">Water</p>
                <p className="text-sm font-bold text-white">--</p>
              </div>
            </div>

            {/* Big calorie number */}
            <div className="text-center mb-5">
              <p className="text-6xl font-bold text-white tracking-tight">{totals.calories}</p>
              <p className="text-sm text-stone-400 mt-1">Calories</p>
            </div>

            {/* Macro breakdown */}
            <div className="flex items-center justify-center gap-6">
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
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
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
          lifeExpectancy: parseInt(formData.lifeExpectancy as any)
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

  const { currentAge, weeksRemaining, percentLived, yearsRemaining } = profile

  return (
    <div className="max-w-2xl mx-auto">
      {/* Life Timeline Widget */}
      <div className="relative bg-gradient-to-br from-[#1a1d2e] to-[#252840] rounded-2xl p-5 mb-6 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Life Timeline</h2>
              <p className="text-xs text-stone-400">Week {Math.floor(profile.ageInWeeks % 52) + 1} of {new Date().getFullYear()}</p>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-stone-700/50 rounded-lg text-stone-400 hover:text-white transition-colors"
            >
              <Settings size={16} />
            </button>
          </div>
          
          {/* Life stats row */}
          <div className="flex items-center justify-between mb-5">
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-white">{currentAge}</p>
              <p className="text-[10px] text-stone-400 uppercase tracking-wider">years old</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-white">{weeksRemaining.toLocaleString()}</p>
              <p className="text-[10px] text-stone-400 uppercase tracking-wider">weeks left</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-white">{yearsRemaining}</p>
              <p className="text-[10px] text-stone-400 uppercase tracking-wider">years left</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-white">{percentLived}%</p>
              <p className="text-[10px] text-stone-400 uppercase tracking-wider">lived</p>
            </div>
          </div>

          {/* Accomplishment Stats */}
          <div className="border-t border-stone-700/50 pt-4">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {horizons.map(h => (
                <button
                  key={h.key}
                  onClick={() => setTimelineHorizon(h.key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
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

      {/* Goals Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-stone-900">Goals</h2>
        <button
          onClick={() => setShowAddGoal(true)}
          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium rounded-full shadow-sm hover:shadow-md transition-all"
        >
          + Add Goal
        </button>
      </div>

      {/* Horizon Tabs */}
      <div className="flex p-1 bg-stone-100 rounded-lg mb-5">
        {horizons.map(h => (
          <button
            key={h.key}
            onClick={() => setActiveHorizon(h.key)}
            className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
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
                  <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-stone-50 rounded-lg">
                    <div>
                      <p className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold mb-0.5">Metric</p>
                      <p className="text-sm font-medium text-stone-800">{goal.keyMetric || '\u2014'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold mb-0.5">Goal</p>
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
                        className="w-7 h-7 flex items-center justify-center bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-600 transition-colors text-sm font-medium"
                      >
                        \u2212
                      </button>
                      <span className="text-[11px] text-stone-400">Adjust progress</span>
                      <button
                        onClick={() => updateProgress(goal.id, 1)}
                        className="w-7 h-7 flex items-center justify-center bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-600 transition-colors text-sm font-medium"
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
    const activityTypes = ['run', 'swim', 'cycle']
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
      default: return { bg: 'bg-stone-50', text: 'text-stone-600', emoji: '\u{1F3CB}', label: 'Activity' }
    }
  }

  // Totals
  const totalKm = fitnessData.totals.totalDistance
  const runKm = fitnessData.totals.runDistance || 0
  const swimKm = fitnessData.totals.swimDistance || 0
  const cycleKm = fitnessData.totals.cycleDistance || 0

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
    <div className="max-w-2xl mx-auto">
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
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            viewMode === 'today' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setViewMode('week')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            viewMode === 'week' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500'
          }`}
        >
          This week
        </button>
      </div>

      {/* Dark Hero Card */}
      <div className="relative bg-gradient-to-br from-[#1a1d2e] to-[#252840] rounded-2xl p-5 mb-6 overflow-hidden">
        {/* Metrics pills row */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-center flex-1">
            <p className="text-[10px] font-semibold text-orange-400 uppercase tracking-wider mb-0.5">HRV</p>
            <p className="text-sm font-bold text-white">{latestHrv || '--'} <span className="text-[10px] text-stone-500 font-normal">ms</span></p>
          </div>
          <div className="text-center flex-1">
            <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider mb-0.5">VO&#8322;</p>
            <p className="text-sm font-bold text-white">{latestVo2 || '--'}</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-0.5">Weight</p>
            <p className="text-sm font-bold text-white">{latestWeight || '--'} <span className="text-[10px] text-stone-500 font-normal">kg</span></p>
          </div>
          <div className="text-center flex-1">
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-0.5">Fat</p>
            <p className="text-sm font-bold text-white">{latestFat || '--'}<span className="text-[10px] text-stone-500 font-normal">%</span></p>
          </div>
        </div>

        {/* Big kilometer number */}
        <div className="text-center mb-5">
          <p className="text-6xl font-bold text-white tracking-tight">{Math.round(totalKm)}</p>
          <p className="text-sm text-stone-400 mt-1">Kilometers</p>
        </div>

        {/* Activity type breakdown */}
        <div className="flex items-center justify-center gap-6">
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
    </div>
  )
}


// Budget View Component
function BudgetView() {
  const [loading, setLoading] = useState(true)
  const [weeklyData, setWeeklyData] = useState<any[]>([])
  
  const WEEKLY_BUDGET = 70
  const totalBudget = 350 // 5 weeks × €70
  
  // Generate week keys for current month (Week 1-5)
  const getWeekKeys = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    
    // Get ISO week numbers for the month
    const weeks: string[] = []
    for (let weekNum = 1; weekNum <= 5; weekNum++) {
      // Approximate week key - in real app, calculate proper ISO week
      const startOfYear = new Date(year, 0, 1)
      const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
      const currentWeek = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7)
      // Adjust for week of month approximation
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
                expenditures: (data.entries || []).map((entry: any) => ({
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
    <div className="max-w-2xl mx-auto">
      {/* Hero Stats Card with Weekly Budget Widget */}
      <div className="relative bg-gradient-to-br from-stone-900 to-stone-800 rounded-2xl p-5 mb-5 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-5 mb-5">
            {/* Ring */}
            <div className="relative w-24 h-24 flex-shrink-0">
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
                <span className="text-[9px] text-stone-400 uppercase">spent</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-xs text-stone-400 mb-1">Remaining</p>
              <p className="text-3xl font-bold text-white">€{totalRemaining}</p>
              <p className="text-xs text-stone-500">of €{totalBudget} monthly budget</p>
            </div>
          </div>
          
          {/* Weekly Budget Widget */}
          <div className="bg-stone-800/50 rounded-xl p-3 mb-4">
            <p className="text-xs text-stone-400 mb-2">Weekly Budgets</p>
            <div className="flex gap-2">
              {weeklyData.map((week) => (
                <div key={week.weekNum} className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-stone-500">W{week.weekNum}</span>
                    <span className="text-[10px] text-stone-400">€{week.remaining}</span>
                  </div>
                  <div className="h-8 bg-stone-700 rounded-md overflow-hidden relative">
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
            <div className="flex items-center justify-between p-3 bg-stone-50 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-stone-900">{week.weekLabel}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  week.spent > week.budget * 0.9 ? 'bg-red-100 text-red-600' : 
                  week.spent > week.budget * 0.7 ? 'bg-amber-100 text-amber-600' : 
                  'bg-emerald-100 text-emerald-600'
                }`}>
                  €{week.remaining} left
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-stone-900">€{week.spent}</span>
                <span className="text-xs text-stone-400"> / €{week.budget}</span>
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
                week.expenditures.map((entry: any) => (
                  <div key={entry.id} className="flex items-center gap-3 p-3 hover:bg-stone-50 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                      entry.category.includes('Food') ? 'bg-emerald-50' : 'bg-blue-50'
                    }`}>
                      {entry.category.includes('Food') ? '🍽️' : '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-900 truncate">{entry.description}</p>
                      <p className="text-[10px] text-stone-400">
                        {entry.category}
                        {entry.reason && (
                          <span className="ml-1 text-stone-500 italic">— "{entry.reason}"</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-stone-900">€{entry.amount}</p>
                      <p className="text-[10px] text-stone-400">{entry.date}</p>
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
    </div>
  )
}

// Main Dashboard
function Dashboard({ 
  activeView, 
  nutritionData,
  onMenuClick,
  onChatClick,
  chatOpen,
  onSendToChat
}: { 
  activeView: string
  nutritionData: NutritionData
  onMenuClick: () => void
  onChatClick: () => void
  chatOpen: boolean
  onSendToChat: (message: string) => void
}) {
  const { entries, totals, goals } = nutritionData
  const chatContext = `Today's intake: ${Math.round(totals.calories)} calories, ${Math.round(totals.protein)}g protein, ${Math.round(totals.carbs)}g carbs, ${Math.round(totals.fat)}g fat. Goals: ${goals.calories} cal, ${goals.protein}g protein, ${goals.carbs}g carbs, ${goals.fat}g fat.`
  
  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <header className="h-14 bg-white/80 backdrop-blur-xl border-b border-stone-100 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button 
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 hover:bg-stone-100 rounded-lg"
          >
            <Menu size={20} className="text-stone-600" />
          </button>
          
          <div>
            <h1 className="text-base font-semibold text-stone-900">
              {activeView === 'nutrition-today' ? 'Today' : activeView === 'goals' ? 'Goals' : activeView === 'budget' ? 'Budget' : activeView === 'fitness' ? 'Fitness' : 'Velum'}
            </h1>
            <p className="text-xs text-stone-400 hidden sm:block">
              {activeView === 'nutrition-today' ? 'Track your daily nutrition' : activeView === 'goals' ? 'Life planning' : activeView === 'budget' ? 'Weekly spending tracker' : activeView === 'fitness' ? 'Track your activity' : ''}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Chat toggle button (mobile) */}
          <button 
            onClick={onChatClick}
            className={`lg:hidden p-2 rounded-lg transition-colors ${chatOpen ? 'bg-violet-100 text-violet-600' : 'hover:bg-stone-100 text-stone-600'}`}
          >
            <Sparkles size={20} />
          </button>
          
          <button className="h-9 px-3 sm:px-4 bg-stone-900 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-stone-800 transition-colors">
            <Plus size={14} strokeWidth={2.5} className="hidden sm:block" />
            <span className="hidden sm:inline">{activeView.startsWith('nutrition') ? 'Log food' : 'Add'}</span>
            <Plus size={16} strokeWidth={2.5} className="sm:hidden" />
          </button>
        </div>
      </header>
      
      {/* Content */}
      <div className="flex-1 p-4 sm:p-6 overflow-auto">
        {activeView === 'nutrition-today' && (
          <NutritionTodayView 
            nutritionData={nutritionData}
            onSendToChat={onSendToChat}
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
        {!['nutrition-today', 'goals', 'budget', 'fitness'].includes(activeView) && (
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

// Main Page
export default function Home() {
  const [activeItem, setActiveItem] = useState('nutrition-today')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['nutrition']))
  const [chatOpen, setChatOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [externalChatMessage, setExternalChatMessage] = useState<string | null>(null)
  const [nutritionData, setNutritionData] = useState<NutritionData>({
    date: new Date().toISOString().split('T')[0],
    entries: [],
    totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    goals: { calories: 2000, protein: 150, carbs: 200, fat: 65 }
  })
  
  // Detect desktop and auto-open chat
  useEffect(() => {
    const checkDesktop = () => {
      if (window.innerWidth >= 1024) {
        setChatOpen(true)
      }
    }
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])
  
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
  
  const handleSendToChat = (message: string) => {
    setExternalChatMessage(message)
  }
  
  const handleExternalMessageHandled = () => {
    setExternalChatMessage(null)
  }
  
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
        setActiveItem={setActiveItem}
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
          onChatClick={() => setChatOpen(!chatOpen)}
          chatOpen={chatOpen}
          onSendToChat={handleSendToChat}
        />
        
        <Chat 
          chatOpen={chatOpen} 
          setChatOpen={setChatOpen}
          context={`Today's intake: ${nutritionData.totals.calories} calories, ${nutritionData.totals.protein}g protein, ${nutritionData.totals.carbs}g carbs`}
          externalMessage={externalChatMessage}
          onExternalMessageHandled={handleExternalMessageHandled}
        />
      </div>
    </div>
  )
}
