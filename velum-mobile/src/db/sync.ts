import * as Network from 'expo-network';
import {
  getPendingChanges,
  removePendingChange,
  getPendingChangeCount,
  setSyncMeta,
  getSyncMeta,
  cacheNutritionDay,
  cacheFitnessWeek,
  cacheBudgetWeek,
  cacheGoals,
} from './database';
import { nutritionApi, fitnessApi, budgetApi, goalsApi } from '../api/client';
import { SyncStatus } from '../types';

// ==================== SYNC ENGINE ====================
//
// The sync engine handles bidirectional synchronization between the
// mobile app's local SQLite cache and the Velum web API. It follows
// an offline-first approach:
//
// 1. READ: Try API first, fall back to local cache if offline
// 2. WRITE: Write to API if online, otherwise queue in pending_changes
// 3. SYNC: On reconnect, flush pending_changes queue then refresh caches

const API_BASE = __DEV__
  ? 'http://localhost:3000'
  : 'https://velum-app.vercel.app';

export async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch {
    return false;
  }
}

// Flush all pending changes to the server
export async function flushPendingChanges(): Promise<number> {
  const online = await isOnline();
  if (!online) return 0;

  const changes = await getPendingChanges();
  let flushed = 0;

  for (const change of changes) {
    try {
      const url = `${API_BASE}/api${change.endpoint}${
        change.params
          ? '?' + new URLSearchParams(change.params).toString()
          : ''
      }`;

      const response = await fetch(url, {
        method: change.method,
        headers: { 'Content-Type': 'application/json' },
        body: change.body ? JSON.stringify(change.body) : undefined,
      });

      if (response.ok) {
        await removePendingChange(change.id);
        flushed++;
      }
    } catch (error) {
      // Stop flushing on network error, retry later
      console.warn('Sync flush error:', error);
      break;
    }
  }

  return flushed;
}

// Refresh all local caches from the server
export async function refreshAllCaches(): Promise<void> {
  const online = await isOnline();
  if (!online) return;

  const today = new Date().toISOString().split('T')[0];

  try {
    // Refresh nutrition (today)
    const nutritionData = await nutritionApi.getDay(today);
    await cacheNutritionDay(today, nutritionData.entries, nutritionData.goals);
  } catch (error) {
    console.warn('Nutrition cache refresh failed:', error);
  }

  try {
    // Refresh fitness (current week)
    const fitnessData = await fitnessApi.getWeek();
    await cacheFitnessWeek(
      fitnessData.week,
      fitnessData.entries as unknown as Record<string, unknown>[],
    );
  } catch (error) {
    console.warn('Fitness cache refresh failed:', error);
  }

  try {
    // Refresh budget (current week)
    const budgetData = await budgetApi.getWeek();
    await cacheBudgetWeek(budgetData.week, budgetData.entries);
  } catch (error) {
    console.warn('Budget cache refresh failed:', error);
  }

  try {
    // Refresh goals
    const goals = await goalsApi.getAll();
    await cacheGoals(goals as unknown as Record<string, unknown>[]);
  } catch (error) {
    console.warn('Goals cache refresh failed:', error);
  }

  await setSyncMeta('lastFullSync', new Date().toISOString());
}

// Full sync: flush pending then refresh caches
export async function fullSync(): Promise<SyncStatus> {
  const online = await isOnline();

  if (online) {
    await flushPendingChanges();
    await refreshAllCaches();
    await setSyncMeta('lastSynced', new Date().toISOString());
  }

  const pendingChanges = await getPendingChangeCount();
  const lastSynced = await getSyncMeta('lastSynced');

  return {
    lastSynced,
    isSyncing: false,
    isOnline: online,
    pendingChanges,
  };
}

// Get current sync status without performing a sync
export async function getSyncStatus(): Promise<SyncStatus> {
  const online = await isOnline();
  const pendingChanges = await getPendingChangeCount();
  const lastSynced = await getSyncMeta('lastSynced');

  return {
    lastSynced,
    isSyncing: false,
    isOnline: online,
    pendingChanges,
  };
}
