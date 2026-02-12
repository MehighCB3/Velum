import { useState, useCallback } from 'react';
import * as Updates from 'expo-updates';

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'ready'
  | 'up-to-date'
  | 'error';

interface AppUpdateState {
  status: UpdateStatus;
  error: string | null;
  lastChecked: string | null;
}

export function useAppUpdate() {
  const [state, setState] = useState<AppUpdateState>({
    status: 'idle',
    error: null,
    lastChecked: null,
  });

  const checkAndUpdate = useCallback(async () => {
    // In dev mode, expo-updates is not available
    if (__DEV__) {
      setState({
        status: 'up-to-date',
        error: null,
        lastChecked: new Date().toISOString(),
      });
      return;
    }

    try {
      setState((s) => ({ ...s, status: 'checking', error: null }));

      const check = await Updates.checkForUpdateAsync();

      if (!check.isAvailable) {
        setState({
          status: 'up-to-date',
          error: null,
          lastChecked: new Date().toISOString(),
        });
        return;
      }

      // Update available — download it
      setState((s) => ({ ...s, status: 'downloading' }));
      await Updates.fetchUpdateAsync();

      setState({
        status: 'ready',
        error: null,
        lastChecked: new Date().toISOString(),
      });
    } catch (err) {
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Update check failed',
        lastChecked: new Date().toISOString(),
      });
    }
  }, []);

  const applyUpdate = useCallback(async () => {
    if (__DEV__) return;
    await Updates.reloadAsync();
  }, []);

  return {
    ...state,
    isUpdateAvailable: state.status === 'ready',
    isChecking: state.status === 'checking' || state.status === 'downloading',
    checkAndUpdate,
    applyUpdate,
  };
}
