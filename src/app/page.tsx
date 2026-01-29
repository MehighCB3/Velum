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
  X,
  Image,
  Clock
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
  photo?: string
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

// Compact Progress Widget
function CompactProgress({
  totals,
  goals,
  onEditGoals
}: {
  totals: { calories: number; protein: number; carbs: number; fat: number }
  goals: Goals
  onEditGoals: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const caloriePercent = Math.min((totals.calories / goals.calories) * 100, 100)

  return (
    <div className="bg-notion-sidebar rounded-lg p-4">
      {/* Main calorie display */}
      <div className="flex items-center gap-4">
        {/* Circular progress */}
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg className="w-20 h-20 transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="35"
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              className="text-notion-border"
            />
            <circle
              cx="40"
              cy="40"
              r="35"
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              strokeDasharray={`${caloriePercent * 2.2} 220`}
              strokeLinecap="round"
              className="text-orange-400"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold">{totals.calories}</span>
            <span className="text-xs text-notion-text-light">kcal</span>
          </div>
        </div>

        {/* Summary */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium">Daily Progress</span>
            <button
              onClick={onEditGoals}
              className="text-xs text-notion-accent hover:underline"
            >
              Edit
            </button>
          </div>
          <p className="text-sm text-notion-text-light mb-2">
            {goals.calories - totals.calories > 0
              ? `${goals.calories - totals.calories} kcal remaining`
              : `${totals.calories - goals.calories} kcal over goal`}
          </p>
          {/* Macro pills */}
          <div className="flex gap-2">
            <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs font-medium">
              {totals.protein}g P
            </span>
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-600 rounded-full text-xs font-medium">
              {totals.carbs}g C
            </span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
              {totals.fat}g F
            </span>
          </div>
        </div>

        {/* Expand button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 hover:bg-notion-hover rounded text-notion-text-light"
        >
          {expanded ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Expanded macro details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-notion-border space-y-3">
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
      )}
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

// Food Card Component
function FoodCard({
  entry,
  onDelete
}: {
  entry: FoodEntry
  onDelete: (id: string) => void
}) {
  return (
    <div className="bg-white border border-notion-border rounded-lg overflow-hidden hover:shadow-md transition-shadow group">
      {/* Photo area */}
      <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative">
        {entry.photo ? (
          <img src={entry.photo} alt={entry.name} className="w-full h-full object-cover" />
        ) : (
          <div className="text-gray-400">
            <Image className="w-10 h-10" />
          </div>
        )}
        <button
          onClick={() => onDelete(entry.id)}
          className="absolute top-2 right-2 p-1.5 bg-white/80 hover:bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>
      {/* Content */}
      <div className="p-3">
        <div className="font-medium text-sm mb-1">{entry.name}</div>
        <div className="flex items-center gap-1 text-xs text-notion-text-light mb-2">
          <Clock className="w-3 h-3" />
          <span>{entry.time}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-orange-500">{entry.calories}</span>
          <span className="text-xs text-notion-text-light">kcal</span>
        </div>
        <div className="flex gap-2 mt-2 text-xs text-notion-text-light">
          <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded">{entry.protein}g P</span>
          <span className="px-1.5 py-0.5 bg-yellow-50 text-yellow-600 rounded">{entry.carbs}g C</span>
          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">{entry.fat}g F</span>
        </div>
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

// Get or create user ID for session persistence
function getUserId(): string {
  if (typeof window === 'undefined') return 'anonymous'
  let userId = localStorage.getItem('velum-user-id')
  if (!userId) {
    userId = crypto.randomUUID()
    localStorage.setItem('velum-user-id', userId)
  }
  return userId
}

// Chat Component with streaming support
function Chat({ context }: { context: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hey! I'm Archie, your personal assistant. I can help with nutrition tracking, meal ideas, or anything else. What's on your mind?",
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    // Build conversation history for context
    const conversationHistory = messages.map(m => ({
      role: m.role,
      content: m.content
    }))

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setStreamingContent('')

    try {
      const userId = getUserId()

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          messages: [
            // Include context as system message
            { role: 'system', content: `Current nutrition context: ${context}` },
            ...conversationHistory,
            { role: 'user', content: input }
          ]
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get response')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const json = JSON.parse(line.slice(6))
              const content = json.choices?.[0]?.delta?.content
              if (content) {
                fullContent += content
                setStreamingContent(fullContent)
              }
            } catch {
              // Skip invalid JSON lines
            }
          }
        }
      }

      // Add completed message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fullContent || "Sorry, I couldn't process that. Try again?",
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
      setStreamingContent('')
    } catch (error) {
      console.error('Chat error:', error)
      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. You can still log food manually using the + button above!",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, fallbackMessage])
      setStreamingContent('')
    }

    setIsLoading(false)
  }
  
  return (
    <div className="border-t border-notion-border bg-notion-sidebar/50">
      <div className="max-w-2xl mx-auto">
        {/* Compact header */}
        <div className="px-4 py-2 flex items-center justify-center gap-2 text-xs text-notion-text-light border-b border-notion-border/50">
          <MessageSquare className="w-3 h-3" />
          <span>Chat with Archie</span>
        </div>

        {/* Messages - compact scrollable area */}
        <div className="h-48 overflow-y-auto px-4 py-2 space-y-2">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-3 py-1.5 rounded-2xl text-sm ${
                  message.role === 'user'
                    ? 'bg-notion-text text-white'
                    : 'bg-white text-notion-text border border-notion-border'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          {(isLoading || streamingContent) && (
            <div className="flex justify-start">
              <div className="bg-white text-notion-text px-3 py-1.5 rounded-2xl text-sm border border-notion-border">
                {streamingContent || <span className="animate-pulse text-notion-text-light">...</span>}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input - compact */}
        <div className="px-4 py-2 border-t border-notion-border/50">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask Archie anything..."
              className="flex-1 px-3 py-1.5 border border-notion-border rounded-full text-sm focus:border-notion-accent focus:outline-none bg-white"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="p-1.5 bg-notion-text text-white rounded-full hover:bg-opacity-90 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
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
          {/* Compact Daily Progress */}
          <CompactProgress
            totals={totals}
            goals={goals}
            onEditGoals={() => setShowGoalsModal(true)}
          />
          
          {/* Food Log */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Food Log</h2>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-notion-text text-white rounded-full hover:bg-opacity-90"
              >
                <Plus className="w-4 h-4" />
                Add food
              </button>
            </div>

            {todayEntries.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {todayEntries.map(entry => (
                  <FoodCard key={entry.id} entry={entry} onDelete={deleteFood} />
                ))}
              </div>
            ) : (
              <div className="bg-white border border-notion-border rounded-lg p-8 text-center text-notion-text-light">
                <Utensils className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No food logged today</p>
                <p className="text-sm">Click "Add food" or use the chat below</p>
              </div>
            )}
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
