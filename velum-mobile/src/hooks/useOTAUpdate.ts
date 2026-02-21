import { useState, useEffect, useCallback } from 'react';
import { Alert, AppState } from 'react-native';
import * as Updates from 'expo-updates';

export type OTAStatus =
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'ready'
  | 'up-to-date'
  | 'error';

interface OTAUpdateState {
  status: OTAStatus;
  error: string | null;
  lastChecked: string | null;
}

/**
 * Hook for handling OTA (Over-The-Air) updates via expo-updates.
 *
 * OTA updates push new JS bundles directly to the app without requiring
 * a full APK rebuild. This handles ~90% of updates (UI changes, logic fixes,
 * new features that don't need native modules).
 *
 * For native changes (new permissions, native modules, SDK upgrades),
 * the existing useAppUpdate hook handles APK downloads via GitHub Releases.
 */
export function useOTAUpdate() {
  const [state, setState] = useState<OTAUpdateState>({
    status: 'idle',
    error: null,
    lastChecked: null,
  });

  const checkAndApply = useCallback(async (silent = true) => {
    // expo-updates APIs are not available in dev mode
    if (__DEV__) {
      setState((s) => ({ ...s, status: 'up-to-date', lastChecked: new Date().toISOString() }));
      return;
    }

    try {
      setState((s) => ({ ...s, status: 'checking', error: null }));

      const checkResult = await Updates.checkForUpdateAsync();

      if (!checkResult.isAvailable) {
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

      if (silent) {
        // Apply on next app restart — no interruption
        // The update will load automatically when the user next opens the app
      } else {
        // User-initiated check — ask if they want to restart now
        Alert.alert(
          'Update Ready',
          'A new version has been downloaded. Restart now to apply?',
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Restart',
              onPress: () => Updates.reloadAsync(),
            },
          ],
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OTA update check failed';
      // Don't bother the user with silent check failures
      setState((s) => ({
        ...s,
        status: 'error',
        error: message,
        lastChecked: new Date().toISOString(),
      }));
    }
  }, []);

  // Check for OTA updates on mount (silent)
  useEffect(() => {
    if (__DEV__) return;

    checkAndApply(true);

    // Also check when app comes to foreground
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkAndApply(true);
      }
    });

    return () => sub.remove();
  }, [checkAndApply]);

  const manualCheck = useCallback(() => checkAndApply(false), [checkAndApply]);

  const restart = useCallback(() => {
    if (!__DEV__) {
      Updates.reloadAsync();
    }
  }, []);

  return {
    ...state,
    isReady: state.status === 'ready',
    isChecking: state.status === 'checking',
    isDownloading: state.status === 'downloading',
    manualCheck,
    restart,
    channel: Updates.channel || 'default',
    runtimeVersion: Updates.runtimeVersion || 'unknown',
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
  };
}
