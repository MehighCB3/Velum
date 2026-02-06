'use client'

import React, { useState } from 'react'
import { X } from 'lucide-react'

interface AgentInsightProps {
  agent: string
  emoji: string
  insight: string
  updatedAt?: string
  type?: 'nudge' | 'alert' | 'celebration'
}

function timeAgo(dateString: string): string {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  return `${diffDays}d ago`
}

const borderColors: Record<string, string> = {
  nudge: 'border-l-stone-300',
  alert: 'border-l-amber-400',
  celebration: 'border-l-green-400',
}

export default function AgentInsight({ agent, emoji, insight, updatedAt, type = 'nudge' }: AgentInsightProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className={`mt-3 bg-stone-50 border border-stone-200 border-l-[3px] ${borderColors[type]} rounded-md px-3 py-2.5 flex items-start gap-2.5`}>
      <span className="text-base leading-none mt-0.5 shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-stone-700">
          <span className="font-semibold text-stone-800">{agent}</span>{' '}
          {insight}
        </p>
        {updatedAt && (
          <p className="text-[10px] text-stone-400 mt-0.5">{timeAgo(updatedAt)}</p>
        )}
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 p-0.5 rounded hover:bg-stone-200 text-stone-400 hover:text-stone-600 transition-colors"
        aria-label="Dismiss"
      >
        <X size={12} />
      </button>
    </div>
  )
}
