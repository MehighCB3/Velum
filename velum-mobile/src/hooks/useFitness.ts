import { useState, useEffect, useCallback } from 'react';
import { FitnessWeek, FitnessEntry } from '../types';
import { fitnessApi } from '../api/client';
import { cacheFitnessWeek, getCachedFitnessWeek } from '../db/database';
import { isOnline } from '../db/sync';
import { getISOWeekKey } from '../components/WeekSelector';

const EMPTY_TOTALS = {
  steps: 0, runs: 0, swims: 0, cycles: 0, jiujitsu: 0,
  totalDistance: 0, totalCalories: 0, runDistance: 0, swimDistance: 0, cycleDistance: 0,
};

const DEFAULT_GOALS = { steps: 10000, runs: 3, swims: 2 };

function makeEmptyWeek(weekKey: string): FitnessWeek {
  return { week: weekKey, entries: [], totals: EMPTY_TOTALS, goals: DEFAULT_GOALS };
}

export function useFitness(weekDate?: Date) {
  const weekKey = weekDate ? getISOWeekKey(weekDate) : getISOWeekKey(new Date());
  const [data, setData] = useState<FitnessWeek>(makeEmptyWeek(weekKey));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const online = await isOnline();
      if (online) {
        const result = await fitnessApi.getWeek(weekKey);
        setData(result);
        await cacheFitnessWeek(result.week, result.entries);
      } else {
        // Offline fallback to local cache
        const cached = await getCachedFitnessWeek(weekKey);
        if (cached.length > 0) {
          setData((prev) => ({ ...prev, week: weekKey, entries: cached }));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      // Try cache on error
      try {
        const cached = await getCachedFitnessWeek(weekKey);
        if (cached.length > 0) {
          setData((prev) => ({ ...prev, week: weekKey, entries: cached }));
        }
      } catch { /* ignore cache errors */ }
    } finally {
      setLoading(false);
    }
  }, [weekKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addEntry = useCallback(
    async (entry: Partial<FitnessEntry> & { type: FitnessEntry['type'] }) => {
      try {
        const result = await fitnessApi.addEntry(entry, weekKey);
        setData(result);
        await cacheFitnessWeek(result.week, result.entries);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add');
      }
    },
    [weekKey],
  );

  const deleteEntry = useCallback(
    async (entryId: string) => {
      try {
        const result = await fitnessApi.deleteEntry(entryId, weekKey);
        setData(result);
        await cacheFitnessWeek(result.week, result.entries);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete');
      }
    },
    [weekKey],
  );

  return { data, loading, error, refresh: fetchData, addEntry, deleteEntry };
}
