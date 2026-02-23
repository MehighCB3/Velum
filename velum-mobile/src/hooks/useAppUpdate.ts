import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import { File } from 'expo-file-system/next';
import {
  documentDirectory,
  createDownloadResumable,
  getContentUriAsync,
  type DownloadResumable,
} from 'expo-file-system/legacy';
import { getSyncMeta, setSyncMeta } from '../db/database';

// GitHub repository for release checks
const GITHUB_OWNER = 'MehighCB3';
const GITHUB_REPO = 'Velum';
const GITHUB_RELEASES_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

// Only auto-check once every 6 hours
const CHECK_COOLDOWN_MS = 6 * 60 * 60 * 1000;

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'update-available'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'up-to-date'
  | 'error';

interface AppUpdateState {
  status: UpdateStatus;
  error: string | null;
  lastChecked: string | null;
  apkUrl: string | null;
  releaseUrl: string | null;
  releaseNotes: string | null;
  remoteVersion: string | null;
  currentVersion: string;
  downloadProgress: number;
  downloadedFilePath: string | null;
  apkSizeBytes: number | null;
}

function getCurrentVersion(): string {
  return (
    Constants.expoConfig?.version ||
    (Constants.manifest as Record<string, unknown> | null)?.version as string ||
    '0.0.0'
  );
}

function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
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
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Velum-Mobile',
    },
  }).finally(() => clearTimeout(timer));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/** Clean up a file if it exists — uses new File API (SDK 54+) */
function cleanupFile(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Ignore — file may not exist
  }
}

const INITIAL_STATE: AppUpdateState = {
  status: 'idle',
  error: null,
  lastChecked: null,
  apkUrl: null,
  releaseUrl: null,
  releaseNotes: null,
  remoteVersion: null,
  currentVersion: getCurrentVersion(),
  downloadProgress: 0,
  downloadedFilePath: null,
  apkSizeBytes: null,
};

export function useAppUpdate() {
  const [state, setState] = useState<AppUpdateState>(INITIAL_STATE);
  const downloadRef = useRef<DownloadResumable | null>(null);

  // ── Check GitHub Releases for latest version ──
  const checkForUpdate = useCallback(async (force = false) => {
    if (__DEV__ && !force) {
      setState((s) => ({
        ...s,
        status: 'up-to-date',
        error: null,
        lastChecked: new Date().toISOString(),
      }));
      return;
    }

    // Respect cooldown unless forced
    if (!force) {
      try {
        const lastCheck = await getSyncMeta('lastUpdateCheck');
        if (lastCheck) {
          const elapsed = Date.now() - new Date(lastCheck).getTime();
          if (elapsed < CHECK_COOLDOWN_MS) {
            const cachedVersion = await getSyncMeta('latestRemoteVersion');
            const cachedApkUrl = await getSyncMeta('latestApkUrl');
            const cachedNotes = await getSyncMeta('latestReleaseNotes');
            const cachedReleaseUrl = await getSyncMeta('latestReleaseUrl');
            const cachedSize = await getSyncMeta('latestApkSize');

            if (cachedVersion && compareVersions(cachedVersion, getCurrentVersion()) > 0) {
              setState((s) => ({
                ...s,
                status: 'update-available',
                remoteVersion: cachedVersion,
                apkUrl: cachedApkUrl,
                releaseNotes: cachedNotes,
                releaseUrl: cachedReleaseUrl,
                apkSizeBytes: cachedSize ? Number(cachedSize) : null,
                lastChecked: lastCheck,
              }));
              return;
            }
            setState((s) => ({
              ...s,
              status: 'up-to-date',
              lastChecked: lastCheck,
              remoteVersion: cachedVersion || getCurrentVersion(),
            }));
            return;
          }
        }
      } catch {
        // Ignore cache errors, proceed with fresh check
      }
    }

    try {
      setState((s) => ({ ...s, status: 'checking', error: null }));

      const res = await fetchWithTimeout(GITHUB_RELEASES_URL);

      if (!res.ok) {
        if (res.status === 404) {
          // No releases published yet
          setState((s) => ({
            ...s,
            status: 'up-to-date',
            lastChecked: new Date().toISOString(),
            remoteVersion: getCurrentVersion(),
          }));
          await setSyncMeta('lastUpdateCheck', new Date().toISOString());
          return;
        }
        if (res.status === 401 || res.status === 403) {
          // Private repo or auth required — silently treat as up-to-date
          setState((s) => ({
            ...s,
            status: 'up-to-date',
            lastChecked: new Date().toISOString(),
            remoteVersion: getCurrentVersion(),
          }));
          await setSyncMeta('lastUpdateCheck', new Date().toISOString());
          return;
        }
        throw new Error(`Update check failed (${res.status})`);
      }

      const release = await res.json();
      const tagVersion = (release.tag_name || '').replace(/^v/, '');
      const currentVersion = getCurrentVersion();

      // Find APK asset in release
      const apkAsset = (release.assets || []).find(
        (asset: { name?: string }) => asset.name?.endsWith('.apk'),
      );

      const apkUrl = apkAsset?.browser_download_url || null;
      const apkSize = apkAsset?.size || null;
      const releaseNotes = release.body || null;
      const releaseUrl = release.html_url || null;

      // Cache results in SQLite
      await setSyncMeta('lastUpdateCheck', new Date().toISOString());
      if (tagVersion) await setSyncMeta('latestRemoteVersion', tagVersion);
      if (apkUrl) await setSyncMeta('latestApkUrl', apkUrl);
      if (releaseNotes) await setSyncMeta('latestReleaseNotes', releaseNotes);
      if (releaseUrl) await setSyncMeta('latestReleaseUrl', releaseUrl);
      if (apkSize) await setSyncMeta('latestApkSize', String(apkSize));

      if (tagVersion && compareVersions(tagVersion, currentVersion) > 0) {
        setState({
          status: 'update-available',
          error: null,
          lastChecked: new Date().toISOString(),
          apkUrl,
          releaseUrl,
          releaseNotes,
          remoteVersion: tagVersion,
          currentVersion,
          downloadProgress: 0,
          downloadedFilePath: null,
          apkSizeBytes: apkSize,
        });
      } else {
        setState({
          status: 'up-to-date',
          error: null,
          lastChecked: new Date().toISOString(),
          apkUrl: null,
          releaseUrl: null,
          releaseNotes: null,
          remoteVersion: tagVersion || currentVersion,
          currentVersion,
          downloadProgress: 0,
          downloadedFilePath: null,
          apkSizeBytes: null,
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

  // ── Download APK with progress ──
  const downloadUpdate = useCallback(async () => {
    if (!state.apkUrl) return;

    const fileName = `velum-v${state.remoteVersion}-arm64.apk`;
    const fileUri = documentDirectory + fileName;

    try {
      // Clean up any previous download (new File API — no deprecation warning)
      cleanupFile(fileUri);

      setState((s) => ({ ...s, status: 'downloading', downloadProgress: 0, error: null }));

      const downloadResumable = createDownloadResumable(
        state.apkUrl,
        fileUri,
        {
          headers: { Accept: 'application/octet-stream' },
        },
        (progress) => {
          const pct =
            progress.totalBytesExpectedToWrite > 0
              ? progress.totalBytesWritten / progress.totalBytesExpectedToWrite
              : 0;
          setState((s) => ({ ...s, downloadProgress: pct }));
        },
      );

      downloadRef.current = downloadResumable;

      const result = await downloadResumable.downloadAsync();

      if (result?.uri) {
        setState((s) => ({
          ...s,
          status: 'downloaded',
          downloadedFilePath: result.uri,
          downloadProgress: 1,
        }));
      } else {
        throw new Error('Download returned no result');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed';
      setState((s) => ({
        ...s,
        status: 'error',
        error: message,
        downloadProgress: 0,
      }));
    }
  }, [state.apkUrl, state.remoteVersion]);

  // ── Install downloaded APK ──
  const installUpdate = useCallback(async () => {
    const filePath = state.downloadedFilePath;
    if (!filePath) return;

    try {
      setState((s) => ({ ...s, status: 'installing' }));

      // Try to open with Android content URI (triggers package installer)
      if (Platform.OS === 'android') {
        try {
          const contentUri = await getContentUriAsync(filePath);
          const canOpen = await Linking.canOpenURL(contentUri);
          if (canOpen) {
            await Linking.openURL(contentUri);
            return;
          }
        } catch (uriError) {
          console.warn('Content URI install failed:', uriError);
        }
      }

      // Fallback: open APK download URL directly in browser
      if (state.apkUrl) {
        const canOpen = await Linking.canOpenURL(state.apkUrl);
        if (canOpen) {
          await Linking.openURL(state.apkUrl);
          return;
        }
      }

      // Final fallback: open GitHub release page
      if (state.releaseUrl) {
        await Linking.openURL(state.releaseUrl);
      }
    } catch {
      Alert.alert(
        'Install Manually',
        `Open this URL in your browser to download:\n\n${state.releaseUrl || state.apkUrl}`,
      );
      setState((s) => ({ ...s, status: 'downloaded' }));
    }
  }, [state.downloadedFilePath, state.apkUrl, state.releaseUrl]);

  // ── One-tap: download then install ──
  const downloadAndInstall = useCallback(async () => {
    if (!state.apkUrl) return;

    const fileName = `velum-v${state.remoteVersion}-arm64.apk`;
    const fileUri = documentDirectory + fileName;

    try {
      // Clean up previous download
      cleanupFile(fileUri);

      setState((s) => ({ ...s, status: 'downloading', downloadProgress: 0, error: null }));

      const downloadResumable = createDownloadResumable(
        state.apkUrl,
        fileUri,
        { headers: { Accept: 'application/octet-stream' } },
        (progress) => {
          const pct =
            progress.totalBytesExpectedToWrite > 0
              ? progress.totalBytesWritten / progress.totalBytesExpectedToWrite
              : 0;
          setState((s) => ({ ...s, downloadProgress: pct }));
        },
      );

      downloadRef.current = downloadResumable;
      const result = await downloadResumable.downloadAsync();

      if (!result?.uri) throw new Error('Download failed');

      setState((s) => ({
        ...s,
        status: 'downloaded',
        downloadedFilePath: result.uri,
        downloadProgress: 1,
      }));

      // Auto-trigger install
      setState((s) => ({ ...s, status: 'installing' }));

      if (Platform.OS === 'android') {
        try {
          const contentUri = await getContentUriAsync(result.uri);
          await Linking.openURL(contentUri);
          return;
        } catch {
          // fall through
        }
      }

      // Browser fallback
      if (state.apkUrl) {
        await Linking.openURL(state.apkUrl);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed';
      setState((s) => ({ ...s, status: 'error', error: message, downloadProgress: 0 }));
    }
  }, [state.apkUrl, state.remoteVersion]);

  // ── Manual check (always forces) ──
  const checkAndUpdate = useCallback(async () => {
    await checkForUpdate(true);
  }, [checkForUpdate]);

  // ── Auto-check on mount (respects cooldown) ──
  useEffect(() => {
    checkForUpdate(false);
  }, [checkForUpdate]);

  return {
    ...state,
    isUpdateAvailable: state.status === 'update-available',
    isChecking: state.status === 'checking',
    isDownloading: state.status === 'downloading',
    isDownloaded: state.status === 'downloaded',
    isInstalling: state.status === 'installing',
    checkAndUpdate,
    checkForUpdate,
    downloadUpdate,
    installUpdate,
    downloadAndInstall,
    formatBytes,
  };
}
