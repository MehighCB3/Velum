import { useState, useEffect, useCallback } from 'react';
import { FitnessWeek, FitnessEntry } from '../types';
import { fitnessApi } from '../api/client';
import { cacheFitnessWeek } from '../db/database';
import { isOnline } from '../db/sync';
import { getISOWeekKey } from '../components/WeekSelector';

const DEFAULT_WEEK: FitnessWeek = {
  week: getISOWeekKey(new Date()),
  entries: [],
  totals: {
    steps: 0,
    runs: 0,
    swims: 0,
    cycles: 0,
    jiujitsu: 0,
    totalDistance: 0,
    totalCalories: 0,
    runDistance: 0,
    swimDistance: 0,
    cycleDistance: 0,
  },
  goals: { steps: 10000, runs: 3, swims: 2 },
  advanced: {
    avgVo2max: 0,
    totalTrainingLoad: 0,
    avgStress: 0,
    avgRecovery: 0,
    recoveryStatus: 'good',
    latestHrv: 0,
    latestWeight: 0,
    latestBodyFat: 0,
  },
};

export function useFitness(weekDate?: Date) {
  const weekKey = weekDate ? getISOWeekKey(weekDate) : getISOWeekKey(new Date());
  const [data, setData] = useState<FitnessWeek>({ ...DEFAULT_WEEK, week: weekKey });
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
        await cacheFitnessWeek(
          result.week,
          result.entries as unknown as Record<string, unknown>[],
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
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
        await cacheFitnessWeek(
          result.week,
          result.entries as unknown as Record<string, unknown>[],
        );
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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete');
      }
    },
    [weekKey],
  );

  return { data, loading, error, refresh: fetchData, addEntry, deleteEntry };
}
