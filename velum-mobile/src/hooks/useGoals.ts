import { useState, useEffect, useCallback } from 'react';
import { Goal, GoalHorizon } from '../types';
import { goalsApi } from '../api/client';
import { cacheGoals } from '../db/database';
import { isOnline } from '../db/sync';

export function useGoals(horizon?: GoalHorizon) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const online = await isOnline();
      if (online) {
        const result = await goalsApi.getAll(horizon);
        setGoals(result);
        await cacheGoals(result as unknown as Record<string, unknown>[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [horizon]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createGoal = useCallback(async (goal: Partial<Goal>) => {
    try {
      const result = await goalsApi.create(goal);
      setGoals((prev) => [result, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    }
  }, []);

  const updateProgress = useCallback(async (id: string, value: number) => {
    try {
      const updated = await goalsApi.updateProgress(id, value);
      setGoals((prev) => prev.map((g) => (g.id === id ? updated : g)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  }, []);

  const markComplete = useCallback(async (id: string) => {
    try {
      const updated = await goalsApi.markComplete(id);
      setGoals((prev) => prev.map((g) => (g.id === id ? updated : g)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete');
    }
  }, []);

  const removeGoal = useCallback(async (id: string) => {
    try {
      await goalsApi.remove(id);
      setGoals((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }, []);

  return {
    goals,
    loading,
    error,
    refresh: fetchData,
    createGoal,
    updateProgress,
    markComplete,
    removeGoal,
  };
}
