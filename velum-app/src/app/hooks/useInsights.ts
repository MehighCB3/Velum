'use client'

import { useState, useEffect, useCallback } from 'react'

interface Insight {
  agent: string
  agentId: string
  emoji: string
  insight: string
  type: 'nudge' | 'alert' | 'celebration'
  updatedAt: string
  section: 'nutrition' | 'fitness' | 'budget' | 'tasks' | 'knowledge'
}

const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes

export function useInsights(section?: string) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInsights = useCallback(async () => {
    try {
      const response = await fetch('/api/insights')
      if (!response.ok) throw new Error('Failed to fetch insights')
      const data: Insight[] = await response.json()
      const filtered = section ? data.filter((i) => i.section === section) : data
      setInsights(filtered)
      setError(null)
    } catch (err) {
      console.error('useInsights error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [section])

  useEffect(() => {
    fetchInsights()
    const interval = setInterval(fetchInsights, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchInsights])

  return { insights, loading, error, refresh: fetchInsights }
}
