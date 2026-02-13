import { useState, useCallback } from 'react';
import { Linking } from 'react-native';
import Constants from 'expo-constants';

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
  apkUrl: string | null;
  releaseNotes: string | null;
}

const API_BASE = __DEV__
  ? 'http://localhost:3000'
  : 'https://velum-five.vercel.app';

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

export function useAppUpdate() {
  const [state, setState] = useState<AppUpdateState>({
    status: 'idle',
    error: null,
    lastChecked: null,
    apkUrl: null,
    releaseNotes: null,
  });

  const checkAndUpdate = useCallback(async () => {
    if (__DEV__) {
      setState({
        status: 'up-to-date',
        error: null,
        lastChecked: new Date().toISOString(),
        apkUrl: null,
        releaseNotes: null,
      });
      return;
    }

    try {
      setState((s) => ({ ...s, status: 'checking', error: null }));

      const res = await fetch(`${API_BASE}/api/app-version`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const data = await res.json();
      const currentVersion =
        Constants.expoConfig?.version || Constants.manifest?.version || '1.0.0';

      if (compareVersions(data.version, currentVersion) > 0) {
        setState({
          status: 'ready',
          error: null,
          lastChecked: new Date().toISOString(),
          apkUrl: data.apkUrl || null,
          releaseNotes: data.releaseNotes || null,
        });
      } else {
        setState({
          status: 'up-to-date',
          error: null,
          lastChecked: new Date().toISOString(),
          apkUrl: null,
          releaseNotes: null,
        });
      }
    } catch (err) {
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Update check failed',
        lastChecked: new Date().toISOString(),
        apkUrl: null,
        releaseNotes: null,
      });
    }
  }, []);

  const applyUpdate = useCallback(async () => {
    if (state.apkUrl) {
      await Linking.openURL(state.apkUrl);
    }
  }, [state.apkUrl]);

  return {
    ...state,
    isUpdateAvailable: state.status === 'ready',
    isChecking: state.status === 'checking',
    checkAndUpdate,
    applyUpdate,
  };
}
