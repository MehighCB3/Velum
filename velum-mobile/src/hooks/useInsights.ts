import { useState, useEffect, useCallback } from 'react';
import { AgentInsight } from '../types';
import { insightsApi } from '../api/client';
import { isOnline } from '../db/sync';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useInsights(section?: string) {
  const [insights, setInsights] = useState<AgentInsight[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInsights = useCallback(async () => {
    try {
      const online = await isOnline();
      if (!online) return;
      const data = await insightsApi.getAll(section);
      setInsights(data);
    } catch {
      // Silently fail — insights are non-critical
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => {
    fetchInsights();
    const interval = setInterval(fetchInsights, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchInsights]);

  return { insights, loading, refresh: fetchInsights };
}
