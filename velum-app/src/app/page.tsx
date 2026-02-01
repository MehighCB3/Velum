'use client'
// Version: 2026-02-01-v2 - Force cache bust

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
  Trash2,
  X,
  Loader2,
  RefreshCw
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
          <div className="w-6 h-6 bg-gradient-to-br from-orange-400 to-pink-500 rounded flex items-center justify-center text-white text-xs font-bold">
            V
          </div>
          <span className="font-medium text-sm">Velum</span>
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
          {Math.round(current)}{unit} / {goal}{unit}
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
  return (
    <div className="flex items-center py-3 px-3 hover:bg-notion-hover rounded group border-b border-notion-border last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{entry.name}</div>
        <div className="text-xs text-notion-text-light">{entry.time}</div>
      </div>
      <div className="flex items-center gap-3 sm:gap-4 text-sm text-notion-text-light flex-shrink-0">
        <span className="w-14 text-right">{Math.round(entry.calories)} cal</span>
        <span className="w-12 text-right hidden sm:inline">{entry.protein}g P</span>
        <span className="w-12 text-right hidden sm:inline">{entry.carbs}g C</span>
        <span className="w-12 text-right hidden sm:inline">{entry.fat}g F</span>
        <button 
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-notion-border rounded transition-opacity"
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
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }))
  
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 m-4">
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
              className="w-full px-3 py-2 border border-notion-border rounded focus:border-notion-accent focus:outline-none"
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
                className="w-full px-3 py-2 border border-notion-border rounded focus:border-notion-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-notion-text-light mb-1">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 border border-notion-border rounded focus:border-notion-accent focus:outline-none"
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
                className="w-full px-3 py-2 border border-notion-border rounded focus:border-notion-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-notion-text-light mb-1">Carbs (g)</label>
              <input
                type="number"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-notion-border rounded focus:border-notion-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-notion-text-light mb-1">Fat (g)</label>
              <input
                type="number"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-notion-border rounded focus:border-notion-accent focus:outline-none"
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
  goals: { calories: number; protein: number; carbs: number; fat: number }
  onSave: (goals: { calories: number; protein: number; carbs: number; fat: number }) => void
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 m-4">
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
              className="w-full px-3 py-2 border border-notion-border rounded focus:border-notion-accent focus:outline-none"
            />
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-notion-text-light mb-1">Protein (g)</label>
              <input
                type="number"
                value={localGoals.protein}
                onChange={(e) => setLocalGoals({...localGoals, protein: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-notion-border rounded focus:border-notion-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-notion-text-light mb-1">Carbs (g)</label>
              <input
                type="number"
                value={localGoals.carbs}
                onChange={(e) => setLocalGoals({...localGoals, carbs: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-notion-border rounded focus:border-notion-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-notion-text-light mb-1">Fat (g)</label>
              <input
                type="number"
                value={localGoals.fat}
                onChange={(e) => setLocalGoals({...localGoals, fat: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-notion-border rounded focus:border-notion-accent focus:outline-none"
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
function Chat({ context, onFoodLogged }: { context: string; onFoodLogged: () => void }) {
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
      
      // Refresh data in case food was logged via chat
      onFoodLogged()
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
            className="flex-1 px-3 py-2 border border-notion-border rounded-lg text-sm focus:border-notion-accent focus:outline-none"
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
  
  // VERSION MARKER - If you see this banner, new UI is deployed
  console.log('VELUM UI VERSION: 2026-02-01-V4-NEW-UI-DEPLOYED')
  
  const [nutritionData, setNutritionData] = useState<NutritionData>({
    date: today,
    entries: [],
    totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    goals: { calories: 2000, protein: 150, carbs: 200, fat: 65 }
  })
  
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showGoalsModal, setShowGoalsModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Fetch nutrition data from API
  const fetchData = async () => {
    try {
      setIsRefreshing(true)
      setError(null)
      
      const response = await fetch(`/api/nutrition?date=${today}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch nutrition data')
      }
      
      const data = await response.json()
      setNutritionData(data)
    } catch (err) {
      console.error('Error fetching nutrition data:', err)
      setError('Failed to load nutrition data')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }
  
  // Initial load
  useEffect(() => {
    fetchData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [today])
  
  // Add food entry via API
  const addFood = async (entry: Omit<FoodEntry, 'id' | 'date'>) => {
    try {
      const response = await fetch('/api/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today,
          ...entry
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to add food entry')
      }
      
      const data = await response.json()
      setNutritionData(data)
    } catch (err) {
      console.error('Error adding food:', err)
      setError('Failed to add food entry')
    }
  }
  
  // Delete food entry via API
  const deleteFood = async (id: string) => {
    try {
      const response = await fetch(`/api/nutrition?date=${today}&entryId=${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete food entry')
      }
      
      const data = await response.json()
      setNutritionData(prev => ({
        ...prev,
        entries: data.entries,
        totals: data.totals
      }))
    } catch (err) {
      console.error('Error deleting food:', err)
      setError('Failed to delete food entry')
    }
  }
  
  // Update goals via API
  const updateGoals = async (newGoals: { calories: number; protein: number; carbs: number; fat: number }) => {
    try {
      const response = await fetch('/api/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today,
          goals: newGoals,
          entries: nutritionData.entries,
          totals: nutritionData.totals
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update goals')
      }
      
      const data = await response.json()
      setNutritionData(prev => ({ ...prev, goals: newGoals }))
    } catch (err) {
      console.error('Error updating goals:', err)
      setError('Failed to update goals')
    }
  }
  
  const chatContext = `Today's intake: ${Math.round(nutritionData.totals.calories)} calories, ${Math.round(nutritionData.totals.protein)}g protein, ${Math.round(nutritionData.totals.carbs)}g carbs, ${Math.round(nutritionData.totals.fat)}g fat. Goals: ${nutritionData.goals.calories} cal, ${nutritionData.goals.protein}g protein, ${nutritionData.goals.carbs}g carbs, ${nutritionData.goals.fat}g fat.`
  
  const { entries, totals, goals } = nutritionData
  
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-notion-text-light" />
      </div>
    )
  }
  
  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-notion-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Apple className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Nutrition</h1>
              <p className="text-sm text-notion-text-light">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <button
            onClick={fetchData}
            disabled={isRefreshing}
            className="p-2 hover:bg-notion-hover rounded-lg transition-colors"
            title="Refresh data"
          >
            <RefreshCw className={`w-5 h-5 text-notion-text-light ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}
        
        {/* VERSION BANNER - New UI confirmation */}
        <div className="mt-2 p-2 bg-blue-100 border border-blue-300 rounded text-xs text-blue-800 text-center">
          ✓ NEW UI DEPLOYED - V4 - Postgres Active
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 sm:px-8 py-4 sm:py-6 space-y-6">
          {/* Macros Overview */}
          <div className="bg-notion-sidebar rounded-lg p-4 sm:p-5">
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
                current={totals.calories} 
                goal={goals.calories} 
                color="bg-orange-400"
                unit=" kcal"
              />
              <MacroBar 
                label="Protein" 
                current={totals.protein} 
                goal={goals.protein} 
                color="bg-red-400"
              />
              <MacroBar 
                label="Carbs" 
                current={totals.carbs} 
                goal={goals.carbs} 
                color="bg-yellow-400"
              />
              <MacroBar 
                label="Fat" 
                current={totals.fat} 
                goal={goals.fat} 
                color="bg-blue-400"
              />
            </div>
            
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-5">
              <div className="bg-white rounded-lg p-3 text-center">
                <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                <div className="text-lg font-bold">{Math.round(totals.calories)}</div>
                <div className="text-xs text-notion-text-light">kcal</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <Beef className="w-5 h-5 text-red-500 mx-auto mb-1" />
                <div className="text-lg font-bold">{Math.round(totals.protein)}g</div>
                <div className="text-xs text-notion-text-light">protein</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <Wheat className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                <div className="text-lg font-bold">{Math.round(totals.carbs)}g</div>
                <div className="text-xs text-notion-text-light">carbs</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <Target className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <div className="text-lg font-bold">{Math.round(totals.fat)}g</div>
                <div className="text-xs text-notion-text-light">fat</div>
              </div>
            </div>
          </div>
          
          {/* Food Log */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-semibold">Food Log</h2>
                <p className="text-xs text-notion-text-light">
                  {entries.length} {entries.length === 1 ? 'meal' : 'meals'} logged today
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-notion-text text-white rounded hover:bg-opacity-90"
              >
                <Plus className="w-4 h-4" />
                Add food
              </button>
            </div>
            
            <div className="bg-white border border-notion-border rounded-lg overflow-hidden">
              {entries.length > 0 ? (
                entries.map(entry => (
                  <FoodEntryRow key={entry.id} entry={entry} onDelete={deleteFood} />
                ))
              ) : (
                <div className="p-8 text-center text-notion-text-light">
                  <Utensils className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No food logged today</p>
                  <p className="text-sm">Click &quot;Add food&quot; or use the chat below</p>
                </div>
              )}
            </div>
            
            {/* Totals row */}
            {entries.length > 0 && (
              <div className="mt-3 p-3 bg-notion-sidebar rounded-lg">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium">Daily Total</span>
                  <div className="flex gap-4 text-notion-text-light">
                    <span>{Math.round(totals.calories)} cal</span>
                    <span className="hidden sm:inline">{Math.round(totals.protein)}g P</span>
                    <span className="hidden sm:inline">{Math.round(totals.carbs)}g C</span>
                    <span className="hidden sm:inline">{Math.round(totals.fat)}g F</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Chat */}
      <Chat context={chatContext} onFoodLogged={fetchData} />
      
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
        onSave={updateGoals}
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
