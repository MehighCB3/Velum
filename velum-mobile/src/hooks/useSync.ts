import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { SyncStatus } from '../types';
import { fullSync, getSyncStatus } from '../db/sync';

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function useSync() {
  const [status, setStatus] = useState<SyncStatus>({
    lastSynced: null,
    isSyncing: false,
    isOnline: true,
    pendingChanges: 0,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const sync = useCallback(async () => {
    setStatus((s) => ({ ...s, isSyncing: true }));
    try {
      const result = await fullSync();
      setStatus(result);
    } catch (error) {
      console.warn('Sync error:', error);
      const current = await getSyncStatus();
      setStatus(current);
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    const current = await getSyncStatus();
    setStatus(current);
  }, []);

  // Initial sync and periodic refresh
  useEffect(() => {
    sync();
    intervalRef.current = setInterval(sync, SYNC_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sync]);

  // Sync when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        sync();
      }
    });
    return () => subscription.remove();
  }, [sync]);

  return { status, sync, refreshStatus };
}
