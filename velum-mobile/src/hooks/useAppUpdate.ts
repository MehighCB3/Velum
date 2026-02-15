import { useState, useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import Constants from 'expo-constants';
import { API_BASE } from '../api/config';

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
  remoteVersion: string | null;
  currentVersion: string;
}

function getCurrentVersion(): string {
  return (
    Constants.expoConfig?.version ||
    (Constants.manifest as Record<string, unknown> | null)?.version as string ||
    '0.0.0'
  );
}

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

function fetchWithTimeout(url: string, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, {
    signal: controller.signal,
    headers: { Accept: 'application/json' },
  }).finally(() => clearTimeout(timer));
}

export function useAppUpdate() {
  const [state, setState] = useState<AppUpdateState>({
    status: 'idle',
    error: null,
    lastChecked: null,
    apkUrl: null,
    releaseNotes: null,
    remoteVersion: null,
    currentVersion: getCurrentVersion(),
  });

  const checkAndUpdate = useCallback(async () => {
    if (__DEV__) {
      setState((s) => ({
        ...s,
        status: 'up-to-date',
        error: null,
        lastChecked: new Date().toISOString(),
      }));
      return;
    }

    try {
      setState((s) => ({ ...s, status: 'checking', error: null }));

      const res = await fetchWithTimeout(`${API_BASE}/api/app-version`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const data = await res.json();
      const currentVersion = getCurrentVersion();

      if (compareVersions(data.version, currentVersion) > 0) {
        setState({
          status: 'ready',
          error: null,
          lastChecked: new Date().toISOString(),
          apkUrl: data.apkUrl || null,
          releaseNotes: data.releaseNotes || null,
          remoteVersion: data.version,
          currentVersion,
        });
      } else {
        setState({
          status: 'up-to-date',
          error: null,
          lastChecked: new Date().toISOString(),
          apkUrl: null,
          releaseNotes: null,
          remoteVersion: data.version,
          currentVersion,
        });
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.name === 'AbortError'
            ? 'Request timed out — check your connection'
            : err.message
          : 'Update check failed';
      setState((s) => ({
        ...s,
        status: 'error',
        error: message,
        lastChecked: new Date().toISOString(),
      }));
    }
  }, []);

  const applyUpdate = useCallback(async () => {
    if (!state.apkUrl) return;
    try {
      const canOpen = await Linking.canOpenURL(state.apkUrl);
      if (canOpen) {
        await Linking.openURL(state.apkUrl);
      } else {
        Alert.alert(
          'Download Link',
          `Open this URL in your browser to download:\n\n${state.apkUrl}`,
        );
      }
    } catch {
      Alert.alert(
        'Download Link',
        `Open this URL in your browser to download:\n\n${state.apkUrl}`,
      );
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
