import { useState, useEffect, useCallback } from 'react';
import { NutritionDay, NutritionEntry, NutritionGoals } from '../types';
import { nutritionApi } from '../api/client';
import { cacheNutritionDay, getCachedNutritionDay } from '../db/database';
import { isOnline } from '../db/sync';

const DEFAULT_GOALS: NutritionGoals = {
  calories: 2600,
  protein: 160,
  carbs: 310,
  fat: 80,
};

export function useNutrition(date?: string) {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const [data, setData] = useState<NutritionDay>({
    date: targetDate,
    entries: [],
    totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    goals: DEFAULT_GOALS,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const online = await isOnline();
      if (online) {
        const result = await nutritionApi.getDay(targetDate);
        setData(result);
        // Cache for offline use
        await cacheNutritionDay(targetDate, result.entries, result.goals);
      } else {
        // Load from local cache
        const cached = await getCachedNutritionDay(targetDate);
        if (cached) {
          const totals = cached.entries.reduce(
            (acc, e) => ({
              calories: acc.calories + e.calories,
              protein: acc.protein + e.protein,
              carbs: acc.carbs + e.carbs,
              fat: acc.fat + e.fat,
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 },
          );
          setData({
            date: targetDate,
            entries: cached.entries as NutritionEntry[],
            totals,
            goals: cached.goals,
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      // Try local cache on error
      const cached = await getCachedNutritionDay(targetDate);
      if (cached) {
        const totals = cached.entries.reduce(
          (acc, e) => ({
            calories: acc.calories + e.calories,
            protein: acc.protein + e.protein,
            carbs: acc.carbs + e.carbs,
            fat: acc.fat + e.fat,
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 },
        );
        setData({
          date: targetDate,
          entries: cached.entries as NutritionEntry[],
          totals,
          goals: cached.goals,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [targetDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addEntry = useCallback(
    async (entry: Omit<NutritionEntry, 'date'>) => {
      try {
        const result = await nutritionApi.addEntry(targetDate, entry, data.goals);
        setData(result);
        await cacheNutritionDay(targetDate, result.entries, result.goals);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add');
      }
    },
    [targetDate, data.goals],
  );

  const deleteEntry = useCallback(
    async (entryId: string) => {
      try {
        const result = await nutritionApi.deleteEntry(targetDate, entryId);
        setData(result);
        await cacheNutritionDay(targetDate, result.entries, result.goals);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete');
      }
    },
    [targetDate],
  );

  return { data, loading, error, refresh: fetchData, addEntry, deleteEntry };
}
