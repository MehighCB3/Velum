'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Search, 
  Settings, 
  Apple, 
  Target, 
  MessageSquare,
  Send,
  Utensils,
  Flame,
  Beef,
  Wheat,
  MoreHorizontal,
  Trash2,
  X
} from 'lucide-react'

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

interface Goals {
  calories: number
  protein: number
  carbs: number
  fat: number
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
        <div
          className={`flex items-center gap-1 px-2 py-1 mx-1 rounded cursor-pointer group
            ${isActive ? 'bg-notion-hover' : 'hover:bg-notion-hover'}`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleFolder(item.id)
            }
            setActiveItem(item.id)
          }}
        >
          {hasChildren ? (
            <button 
              className="p-0.5 hover:bg-notion-border rounded"
              onClick={(e) => {
                e.stopPropagation()
                toggleFolder(item.id)
              }}
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-notion-text-light" />
              ) : (
                <ChevronRight className="w-3 h-3 text-notion-text-light" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}
          
          {item.icon && (
            <span className="text-notion-text-light">{item.icon}</span>
          )}
          
          <span className={`text-sm truncate flex-1 ${isActive ? 'text-notion-text' : 'text-notion-text-light'}`}>
            {item.name}
          </span>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {item.children!.map(child => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }
  
  return (
    <div className="w-60 bg-notion-sidebar border-r border-notion-border flex flex-col h-screen">
      {/* Workspace header */}
      <div className="p-3 border-b border-notion-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="spiralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#ff6b35;stop-opacity:1" />
                  <stop offset="50%" style="stop-color:#f7931e;stop-opacity:1" />
                  <stop offset="100%" style="stop-color:#ff6b35;stop-opacity:1" />
                </linearGradient>
              </defs>
              <circle cx="32" cy="32" r="30" fill="#1a1a1a" stroke="#333" stroke-width="2"/>
              <path d="M32,12 C40,12 48,20 48,32 C48,44 40,52 32,52 C24,52 16,44 16,32 C16,24 20,18 26,15" 
                    fill="none" 
                    stroke="url(#spiralGradient)" 
                    stroke-width="3" 
                    stroke-linecap="round"/>
              <circle cx="26" cy="15" r="2" fill="#ff6b35"/>
              <circle cx="32" cy="32" r="28" fill="none" stroke="#ff6b35" stroke-width="1" opacity="0.3"/>
            </svg>
          </div>
          <span className="font-medium text-sm">Archie</span>
        </div>
      </div>
      
      {/* Search */}
      <div className="p-2">
        <div className="flex items-center gap-2 px-2 py-1.5 text-notion-text-light hover:bg-notion-hover rounded cursor-pointer">
          <Search className="w-4 h-4" />
          <span className="text-sm">Search</span>
        </div>
      </div>
      
      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-3 py-1">
          <span className="text-xs text-notion-text-light font-medium">WORKSPACE</span>
        </div>
        {navigation.map(item => renderNavItem(item))}
      </div>
      
      {/* Settings */}
      <div className="p-2 border-t border-notion-border">
        <div className="flex items-center gap-2 px-2 py-1.5 text-notion-text-light hover:bg-notion-hover rounded cursor-pointer">
          <Settings className="w-4 h-4" />
          <span className="text-sm">Settings</span>
        </div>
      </div>
    </div>
  )
}

// Macro Progress Bar
function MacroBar({ 
  label, 
  current, 
  goal, 
  color, 
  unit = 'g' 
}: { 
  label: string
  current: number
  goal: number
  color: string
  unit?: string
}) {
  const percentage = Math.min((current / goal) * 100, 100)
  const isOver = current > goal
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-notion-text-light">{label}</span>
        <span className={isOver ? 'text-red-500 font-medium' : 'text-notion-text'}>
          {current}{unit} / {goal}{unit}
        </span>
      </div>
      <div className="h-2 bg-notion-border rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-300 ${isOver ? 'bg-red-400' : color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// Food Entry Row
function FoodEntryRow({ 
  entry, 
  onDelete 
}: { 
  entry: FoodEntry
  onDelete: (id: string) => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  
  return (
    <div className="flex items-center py-2 px-3 hover:bg-notion-hover rounded group">
      <div className="flex-1">
        <div className="font-medium text-sm">{entry.name}</div>
        <div className="text-xs text-notion-text-light">{entry.time}</div>
      </div>
      <div className="flex items-center gap-4 text-sm text-notion-text-light">
        <span>{entry.calories} cal</span>
        <span>{entry.protein}g P</span>
        <span>{entry.carbs}g C</span>
        <span>{entry.fat}g F</span>
        <button 
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-notion-border rounded"
          onClick={() => onDelete(entry.id)}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// Add Food Modal
function AddFoodModal({ 
  isOpen, 
  onClose, 
  onAdd 
}: { 
  isOpen: boolean
  onClose: () => void
  onAdd: (entry: Omit<FoodEntry, 'id' | 'date'>) => void
}) {
  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }))
  
  if (!isOpen) return null
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !calories) return
    
    onAdd({
      name,
      calories: parseInt(calories) || 0,
      protein: parseInt(protein) || 0,
      carbs: parseInt(carbs) || 0,
      fat: parseInt(fat) || 0,
      time
    })
    
    setName('')
    setCalories('')
    setProtein('')
    setCarbs('')
    setFat('')
    onClose()
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Add Food</h3>
          <button onClick={onClose} className="p-1 hover:bg-notion-hover rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-notion-text-light mb-1">Food name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Chicken salad"
              className="w-full px-3 py-2 border border-notion-border rounded focus:border-notion-accent"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-notion-text-light mb-1">Calories</label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-notion-border rounded focus:border-notion-accent"
              />
            </div>
            <div>
              <label className="block text-sm text-notion-text-light mb-1">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 border border-notion-border rounded focus:border-notion-accent"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-notion-text-light mb-1">Protein (g)</label>
              <input
                type="number"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-notion-border rounded focus:border-notion-accent"
              />
            </div>
            <div>
              <label className="block text-sm text-notion-text-light mb-1">Carbs (g)</label>
              <input
                type="number"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-notion-border rounded focus:border-notion-accent"
              />
            </div>
            <div>
              <label className="block text-sm text-notion-text-light mb-1">Fat (g)</label>
              <input
                type="number"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-notion-border rounded focus:border-notion-accent"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-notion-text-light hover:bg-notion-hover rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-notion-text text-white rounded hover:bg-opacity-90"
            >
              Add Food
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Goals Modal
function GoalsModal({ 
  isOpen, 
  onClose, 
  goals,
  onSave 
}: { 
  isOpen: boolean
  onClose: () => void
  goals: Goals
  onSave: (goals: Goals) => void
}) {
  const [localGoals, setLocalGoals] = useState(goals)
  
  useEffect(() => {
    setLocalGoals(goals)
  }, [goals])
  
  if (!isOpen) return null
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(localGoals)
    onClose()
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Set Daily Goals</h3>
          <button onClick={onClose} className="p-1 hover:bg-notion-hover rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-notion-text-light mb-1">Daily Calories</label>
            <input
              type="number"
              value={localGoals.calories}
              onChange={(e) => setLocalGoals({...localGoals, calories: parseInt(e.target.value) || 0})}
              className="w-full px-3 py-2 border border-notion-border rounded focus:border-notion-accent"
            />
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-notion-text-light mb-1">Protein (g)</label>
              <input
                type="number"
                value={localGoals.protein}
                onChange={(e) => setLocalGoals({...localGoals, protein: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-notion-border rounded focus:border-notion-accent"
              />
            </div>
            <div>
              <label className="block text-sm text-notion-text-light mb-1">Carbs (g)</label>
              <input
                type="number"
                value={localGoals.carbs}
                onChange={(e) => setLocalGoals({...localGoals, carbs: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-notion-border rounded focus:border-notion-accent"
              />
            </div>
            <div>
              <label className="block text-sm text-notion-text-light mb-1">Fat (g)</label>
              <input
                type="number"
                value={localGoals.fat}
                onChange={(e) => setLocalGoals({...localGoals, fat: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-notion-border rounded focus:border-notion-accent"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-notion-text-light hover:bg-notion-hover rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-notion-text text-white rounded hover:bg-opacity-90"
            >
              Save Goals
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Chat Component
function Chat({ context }: { context: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hey! I'm your nutrition assistant. Log what you eat, ask for meal ideas, or just chat about food. What's on your mind?",
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  useEffect(() => {
    scrollToBottom()
  }, [messages])
  
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          context: context
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content || "Sorry, I couldn't process that. Try again?",
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting to the assistant right now. You can still log food manually using the + button above!",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, fallbackMessage])
    }
    
    setIsLoading(false)
  }
  
  return (
    <div className="flex flex-col h-80 border-t border-notion-border">
      <div className="px-4 py-2 border-b border-notion-border bg-notion-sidebar">
        <div className="flex items-center gap-2 text-sm text-notion-text-light">
          <MessageSquare className="w-4 h-4" />
          <span>Nutrition Assistant</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                message.role === 'user'
                  ? 'bg-notion-text text-white'
                  : 'bg-notion-sidebar text-notion-text'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-notion-sidebar text-notion-text-light px-3 py-2 rounded-lg text-sm">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-3 border-t border-notion-border">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Log food or ask a question..."
            className="flex-1 px-3 py-2 border border-notion-border rounded-lg text-sm focus:border-notion-accent"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="p-2 bg-notion-text text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Main Dashboard
function NutritionDashboard() {
  const today = new Date().toISOString().split('T')[0]
  
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([
    {
      id: '1',
      name: 'Oatmeal with banana',
      calories: 350,
      protein: 12,
      carbs: 58,
      fat: 8,
      time: '08:30',
      date: today
    },
    {
      id: '2',
      name: 'Grilled chicken salad',
      calories: 420,
      protein: 35,
      carbs: 15,
      fat: 22,
      time: '13:00',
      date: today
    },
    {
      id: '3',
      name: 'Lentil & grain medley with vegetables',
      calories: 439,
      protein: 33.6,
      carbs: 76.2,
      fat: 1.6,
      time: '21:32',
      date: today
    }
  ])
  
  const [goals, setGoals] = useState<Goals>({
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 65
  })
  
  const [showAddModal, setShowAddModal] = useState(false)
  const [showGoalsModal, setShowGoalsModal] = useState(false)
  
  // Calculate totals
  const todayEntries = foodEntries.filter(e => e.date === today)
  const totals = todayEntries.reduce(
    (acc, entry) => ({
      calories: acc.calories + entry.calories,
      protein: acc.protein + entry.protein,
      carbs: acc.carbs + entry.carbs,
      fat: acc.fat + entry.fat
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )
  
  // Add the photo analysis to totals
  const photoAnalysis = { calories: 439, protein: 33.6, carbs: 76.2, fat: 1.6 }
  const totalsWithPhoto = {
    calories: totals.calories + photoAnalysis.calories,
    protein: totals.protein + photoAnalysis.protein,
    carbs: totals.carbs + photoAnalysis.carbs,
    fat: totals.fat + photoAnalysis.fat
  }
  
  const addFood = (entry: Omit<FoodEntry, 'id' | 'date'>) => {
    const newEntry: FoodEntry = {
      ...entry,
      id: Date.now().toString(),
      date: today
    }
    setFoodEntries(prev => [...prev, newEntry])
  }
  
  const deleteFood = (id: string) => {
    setFoodEntries(prev => prev.filter(e => e.id !== id))
  }
  
  const chatContext = `Today's intake: ${totals.calories} calories, ${totals.protein}g protein, ${totals.carbs}g carbs, ${totals.fat}g fat. Goals: ${goals.calories} cal, ${goals.protein}g protein, ${goals.carbs}g carbs, ${goals.fat}g fat.`
  
  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-notion-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Apple className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Nutrition</h1>
            <p className="text-sm text-notion-text-light">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-6 space-y-6">
          {/* Macros Overview */}
          {/* Food Photo Analysis - Latest Analysis */}
      <div className="bg-white border border-notion-border rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-lg">Latest Food Analysis</h3>
            <p className="text-sm text-notion-text-light">Just now • USDA FoodData Central</p>
          </div>
        </div>
        
        <div className="bg-notion-sidebar rounded-lg p-4">
          <h4 className="font-medium mb-3 text-sm">Detected Foods</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-notion-text">🥄 Lentil and grain medley</span>
              <span className="text-notion-text-light">1.5 cups • 418 cal</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-notion-text">🥕 Mixed vegetables</span>
              <span className="text-notion-text-light">0.5 cups • 21 cal</span>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-notion-border">
            <h5 className="font-medium mb-2 text-sm">Total Nutrition</h5>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-notion-text-light">Calories</span>
                <div className="text-lg font-semibold">439</div>
              </div>
              <div>
                <span className="text-notion-text-light">Protein</span>
                <div className="text-lg font-semibold">33.6g</div>
              </div>
              <div>
                <span className="text-notion-text-light">Carbs</span>
                <div className="text-lg font-semibold">76.2g</div>
              </div>
              <div>
                <span className="text-notion-text-light">Fat</span>
                <div className="text-lg font-semibold">1.6g</div>
              </div>
            </div>
            <div className="mt-2 text-xs text-notion-text-light">
              Confidence: 78% • Database: USDA FoodData Central
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button className="flex-1 bg-notion-text text-white py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors">
            Add to Daily Log
          </button>
          <button className="px-4 py-2 border border-notion-border rounded-lg hover:bg-notion-hover transition-colors">
            Upload New Photo
          </button>
        </div>
      </div>

      <div className="bg-notion-sidebar rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Daily Progress</h2>
              <button 
                onClick={() => setShowGoalsModal(true)}
                className="text-sm text-notion-accent hover:underline"
              >
                Edit goals
              </button>
            </div>
            
            <div className="space-y-4">
              <MacroBar 
                label="Calories" 
                current={totalsWithPhoto.calories} 
                goal={goals.calories} 
                color="bg-orange-400"
                unit=" kcal"
              />
              <MacroBar 
                label="Protein" 
                current={totalsWithPhoto.protein} 
                goal={goals.protein} 
                color="bg-red-400"
              />
              <MacroBar 
                label="Carbs" 
                current={totalsWithPhoto.carbs} 
                goal={goals.carbs} 
                color="bg-yellow-400"
              />
              <MacroBar 
                label="Fat" 
                current={totalsWithPhoto.fat} 
                goal={goals.fat} 
                color="bg-blue-400"
              />
            </div>
            
            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-3 mt-5">
              <div className="bg-white rounded-lg p-3 text-center">
                <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                <div className="text-lg font-bold">{totalsWithPhoto.calories}</div>
                <div className="text-xs text-notion-text-light">kcal</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <Beef className="w-5 h-5 text-red-500 mx-auto mb-1" />
                <div className="text-lg font-bold">{totalsWithPhoto.protein.toFixed(1)}g</div>
                <div className="text-xs text-notion-text-light">protein</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <Wheat className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                <div className="text-lg font-bold">{totalsWithPhoto.carbs.toFixed(1)}g</div>
                <div className="text-xs text-notion-text-light">carbs</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <Target className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <div className="text-lg font-bold">{totalsWithPhoto.fat.toFixed(1)}g</div>
                <div className="text-xs text-notion-text-light">fat</div>
              </div>
            </div>
          </div>
          
          {/* Food Log */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Food Log</h2>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-notion-text text-white rounded hover:bg-opacity-90"
              >
                <Plus className="w-4 h-4" />
                Add food
              </button>
            </div>
            
            <div className="bg-white border border-notion-border rounded-lg divide-y divide-notion-border">
              {todayEntries.length > 0 ? (
                todayEntries.map(entry => (
                  <FoodEntryRow key={entry.id} entry={entry} onDelete={deleteFood} />
                ))
              ) : (
                <div className="p-8 text-center text-notion-text-light">
                  <Utensils className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No food logged today</p>
                  <p className="text-sm">Click "Add food" or use the chat below</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Chat */}
      <Chat context={chatContext} />
      
      {/* Modals */}
      <AddFoodModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        onAdd={addFood}
      />
      <GoalsModal
        isOpen={showGoalsModal}
        onClose={() => setShowGoalsModal(false)}
        goals={goals}
        onSave={setGoals}
      />
    </div>
  )
}

// Main Page
export default function Home() {
  const [activeItem, setActiveItem] = useState('nutrition-today')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['nutrition']))
  
  const navigation: NavItem[] = [
    {
      id: 'nutrition',
      name: 'Nutrition',
      icon: <Apple className="w-4 h-4" />,
      type: 'folder',
      children: [
        {
          id: 'nutrition-today',
          name: 'Today',
          type: 'page',
        },
        {
          id: 'nutrition-history',
          name: 'History',
          type: 'page',
        },
        {
          id: 'nutrition-recipes',
          name: 'Recipes',
          type: 'folder',
          children: [
            { id: 'recipes-breakfast', name: 'Breakfast', type: 'page' },
            { id: 'recipes-lunch', name: 'Lunch', type: 'page' },
            { id: 'recipes-dinner', name: 'Dinner', type: 'page' },
          ]
        },
        {
          id: 'nutrition-goals',
          name: 'Goals & Settings',
          type: 'page',
        }
      ]
    },
    {
      id: 'coach',
      name: 'Coach',
      icon: <Target className="w-4 h-4" />,
      type: 'folder',
      children: [
        { id: 'coach-goals', name: 'Goals', type: 'page' },
        { id: 'coach-habits', name: 'Habits', type: 'page' },
      ]
    },
    {
      id: 'assistant',
      name: 'Assistant',
      icon: <MessageSquare className="w-4 h-4" />,
      type: 'folder',
      children: [
        { id: 'assistant-tasks', name: 'Tasks', type: 'page' },
        { id: 'assistant-reminders', name: 'Reminders', type: 'page' },
      ]
    }
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
    <div className="flex h-screen">
      <Sidebar 
        navigation={navigation}
        activeItem={activeItem}
        setActiveItem={setActiveItem}
        expandedFolders={expandedFolders}
        toggleFolder={toggleFolder}
      />
      <NutritionDashboard />
    </div>
  )
}
