"use client";

import React, { useState, useEffect } from 'react';
import {
  Apple, Clock, Target, MessageCircle, Settings, Plus, Send, Camera,
  ChevronRight, ChevronDown, Sparkles, X, FileText, Folder, Search,
  Utensils, BarChart3, BookOpen, Dumbbell, Brain, ListTodo
} from 'lucide-react';

// Navigation item type for nested folder structure (up to 5 levels)
interface NavItem {
  id: string;
  name: string;
  icon?: any;
  type: 'page' | 'folder';
  children?: NavItem[];
}

export default function VelumApp() {
  const [message, setMessage] = useState('');
  const [chatOpen, setChatOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('today');
  const [selectedDay, setSelectedDay] = useState(6);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: "Hey! You've got 1,230 kcal left today. Want some dinner ideas? 🍽️" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeNavItem, setActiveNavItem] = useState('nutrition-today');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['nutrition', 'nutrition-meals']));

  // Notion-style navigation structure (supports up to 5 levels)
  const navigation: NavItem[] = [
    {
      id: 'nutrition',
      name: 'Nutrition',
      icon: Apple,
      type: 'folder',
      children: [
        { id: 'nutrition-today', name: 'Today', icon: Utensils, type: 'page' },
        { id: 'nutrition-history', name: 'History', icon: Clock, type: 'page' },
        { id: 'nutrition-analytics', name: 'Analytics', icon: BarChart3, type: 'page' },
        {
          id: 'nutrition-meals',
          name: 'Meals',
          icon: Folder,
          type: 'folder',
          children: [
            { id: 'meals-breakfast', name: 'Breakfast', icon: FileText, type: 'page' },
            { id: 'meals-lunch', name: 'Lunch', icon: FileText, type: 'page' },
            { id: 'meals-dinner', name: 'Dinner', icon: FileText, type: 'page' },
            {
              id: 'meals-recipes',
              name: 'Recipes',
              icon: Folder,
              type: 'folder',
              children: [
                { id: 'recipes-quick', name: 'Quick Meals', icon: FileText, type: 'page' },
                { id: 'recipes-healthy', name: 'Healthy', icon: FileText, type: 'page' },
                {
                  id: 'recipes-by-cuisine',
                  name: 'By Cuisine',
                  icon: Folder,
                  type: 'folder',
                  children: [
                    { id: 'cuisine-italian', name: 'Italian', icon: FileText, type: 'page' },
                    { id: 'cuisine-asian', name: 'Asian', icon: FileText, type: 'page' },
                    { id: 'cuisine-mexican', name: 'Mexican', icon: FileText, type: 'page' },
                  ]
                }
              ]
            }
          ]
        },
        { id: 'nutrition-goals', name: 'Goals', icon: Target, type: 'page' },
      ]
    },
    {
      id: 'fitness',
      name: 'Fitness',
      icon: Dumbbell,
      type: 'folder',
      children: [
        { id: 'fitness-workouts', name: 'Workouts', icon: FileText, type: 'page' },
        { id: 'fitness-progress', name: 'Progress', icon: BarChart3, type: 'page' },
      ]
    },
    {
      id: 'knowledge',
      name: 'Knowledge',
      icon: Brain,
      type: 'folder',
      children: [
        { id: 'knowledge-articles', name: 'Articles', icon: BookOpen, type: 'page' },
        { id: 'knowledge-notes', name: 'Notes', icon: FileText, type: 'page' },
      ]
    },
    {
      id: 'tasks',
      name: 'Tasks',
      icon: ListTodo,
      type: 'page',
    }
  ];

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const todayData = {
    consumed: 770,
    goal: 2000,
    protein: { current: 47, goal: 150 },
    carbs: { current: 73, goal: 200 },
  };

  const weekData = [
    { day: 'Mon', date: 23, kcal: 1850, protein: 120, carbs: 180, goal: 2000 },
    { day: 'Tue', date: 24, kcal: 2100, protein: 145, carbs: 210, goal: 2000 },
    { day: 'Wed', date: 25, kcal: 1720, protein: 95, carbs: 165, goal: 2000 },
    { day: 'Thu', date: 26, kcal: 1950, protein: 130, carbs: 190, goal: 2000 },
    { day: 'Fri', date: 27, kcal: 2200, protein: 155, carbs: 220, goal: 2000 },
    { day: 'Sat', date: 28, kcal: 1680, protein: 88, carbs: 175, goal: 2000 },
    { day: 'Sun', date: 29, kcal: 770, protein: 47, carbs: 73, goal: 2000, isToday: true },
  ];

  const meals = [
    { type: 'Breakfast', name: 'Oatmeal with banana', time: '08:30', kcal: 350, emoji: '🥣' },
    { type: 'Lunch', name: 'Grilled chicken salad', time: '13:00', kcal: 420, emoji: '🥗' },
  ];

  const progress = Math.round((todayData.consumed / todayData.goal) * 100);
  const remaining = todayData.goal - todayData.consumed;

  const [animatedProgress, setAnimatedProgress] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedProgress(progress), 100);
    return () => clearTimeout(timer);
  }, [progress]);

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message;
    setMessage('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const userId = localStorage.getItem('velum-user-id') || (() => {
        const id = crypto.randomUUID();
        localStorage.setItem('velum-user-id', id);
        return id;
      })();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          messages: [...chatMessages, { role: 'user', content: userMessage }]
        })
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      setChatMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const json = JSON.parse(line.slice(6));
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                assistantMessage += content;
                setChatMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: assistantMessage };
                  return updated;
                });
              }
            } catch {}
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, connection error. Try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen font-sans antialiased bg-stone-50 text-stone-900">

      {/* Sidebar - Notion style */}
      <nav className="w-60 bg-stone-100/50 border-r border-stone-200 flex flex-col">
        {/* Workspace header */}
        <div className="h-14 flex items-center gap-3 px-4 border-b border-stone-200/50">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-pink-600 rounded-lg flex items-center justify-center shadow-sm shadow-orange-500/20">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <span className="font-semibold text-stone-800">Velum</span>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <button className="w-full flex items-center gap-2 px-2 py-1.5 text-stone-500 hover:bg-stone-200/50 rounded-md transition-colors">
            <Search size={14} />
            <span className="text-sm">Search</span>
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          <div className="px-2 py-1.5 mb-1">
            <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">Workspace</span>
          </div>
          {navigation.map(item => (
            <SidebarItem
              key={item.id}
              item={item}
              depth={0}
              activeId={activeNavItem}
              expandedFolders={expandedFolders}
              onSelect={setActiveNavItem}
              onToggle={toggleFolder}
            />
          ))}
        </div>

        {/* Settings */}
        <div className="p-2 border-t border-stone-200/50">
          <button className="w-full flex items-center gap-2 px-2 py-1.5 text-stone-500 hover:bg-stone-200/50 rounded-md transition-colors">
            <Settings size={16} />
            <span className="text-sm">Settings</span>
          </button>
        </div>
      </nav>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-stone-100 flex items-center justify-between px-8 sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-semibold text-stone-900">Nutrition</h1>
            <p className="text-xs text-stone-400">Thursday, January 29</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setChatOpen(!chatOpen)} className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${chatOpen ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}>
              <MessageCircle size={18} />
            </button>
            <button className="h-10 px-5 bg-stone-900 text-white rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-stone-800">
              <Plus size={16} strokeWidth={2.5} />
              Log food
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 p-8 overflow-auto">
            <div className="max-w-xl mx-auto">
              <div className="flex gap-1 p-1 bg-stone-100 rounded-xl mb-6 w-fit">
                <TabButton active={activeTab === 'today'} onClick={() => setActiveTab('today')}>Today</TabButton>
                <TabButton active={activeTab === 'week'} onClick={() => setActiveTab('week')}>Past 7 days</TabButton>
              </div>

              {activeTab === 'today' ? (
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
                            <circle cx="50" cy="50" r="42" fill="none" stroke="url(#ringGradient)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${animatedProgress * 2.64} 264`} className="transition-all duration-1000 ease-out" />
                            <defs>
                              <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#f97316" />
                                <stop offset="100%" stopColor="#ec4899" />
                              </linearGradient>
                            </defs>
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-white">{todayData.consumed}</span>
                            <span className="text-[10px] text-stone-400 uppercase tracking-wide">kcal</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-stone-400 mb-1">Remaining</p>
                          <p className="text-4xl font-bold text-white">{remaining}</p>
                          <p className="text-sm text-stone-500">of {todayData.goal} kcal goal</p>
                        </div>
                      </div>
                      <div className="h-px bg-stone-700 mb-5" />
                      <div className="grid grid-cols-2 gap-6">
                        <MacroStat label="Protein" current={todayData.protein.current} goal={todayData.protein.goal} color="from-amber-500 to-orange-500" />
                        <MacroStat label="Carbs" current={todayData.carbs.current} goal={todayData.carbs.goal} color="from-emerald-500 to-teal-500" />
                      </div>
                    </div>
                  </div>

                  {/* Meals */}
                  <div>
                    <h2 className="text-sm font-semibold text-stone-900 mb-4">Meals</h2>
                    <div className="space-y-3">
                      {meals.map((meal, i) => <MealCard key={i} {...meal} />)}
                      <button className="w-full p-4 border-2 border-dashed border-stone-200 rounded-2xl hover:border-stone-300 hover:bg-stone-50 transition-all group">
                        <div className="flex items-center justify-center gap-2 text-stone-400 group-hover:text-stone-600">
                          <Plus size={18} />
                          <span className="text-sm font-medium">Add dinner</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <WeekView weekData={weekData} selectedDay={selectedDay} setSelectedDay={setSelectedDay} />
              )}
            </div>
          </div>

          {/* Chat Panel */}
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
                {chatMessages.map((msg, i) => msg.role === 'assistant' ? <BotMessage key={i}>{msg.content}</BotMessage> : <UserMessage key={i}>{msg.content}</UserMessage>)}
                {isLoading && <BotMessage>Thinking...</BotMessage>}
              </div>
            </div>
            <div className="p-3 border-t border-stone-100 flex-shrink-0">
              <div className="flex items-center gap-2 bg-stone-100 rounded-xl px-3 py-2">
                <button className="p-1.5 hover:bg-stone-200 rounded-lg"><Camera size={16} className="text-stone-400" /></button>
                <input type="text" placeholder="Ask Archie..." className="flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400" value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} />
                <button onClick={sendMessage} disabled={isLoading} className="p-1.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 rounded-lg">
                  <Send size={14} className="text-white" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

// Recursive sidebar item component for Notion-style navigation (supports 5 levels)
function SidebarItem({
  item,
  depth,
  activeId,
  expandedFolders,
  onSelect,
  onToggle
}: {
  item: NavItem;
  depth: number;
  activeId: string;
  expandedFolders: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const isExpanded = expandedFolders.has(item.id);
  const isActive = activeId === item.id;
  const hasChildren = item.type === 'folder' && item.children && item.children.length > 0;
  const Icon = item.icon || FileText;
  const paddingLeft = 8 + depth * 12;

  return (
    <div>
      <button
        onClick={() => {
          if (hasChildren) {
            onToggle(item.id);
          }
          onSelect(item.id);
        }}
        className={`w-full flex items-center gap-1.5 py-1 px-1 rounded-md text-sm transition-colors group ${
          isActive
            ? 'bg-orange-100 text-orange-700'
            : 'text-stone-600 hover:bg-stone-200/50'
        }`}
        style={{ paddingLeft: `${paddingLeft}px` }}
      >
        {/* Expand/collapse chevron for folders */}
        {hasChildren ? (
          <span
            className="p-0.5 hover:bg-stone-300/50 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(item.id);
            }}
          >
            {isExpanded ? (
              <ChevronDown size={12} className="text-stone-400" />
            ) : (
              <ChevronRight size={12} className="text-stone-400" />
            )}
          </span>
        ) : (
          <span className="w-4" />
        )}

        {/* Icon */}
        <Icon size={14} className={isActive ? 'text-orange-600' : 'text-stone-400 group-hover:text-stone-500'} />

        {/* Label */}
        <span className="truncate flex-1 text-left">{item.name}</span>
      </button>

      {/* Render children recursively (up to depth 4 = 5 levels total) */}
      {hasChildren && isExpanded && depth < 4 && (
        <div>
          {item.children!.map(child => (
            <SidebarItem
              key={child.id}
              item={child}
              depth={depth + 1}
              activeId={activeId}
              expandedFolders={expandedFolders}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${active ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
      {children}
    </button>
  );
}

function MacroStat({ label, current, goal, color }: { label: string; current: number; goal: number; color: string }) {
  const pct = Math.round((current / goal) * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-stone-400">{label}</span>
        <span className="text-sm font-semibold text-white">{current}<span className="text-stone-500 font-normal">/{goal}g</span></span>
      </div>
      <div className="h-2 bg-stone-700 rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

function MealCard({ type, name, time, kcal, emoji }: { type: string; name: string; time: string; kcal: number; emoji: string }) {
  return (
    <div className="group p-4 bg-white border border-stone-100 rounded-2xl hover:border-stone-200 hover:shadow-sm transition-all cursor-pointer">
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 bg-stone-50 rounded-xl flex items-center justify-center text-xl group-hover:scale-105 transition-transform">{emoji}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-orange-500 font-semibold uppercase tracking-wide mb-0.5">{type}</p>
          <p className="text-sm font-medium text-stone-900 truncate">{name}</p>
        </div>
        <div className="text-right">
          <p className="text-base font-bold text-stone-900">{kcal}</p>
          <p className="text-xs text-stone-400">{time}</p>
        </div>
        <ChevronRight size={16} className="text-stone-300 group-hover:text-stone-400 transition-all" />
      </div>
    </div>
  );
}

function WeekView({ weekData, selectedDay, setSelectedDay }: { weekData: any[]; selectedDay: number; setSelectedDay: (i: number) => void }) {
  return (
    <div>
      <div className="relative bg-gradient-to-br from-stone-900 to-stone-800 rounded-3xl p-6 mb-6 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative">
          <div className="flex items-end justify-between gap-3 h-36 mb-4">
            {weekData.map((day: any, i: number) => {
              const heightPct = Math.min((day.kcal / day.goal) * 100, 120);
              const isSelected = i === selectedDay;
              const isOver = day.kcal > day.goal;
              return (
                <button key={i} onClick={() => setSelectedDay(i)} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full h-28 flex items-end">
                    <div className={`w-full rounded-lg transition-all duration-300 ${isSelected ? (isOver ? 'bg-gradient-to-t from-red-500 to-orange-400 shadow-lg shadow-red-500/30' : 'bg-gradient-to-t from-orange-500 to-pink-500 shadow-lg shadow-orange-500/30') : 'bg-stone-700 group-hover:bg-stone-600'}`} style={{ height: `${heightPct}%` }} />
                  </div>
                  <div className={`text-center transition-colors ${isSelected ? 'text-white' : 'text-stone-500'}`}>
                    <p className="text-xs font-medium">{day.day}</p>
                    <p className={`text-[10px] ${day.isToday ? 'text-orange-400 font-semibold' : ''}`}>{day.isToday ? 'Today' : day.date}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3 text-xs text-stone-500">
            <div className="flex-1 h-px bg-stone-700 border-t border-dashed border-stone-600" />
            <span>{weekData[0].goal} kcal goal</span>
          </div>
        </div>
      </div>
      <div className="bg-white border border-stone-100 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-stone-400">{weekData[selectedDay].isToday ? 'Today' : `${weekData[selectedDay].day}, Jan ${weekData[selectedDay].date}`}</p>
            <p className="text-2xl font-bold text-stone-900">{weekData[selectedDay].kcal} <span className="text-sm font-normal text-stone-400 ml-1">kcal</span></p>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${weekData[selectedDay].kcal > weekData[selectedDay].goal ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
            {weekData[selectedDay].kcal > weekData[selectedDay].goal ? 'Over goal' : 'On track'}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-stone-50 rounded-xl"><p className="text-xs text-stone-400 mb-1">Protein</p><p className="text-lg font-semibold text-stone-900">{weekData[selectedDay].protein}g</p></div>
          <div className="p-3 bg-stone-50 rounded-xl"><p className="text-xs text-stone-400 mb-1">Carbs</p><p className="text-lg font-semibold text-stone-900">{weekData[selectedDay].carbs}g</p></div>
        </div>
      </div>
      <div className="mt-4 p-4 bg-stone-100 rounded-xl">
        <p className="text-sm text-stone-600"><span className="font-semibold text-stone-900">Avg:</span> {Math.round(weekData.reduce((a: number, b: any) => a + b.kcal, 0) / 7)} kcal/day <span className="mx-2 text-stone-300">•</span> <span className="font-semibold text-stone-900">On target:</span> {weekData.filter((d: any) => d.kcal <= d.goal).length}/7 days</p>
      </div>
    </div>
  );
}

function BotMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm shadow-violet-500/20"><Sparkles size={10} className="text-white" /></div>
      <div className="flex-1 p-3 bg-stone-50 rounded-2xl rounded-tl-md"><p className="text-sm text-stone-700 leading-relaxed">{children}</p></div>
    </div>
  );
}

function UserMessage({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-end"><p className="text-sm bg-stone-900 text-white px-4 py-2.5 rounded-2xl rounded-tr-md">{children}</p></div>;
}
