"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Search, LayoutDashboard, History, BarChart3, Target, User, Bot,
  Plus, Send, Camera, ChevronRight, Sparkles, X, Flame, Trash2,
  Loader2, RefreshCw, Utensils, ChevronDown, Settings, Apple,
  Calendar, TrendingUp, ChevronLeft
} from 'lucide-react';

// Types
interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  time: string;
  date: string;
}

interface NutritionData {
  date: string;
  entries: FoodEntry[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  goals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface DayData {
  date: string;
  entries: FoodEntry[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

// Add Food Modal
function AddFoodModal({
  isOpen,
  onClose,
  onAdd
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (entry: Omit<FoodEntry, 'id' | 'date'>) => void;
}) {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !calories) return;

    onAdd({
      name,
      calories: parseInt(calories) || 0,
      protein: parseInt(protein) || 0,
      carbs: parseInt(carbs) || 0,
      fat: parseInt(fat) || 0,
      time
    });

    setName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 m-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-stone-900">Add Food</h3>
          <button onClick={onClose} className="p-1 hover:bg-stone-100 rounded-lg">
            <X className="w-5 h-5 text-stone-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-stone-500 mb-1">Food name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Chicken salad"
              className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-stone-500 mb-1">Calories</label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-500 mb-1">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-stone-500 mb-1">Protein (g)</label>
              <input
                type="number"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-500 mb-1">Carbs (g)</label>
              <input
                type="number"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-500 mb-1">Fat (g)</label>
              <input
                type="number"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-stone-500 hover:bg-stone-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-stone-900 text-white rounded-lg hover:bg-stone-800"
            >
              Add Food
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Goals Modal
function GoalsModal({
  isOpen,
  onClose,
  goals,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  goals: { calories: number; protein: number; carbs: number; fat: number };
  onSave: (goals: { calories: number; protein: number; carbs: number; fat: number }) => void;
}) {
  const [localGoals, setLocalGoals] = useState(goals);

  useEffect(() => {
    setLocalGoals(goals);
  }, [goals, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(localGoals);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 m-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-stone-900">Set Daily Goals</h3>
          <button onClick={onClose} className="p-1 hover:bg-stone-100 rounded-lg">
            <X className="w-5 h-5 text-stone-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-stone-500 mb-1">Daily Calories</label>
            <input
              type="number"
              value={localGoals.calories}
              onChange={(e) => setLocalGoals({ ...localGoals, calories: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-stone-500 mb-1">Protein (g)</label>
              <input
                type="number"
                value={localGoals.protein}
                onChange={(e) => setLocalGoals({ ...localGoals, protein: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-500 mb-1">Carbs (g)</label>
              <input
                type="number"
                value={localGoals.carbs}
                onChange={(e) => setLocalGoals({ ...localGoals, carbs: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-500 mb-1">Fat (g)</label>
              <input
                type="number"
                value={localGoals.fat}
                onChange={(e) => setLocalGoals({ ...localGoals, fat: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-stone-500 hover:bg-stone-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-stone-900 text-white rounded-lg hover:bg-stone-800"
            >
              Save Goals
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VelumApp() {
  const today = new Date().toISOString().split('T')[0];
  const [activeView, setActiveView] = useState<'today' | 'history' | 'analytics' | 'goals' | 'coach' | 'assistant'>('today');
  const [expandedSections, setExpandedSections] = useState({
    nutrition: true,
    coach: false,
    assistant: false
  });
  const [historyDays, setHistoryDays] = useState<DayData[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [message, setMessage] = useState('');
  const [chatOpen, setChatOpen] = useState(true);
  const [chatMessages, setChatMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hey! I'm Archie, your nutrition coach. Log what you eat, ask for meal ideas, or just chat about food. What's on your mind?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nutritionData, setNutritionData] = useState<NutritionData>({
    date: today,
    entries: [],
    totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    goals: { calories: 2000, protein: 150, carbs: 200, fat: 65 }
  });

  const [isLoadingData, setIsLoadingData] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Animated progress
  const progress = Math.round((nutritionData.totals.calories / nutritionData.goals.calories) * 100);
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedProgress(progress), 100);
    return () => clearTimeout(timer);
  }, [progress]);

  const remaining = Math.max(nutritionData.goals.calories - nutritionData.totals.calories, 0);

  // Fetch nutrition data
  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      const response = await fetch(`/api/nutrition?date=${today}`);

      if (!response.ok) {
        throw new Error('Failed to fetch nutrition data');
      }

      const data = await response.json();
      setNutritionData(data);
    } catch (err) {
      console.error('Error fetching nutrition data:', err);
      setError('Failed to load nutrition data');
    } finally {
      setIsLoadingData(false);
      setIsRefreshing(false);
    }
  };

  // Fetch 7-day history
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const days: DayData[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const response = await fetch(`/api/nutrition?date=${dateStr}`);
        if (response.ok) {
          const data = await response.json();
          days.push({
            date: dateStr,
            entries: data.entries || [],
            totals: data.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 }
          });
        }
      }
      setHistoryDays(days);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [today]);

  // Load history when view changes
  useEffect(() => {
    if (activeView === 'history' && historyDays.length === 0) {
      fetchHistory();
    }
  }, [activeView]);

  // Add food entry
  const addFood = async (entry: Omit<FoodEntry, 'id' | 'date'>) => {
    try {
      const response = await fetch('/api/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today,
          ...entry
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add food entry');
      }

      const data = await response.json();
      setNutritionData(data);
    } catch (err) {
      console.error('Error adding food:', err);
      setError('Failed to add food entry');
    }
  };

  // Delete food entry
  const deleteFood = async (id: string) => {
    try {
      const response = await fetch(`/api/nutrition?date=${today}&entryId=${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete food entry');
      }

      const data = await response.json();
      setNutritionData(prev => ({
        ...prev,
        entries: data.entries,
        totals: data.totals
      }));
    } catch (err) {
      console.error('Error deleting food:', err);
      setError('Failed to delete food entry');
    }
  };

  // Update goals
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
      });

      if (!response.ok) {
        throw new Error('Failed to update goals');
      }

      setNutritionData(prev => ({ ...prev, goals: newGoals }));
    } catch (err) {
      console.error('Error updating goals:', err);
      setError('Failed to update goals');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message;
    setMessage('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userMessage }],
          section: 'nutrition'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply || "Sorry, I couldn't process that. Try again?" }]);

      // Refresh data in case food was logged via chat
      fetchData();
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting right now. You can still log food manually!" }]);
    }

    setIsLoading(false);
  };

  // Get meal emoji based on name
  const getMealEmoji = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('oat') || lower.includes('cereal') || lower.includes('pancake')) return '🥣';
    if (lower.includes('chicken') || lower.includes('meat') || lower.includes('beef')) return '🍗';
    if (lower.includes('salad') || lower.includes('vegetable') || lower.includes('greens')) return '🥗';
    if (lower.includes('sandwich') || lower.includes('bread') || lower.includes('toast')) return '🥪';
    if (lower.includes('pizza')) return '🍕';
    if (lower.includes('burger')) return '🍔';
    if (lower.includes('pasta') || lower.includes('noodle')) return '🍝';
    if (lower.includes('rice')) return '🍚';
    if (lower.includes('fish') || lower.includes('sushi')) return '🐟';
    if (lower.includes('egg')) return '🥚';
    if (lower.includes('fruit') || lower.includes('apple') || lower.includes('banana')) return '🍎';
    if (lower.includes('coffee') || lower.includes('tea')) return '☕';
    if (lower.includes('smoothie') || lower.includes('shake')) return '🥤';
    if (lower.includes('snack') || lower.includes('chip') || lower.includes('cracker')) return '🍿';
    if (lower.includes('chocolate') || lower.includes('candy') || lower.includes('sweet')) return '🍫';
    if (lower.includes('ice cream')) return '🍦';
    return '🍽️';
  };

  // Get meal type based on time
  const getMealType = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour < 11) return 'Breakfast';
    if (hour < 15) return 'Lunch';
    if (hour < 18) return 'Snack';
    return 'Dinner';
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split('T')[0]) return 'Today';
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Calculate weekly averages
  const weeklyAverages = historyDays.length > 0 ? {
    calories: Math.round(historyDays.reduce((acc, day) => acc + day.totals.calories, 0) / historyDays.length),
    protein: Math.round(historyDays.reduce((acc, day) => acc + day.totals.protein, 0) / historyDays.length),
    carbs: Math.round(historyDays.reduce((acc, day) => acc + day.totals.carbs, 0) / historyDays.length),
    fat: Math.round(historyDays.reduce((acc, day) => acc + day.totals.fat, 0) / historyDays.length),
  } : { calories: 0, protein: 0, carbs: 0, fat: 0 };

  // Toggle section expansion
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (isLoadingData) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  const { entries, totals, goals } = nutritionData;

  return (
    <div className="flex h-screen font-sans antialiased bg-stone-50 text-stone-900">
      {/* Notion-like Sidebar */}
      <nav className="w-64 bg-white border-r border-stone-200 flex flex-col py-4 overflow-y-auto">
        {/* Header */}
        <div className="px-4 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-pink-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/25">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-semibold text-stone-900">Archie</span>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 mb-4">
          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-500 bg-stone-50 hover:bg-stone-100 rounded-lg transition-colors">
            <Search size={16} />
            <span>Search</span>
            <span className="ml-auto text-xs text-stone-400">⌘K</span>
          </button>
        </div>

        {/* SPACE Header */}
        <div className="px-4 mb-2">
          <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">SPACE</span>
        </div>

        {/* Nutrition Section */}
        <div className="mb-2">
          <button
            onClick={() => toggleSection('nutrition')}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <ChevronDown size={16} className={`transition-transform ${expandedSections.nutrition ? '' : '-rotate-90'}`} />
            <Apple size={16} className="text-orange-500" />
            <span>Nutrition</span>
          </button>

          {expandedSections.nutrition && (
            <div className="ml-4 mt-1">
              <NavItem
                icon={LayoutDashboard}
                label="Today"
                active={activeView === 'today'}
                onClick={() => setActiveView('today')}
                indent
              />
              <NavItem
                icon={History}
                label="History"
                active={activeView === 'history'}
                onClick={() => setActiveView('history')}
                indent
              />
              <NavItem
                icon={BarChart3}
                label="Analytics"
                active={activeView === 'analytics'}
                onClick={() => setActiveView('analytics')}
                indent
              />
              <NavItem
                icon={Target}
                label="Goals & Settings"
                active={activeView === 'goals'}
                onClick={() => setActiveView('goals')}
                indent
              />
            </div>
          )}
        </div>

        {/* Coach Section */}
        <div className="mb-2">
          <button
            onClick={() => toggleSection('coach')}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <ChevronDown size={16} className={`transition-transform ${expandedSections.coach ? '' : '-rotate-90'}`} />
            <User size={16} className="text-violet-500" />
            <span>Coach</span>
          </button>

          {expandedSections.coach && (
            <div className="ml-4 mt-1">
              <NavItem
                icon={Sparkles}
                label="Daily Check-in"
                active={activeView === 'coach'}
                onClick={() => setActiveView('coach')}
                indent
              />
            </div>
          )}
        </div>

        {/* Assistant Section */}
        <div className="mb-2">
          <button
            onClick={() => toggleSection('assistant')}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <ChevronDown size={16} className={`transition-transform ${expandedSections.assistant ? '' : '-rotate-90'}`} />
            <Bot size={16} className="text-blue-500" />
            <span>Assistant</span>
          </button>

          {expandedSections.assistant && (
            <div className="ml-4 mt-1">
              <NavItem
                icon={Bot}
                label="Chat with Archie"
                active={activeView === 'assistant'}
                onClick={() => {
                  setActiveView('assistant');
                  setChatOpen(true);
                }}
                indent
              />
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Settings at bottom */}
        <div className="px-4 pt-4 border-t border-stone-100">
          <NavItem
            icon={Settings}
            label="Settings"
            onClick={() => setActiveView('goals')}
          />
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-stone-100 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            {activeView === 'history' && (
              <button
                onClick={() => setActiveView('today')}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={18} className="text-stone-500" />
              </button>
            )}
            <div>
              <h1 className="text-lg font-semibold text-stone-900">
                {activeView === 'today' && 'Today'}
                {activeView === 'history' && 'Past 7 Days'}
                {activeView === 'analytics' && 'Analytics'}
                {activeView === 'goals' && 'Goals & Settings'}
                {activeView === 'coach' && 'Coach'}
                {activeView === 'assistant' && 'Assistant'}
              </h1>
              <p className="text-xs text-stone-400">
                {activeView === 'today' && new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                {activeView === 'history' && 'Weekly overview and trends'}
                {activeView === 'analytics' && 'Insights and patterns'}
                {activeView === 'goals' && 'Customize your targets'}
                {activeView === 'coach' && 'Your personal nutrition coach'}
                {activeView === 'assistant' && 'AI-powered assistance'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeView === 'today' && (
              <>
                <button
                  onClick={fetchData}
                  disabled={isRefreshing}
                  className="h-10 w-10 rounded-xl flex items-center justify-center bg-stone-100 text-stone-500 hover:bg-stone-200 transition-colors"
                  title="Refresh data"
                >
                  <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setChatOpen(!chatOpen)}
                  className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${chatOpen ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
                >
                  <Bot size={18} />
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="h-10 px-5 bg-stone-900 text-white rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-stone-800"
                >
                  <Plus size={16} strokeWidth={2.5} />
                  Log food
                </button>
              </>
            )}
            {activeView === 'goals' && (
              <button
                onClick={() => setShowGoalsModal(true)}
                className="h-10 px-5 bg-stone-900 text-white rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-stone-800"
              >
                <Settings size={16} />
                Edit Goals
              </button>
            )}
          </div>
        </header>

        {error && (
          <div className="px-8 py-2 bg-red-50 border-b border-red-100">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          {/* Main Content Area */}
          <div className="flex-1 p-8 overflow-auto">
            <div className="max-w-4xl mx-auto">
              {/* TODAY VIEW */}
              {activeView === 'today' && (
                <>
                  {/* Hero Stats Card - Dark */}
                  <div className="relative bg-gradient-to-br from-stone-900 to-stone-800 rounded-3xl p-6 mb-6 overflow-hidden">
                    <div className="absolute inset-0 overflow-hidden">
                      <div className="absolute -top-24 -right-24 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />
                      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl" />
                    </div>
                    <div className="relative">
                      <div className="flex items-center gap-6 mb-6">
                        <div className="relative w-28 h-28 flex-shrink-0">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-stone-700" />
                            <circle
                              cx="50"
                              cy="50"
                              r="42"
                              fill="none"
                              stroke="url(#ringGradient)"
                              strokeWidth="8"
                              strokeLinecap="round"
                              strokeDasharray={`${animatedProgress * 2.64} 264`}
                              className="transition-all duration-1000 ease-out"
                            />
                            <defs>
                              <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#f97316" />
                                <stop offset="100%" stopColor="#ec4899" />
                              </linearGradient>
                            </defs>
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-white">{Math.round(totals.calories)}</span>
                            <span className="text-[10px] text-stone-400 uppercase tracking-wide">kcal</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-stone-400 mb-1">Remaining</p>
                          <p className="text-4xl font-bold text-white">{remaining}</p>
                          <p className="text-sm text-stone-500">of {goals.calories} kcal goal</p>
                        </div>
                      </div>
                      <div className="h-px bg-stone-700 mb-5" />
                      <div className="grid grid-cols-2 gap-6">
                        <MacroStat label="Protein" current={totals.protein} goal={goals.protein} color="from-amber-500 to-orange-500" />
                        <MacroStat label="Carbs" current={totals.carbs} goal={goals.carbs} color="from-emerald-500 to-teal-500" />
                      </div>
                      <button
                        onClick={() => setShowGoalsModal(true)}
                        className="absolute top-0 right-0 text-xs text-stone-500 hover:text-stone-300 transition-colors"
                      >
                        Edit goals
                      </button>
                    </div>
                  </div>

                  {/* Meals */}
                  <div>
                    <h2 className="text-sm font-semibold text-stone-900 mb-4">
                      Meals
                      <span className="ml-2 text-xs text-stone-400 font-normal">
                        ({entries.length} {entries.length === 1 ? 'meal' : 'meals'} logged)
                      </span>
                    </h2>
                    <div className="space-y-3">
                      {entries.length > 0 ? (
                        entries.map((entry) => (
                          <MealCard
                            key={entry.id}
                            type={getMealType(entry.time)}
                            name={entry.name}
                            time={entry.time}
                            kcal={Math.round(entry.calories)}
                            emoji={getMealEmoji(entry.name)}
                            onDelete={() => deleteFood(entry.id)}
                          />
                        ))
                      ) : (
                        <div className="p-8 text-center bg-white border border-stone-100 rounded-2xl">
                          <Utensils className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                          <p className="text-sm text-stone-400">No food logged today</p>
                          <p className="text-xs text-stone-300 mt-1">Click &quot;Log food&quot; to add a meal</p>
                        </div>
                      )}
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="w-full p-4 border-2 border-dashed border-stone-200 rounded-2xl hover:border-stone-300 hover:bg-stone-50 transition-all group"
                      >
                        <div className="flex items-center justify-center gap-2 text-stone-400 group-hover:text-stone-600">
                          <Plus size={18} />
                          <span className="text-sm font-medium">Add meal</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Daily Summary */}
                  {entries.length > 0 && (
                    <div className="mt-6 p-4 bg-white border border-stone-100 rounded-2xl">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-stone-900">Daily Total</span>
                        <div className="flex gap-4 text-stone-500">
                          <span>{Math.round(totals.calories)} cal</span>
                          <span>{Math.round(totals.protein)}g P</span>
                          <span>{Math.round(totals.carbs)}g C</span>
                          <span>{Math.round(totals.fat)}g F</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* HISTORY VIEW - 7 Days */}
              {activeView === 'history' && (
                <>
                  {/* Weekly Summary Card */}
                  <div className="bg-white rounded-2xl p-6 mb-6 border border-stone-200">
                    <h2 className="text-sm font-semibold text-stone-900 mb-4 flex items-center gap-2">
                      <TrendingUp size={16} className="text-orange-500" />
                      Weekly Averages
                    </h2>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-stone-900">{weeklyAverages.calories}</p>
                        <p className="text-xs text-stone-500">calories/day</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-500">{weeklyAverages.protein}g</p>
                        <p className="text-xs text-stone-500">protein/day</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-emerald-500">{weeklyAverages.carbs}g</p>
                        <p className="text-xs text-stone-500">carbs/day</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-500">{weeklyAverages.fat}g</p>
                        <p className="text-xs text-stone-500">fat/day</p>
                      </div>
                    </div>
                  </div>

                  {/* 7 Day List */}
                  <div className="space-y-4">
                    <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                      <Calendar size={16} className="text-stone-400" />
                      Daily Breakdown
                    </h2>

                    {historyLoading ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
                      </div>
                    ) : historyDays.length === 0 ? (
                      <div className="p-8 text-center bg-white border border-stone-100 rounded-2xl">
                        <Calendar className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                        <p className="text-sm text-stone-400">No history data available</p>
                      </div>
                    ) : (
                      historyDays.map((day) => (
                        <div key={day.date} className="bg-white border border-stone-100 rounded-2xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-lg">{getDayEmoji(day.date)}</span>
                              <div>
                                <p className="font-semibold text-stone-900">{formatDate(day.date)}</p>
                                <p className="text-xs text-stone-400">{day.entries.length} meals</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-stone-900">{Math.round(day.totals.calories)}</p>
                              <p className="text-xs text-stone-400">kcal</p>
                            </div>
                          </div>

                          {/* Macro bars */}
                          <div className="grid grid-cols-3 gap-3 text-xs">
                            <div>
                              <div className="flex justify-between mb-1">
                                <span className="text-stone-500">Protein</span>
                                <span className="font-medium">{Math.round(day.totals.protein)}g</span>
                              </div>
                              <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-orange-500 rounded-full"
                                  style={{ width: `${Math.min((day.totals.protein / goals.protein) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between mb-1">
                                <span className="text-stone-500">Carbs</span>
                                <span className="font-medium">{Math.round(day.totals.carbs)}g</span>
                              </div>
                              <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${Math.min((day.totals.carbs / goals.carbs) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between mb-1">
                                <span className="text-stone-500">Fat</span>
                                <span className="font-medium">{Math.round(day.totals.fat)}g</span>
                              </div>
                              <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${Math.min((day.totals.fat / goals.fat) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Meals list */}
                          {day.entries.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-stone-100">
                              <div className="flex flex-wrap gap-2">
                                {day.entries.slice(0, 4).map((entry, idx) => (
                                  <span key={idx} className="text-xs px-2 py-1 bg-stone-50 rounded-lg text-stone-600">
                                    {getMealEmoji(entry.name)} {entry.name}
                                  </span>
                                ))}
                                {day.entries.length > 4 && (
                                  <span className="text-xs px-2 py-1 bg-stone-50 rounded-lg text-stone-400">
                                    +{day.entries.length - 4} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              {/* ANALYTICS VIEW */}
              {activeView === 'analytics' && (
                <div className="text-center py-16">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 text-stone-200" />
                  <h2 className="text-xl font-semibold text-stone-900 mb-2">Analytics Coming Soon</h2>
                  <p className="text-stone-500 max-w-md mx-auto">
                    Detailed insights, trends, and visualizations are on the way.
                    Check the History tab for now to see your weekly overview.
                  </p>
                </div>
              )}

              {/* GOALS VIEW */}
              {activeView === 'goals' && (
                <>
                  <div className="bg-white rounded-2xl p-6 mb-6 border border-stone-200">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-semibold text-stone-900">Current Goals</h2>
                      <button
                        onClick={() => setShowGoalsModal(true)}
                        className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors"
                      >
                        Edit Goals
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="p-4 bg-gradient-to-br from-orange-50 to-pink-50 rounded-xl">
                        <p className="text-sm text-stone-500 mb-1">Daily Calories</p>
                        <p className="text-3xl font-bold text-stone-900">{goals.calories}</p>
                        <p className="text-xs text-stone-400 mt-1">kcal per day</p>
                      </div>

                      <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl">
                        <p className="text-sm text-stone-500 mb-1">Protein</p>
                        <p className="text-3xl font-bold text-orange-600">{goals.protein}g</p>
                        <p className="text-xs text-stone-400 mt-1">grams per day</p>
                      </div>

                      <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl">
                        <p className="text-sm text-stone-500 mb-1">Carbohydrates</p>
                        <p className="text-3xl font-bold text-emerald-600">{goals.carbs}g</p>
                        <p className="text-xs text-stone-400 mt-1">grams per day</p>
                      </div>

                      <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                        <p className="text-sm text-stone-500 mb-1">Fat</p>
                        <p className="text-3xl font-bold text-blue-600">{goals.fat}g</p>
                        <p className="text-xs text-stone-400 mt-1">grams per day</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 border border-stone-200">
                    <h2 className="text-lg font-semibold text-stone-900 mb-4">Settings</h2>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-3 border-b border-stone-100">
                        <div>
                          <p className="font-medium text-stone-900">Notifications</p>
                          <p className="text-sm text-stone-500">Daily reminders and alerts</p>
                        </div>
                        <span className="text-sm text-stone-400">Coming soon</span>
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-stone-100">
                        <div>
                          <p className="font-medium text-stone-900">Data Export</p>
                          <p className="text-sm text-stone-500">Download your nutrition data</p>
                        </div>
                        <span className="text-sm text-stone-400">Coming soon</span>
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <div>
                          <p className="font-medium text-stone-900">Integrations</p>
                          <p className="text-sm text-stone-500">Connect with other apps</p>
                        </div>
                        <span className="text-sm text-stone-400">Coming soon</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* COACH VIEW */}
              {activeView === 'coach' && (
                <div className="text-center py-16">
                  <Sparkles className="w-16 h-16 mx-auto mb-4 text-violet-200" />
                  <h2 className="text-xl font-semibold text-stone-900 mb-2">Coach Dashboard</h2>
                  <p className="text-stone-500 max-w-md mx-auto mb-6">
                    Your personal nutrition coach is here to guide you through your journey.
                    Daily check-ins coming soon!
                  </p>
                  <button
                    onClick={() => {
                      setActiveView('assistant');
                      setChatOpen(true);
                    }}
                    className="px-6 py-3 bg-violet-500 text-white rounded-xl font-medium hover:bg-violet-600 transition-colors"
                  >
                    Chat with Coach
                  </button>
                </div>
              )}

              {/* ASSISTANT VIEW */}
              {activeView === 'assistant' && (
                <div className="text-center py-16">
                  <Bot className="w-16 h-16 mx-auto mb-4 text-blue-200" />
                  <h2 className="text-xl font-semibold text-stone-900 mb-2">AI Assistant</h2>
                  <p className="text-stone-500 max-w-md mx-auto mb-6">
                    Ask Archie anything about nutrition, get meal suggestions, or log food with natural language.
                  </p>
                  <button
                    onClick={() => setChatOpen(true)}
                    className="px-6 py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-colors"
                  >
                    Open Chat
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Chat Panel - Only show for Today view */}
          {activeView === 'today' && (
            <aside className={`bg-white border-l border-stone-100 flex flex-col transition-all duration-300 ${chatOpen ? 'w-80' : 'w-0 overflow-hidden'}`}>
              <div className="h-16 border-b border-stone-100 flex items-center justify-between px-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                    <Sparkles size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">Archie</p>
                    <p className="text-[10px] text-stone-400">Nutrition coach</p>
                  </div>
                </div>
                <button onClick={() => setChatOpen(false)} className="p-2 hover:bg-stone-100 rounded-lg">
                  <X size={14} className="text-stone-400" />
                </button>
              </div>
              <div className="flex-1 p-4 overflow-auto">
                <div className="space-y-4">
                  {chatMessages.map((msg, i) =>
                    msg.role === 'assistant' ? (
                      <BotMessage key={i}>{msg.content}</BotMessage>
                    ) : (
                      <UserMessage key={i}>{msg.content}</UserMessage>
                    )
                  )}
                  {isLoading && <BotMessage>Thinking...</BotMessage>}
                  <div ref={messagesEndRef} />
                </div>
              </div>
              <div className="p-3 border-t border-stone-100 flex-shrink-0">
                <div className="flex items-center gap-2 bg-stone-100 rounded-xl px-3 py-2">
                  <button className="p-1.5 hover:bg-stone-200 rounded-lg">
                    <Camera size={16} className="text-stone-400" />
                  </button>
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
                    className="p-1.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 rounded-lg"
                  >
                    <Send size={14} className="text-white" />
                  </button>
                </div>
              </div>
            </aside>
          )}
        </div>
      </main>

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
  );
}

// Navigation Item Component
function NavItem({
  icon: Icon,
  active,
  label,
  onClick,
  indent = false
}: {
  icon: any;
  active?: boolean;
  label: string;
  onClick?: () => void;
  indent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-all ${
        indent ? 'pl-10' : ''
      } ${
        active
          ? 'bg-stone-100 text-stone-900 font-medium'
          : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
      }`}
    >
      <Icon size={18} className={active ? 'text-orange-500' : 'text-stone-400'} />
      <span>{label}</span>
      {active && <ChevronRight size={14} className="ml-auto text-stone-400" />}
    </button>
  );
}

// Helper function to get day emoji based on date
function getDayEmoji(dateStr: string) {
  const date = new Date(dateStr);
  const day = date.getDay();
  const emojis = ['☀️', '📅', '📅', '📅', '📅', '📅', '🌙'];
  return emojis[day];
}

function MacroStat({ label, current, goal, color }: { label: string; current: number; goal: number; color: string }) {
  const pct = Math.round((current / goal) * 100);
  const isOver = current > goal;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-stone-400">{label}</span>
        <span className="text-sm font-semibold text-white">
          {Math.round(current)}<span className="text-stone-500 font-normal">/{goal}g</span>
        </span>
      </div>
      <div className="h-2 bg-stone-700 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${isOver ? 'from-red-500 to-red-400' : color} rounded-full transition-all duration-700`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

function MealCard({
  type,
  name,
  time,
  kcal,
  emoji,
  onDelete
}: {
  type: string;
  name: string;
  time: string;
  kcal: number;
  emoji: string;
  onDelete: () => void;
}) {
  return (
    <div className="group p-4 bg-white border border-stone-100 rounded-2xl hover:border-stone-200 hover:shadow-sm transition-all">
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 bg-stone-50 rounded-xl flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-orange-500 font-semibold uppercase tracking-wide mb-0.5">{type}</p>
          <p className="text-sm font-medium text-stone-900 truncate">{name}</p>
        </div>
        <div className="text-right">
          <p className="text-base font-bold text-stone-900">{kcal}</p>
          <p className="text-xs text-stone-400">{time}</p>
        </div>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 rounded-lg transition-all"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>
    </div>
  );
}

function BotMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm shadow-violet-500/20">
        <Sparkles size={10} className="text-white" />
      </div>
      <div className="flex-1 p-3 bg-stone-50 rounded-2xl rounded-tl-md">
        <p className="text-sm text-stone-700 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function UserMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <p className="text-sm bg-stone-900 text-white px-4 py-2.5 rounded-2xl rounded-tr-md">{children}</p>
    </div>
  );
}
