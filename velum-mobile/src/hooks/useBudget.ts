import { useState, useEffect, useCallback } from 'react';
import { BudgetWeek, BudgetCategory } from '../types';
import { budgetApi } from '../api/client';
import { cacheBudgetWeek, getCachedBudgetWeek } from '../db/database';
import { isOnline } from '../db/sync';
import { getISOWeekKey } from '../components/WeekSelector';

const WEEKLY_BUDGET = 70;

function makeEmptyWeek(weekKey: string): BudgetWeek {
  return {
    week: weekKey,
    entries: [],
    totalSpent: 0,
    remaining: WEEKLY_BUDGET,
    categories: { Food: 0, Fun: 0, Transport: 0, Subscriptions: 0, Other: 0 },
  };
}

export function useBudget(weekDate?: Date) {
  const weekKey = weekDate ? getISOWeekKey(weekDate) : getISOWeekKey(new Date());
  const [data, setData] = useState<BudgetWeek>(makeEmptyWeek(weekKey));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const online = await isOnline();
      if (online) {
        const result = await budgetApi.getWeek(weekKey);
        setData(result);
        await cacheBudgetWeek(result.week, result.entries);
      } else {
        // Offline fallback
        const cached = await getCachedBudgetWeek(weekKey);
        if (cached.length > 0) {
          const totalSpent = cached.reduce((sum, e) => sum + e.amount, 0);
          const categories = cached.reduce(
            (acc, e) => {
              acc[e.category as BudgetCategory] = (acc[e.category as BudgetCategory] || 0) + e.amount;
              return acc;
            },
            { Food: 0, Fun: 0, Transport: 0, Subscriptions: 0, Other: 0 } as Record<BudgetCategory, number>,
          );
          setData({
            week: weekKey,
            entries: cached,
            totalSpent,
            remaining: WEEKLY_BUDGET - totalSpent,
            categories,
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      try {
        const cached = await getCachedBudgetWeek(weekKey);
        if (cached.length > 0) {
          const totalSpent = cached.reduce((sum, e) => sum + e.amount, 0);
          setData({
            week: weekKey,
            entries: cached,
            totalSpent,
            remaining: WEEKLY_BUDGET - totalSpent,
            categories: { Food: 0, Fun: 0, Transport: 0, Subscriptions: 0, Other: 0 },
          });
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
    async (entry: {
      amount: number;
      category: BudgetCategory;
      description?: string;
      reason?: string;
    }) => {
      try {
        const result = await budgetApi.addEntry(entry, weekKey);
        setData(result);
        await cacheBudgetWeek(result.week, result.entries);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add');
      }
    },
    [weekKey],
  );

  const deleteEntry = useCallback(
    async (entryId: string) => {
      try {
        const result = await budgetApi.deleteEntry(entryId, weekKey);
        setData(result);
        await cacheBudgetWeek(result.week, result.entries);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete');
      }
    },
    [weekKey],
  );

  return { data, loading, error, refresh: fetchData, addEntry, deleteEntry };
}
