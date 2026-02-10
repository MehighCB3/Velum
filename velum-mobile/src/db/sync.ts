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

// The sync engine handles bidirectional synchronization between the
// mobile app's local SQLite cache and the Velum web API:
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

// Flush pending changes to the server.
// Continues past individual failures so one bad change doesn't block everything.
// Removes successful changes and non-retryable failures (4xx).
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
      } else if (response.status >= 400 && response.status < 500) {
        // Client error (bad request, not found) — remove, don't retry forever
        console.warn(`Sync: dropping change ${change.id} (${response.status})`);
        await removePendingChange(change.id);
      }
      // 5xx errors: leave in queue for next sync attempt
    } catch (error) {
      // Network error on this item — skip it, continue with rest
      console.warn('Sync flush error for change', change.id, error);
      continue;
    }
  }

  return flushed;
}

// Refresh all local caches from the server
export async function refreshAllCaches(): Promise<void> {
  const online = await isOnline();
  if (!online) return;

  const today = new Date().toISOString().split('T')[0];

  // Run all cache refreshes independently — one failure doesn't block others
  const results = await Promise.allSettled([
    nutritionApi.getDay(today).then((data) =>
      cacheNutritionDay(today, data.entries, data.goals),
    ),
    fitnessApi.getWeek().then((data) =>
      cacheFitnessWeek(data.week, data.entries),
    ),
    budgetApi.getWeek().then((data) =>
      cacheBudgetWeek(data.week, data.entries),
    ),
    goalsApi.getAll().then((goals) =>
      cacheGoals(goals),
    ),
  ]);

  for (const result of results) {
    if (result.status === 'rejected') {
      console.warn('Cache refresh failed:', result.reason);
    }
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

  return getSyncStatus();
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
