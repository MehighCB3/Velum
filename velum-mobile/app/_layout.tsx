import React, { useEffect, useState, useCallback } from 'react';
import { Stack, ErrorBoundary } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '../src/theme/colors';
import { useOTAUpdate } from '../src/hooks/useOTAUpdate';
import { useVolumeShortcut } from '../src/hooks/useVolumeShortcut';
import { SmartScanModal } from '../src/components/SmartScanModal';

// Keep splash screen visible while we load resources
SplashScreen.preventAutoHideAsync();

export { ErrorBoundary };

export default function RootLayout() {
  const [smartScanOpen, setSmartScanOpen] = useState(false);

  // Check for OTA updates silently on every app launch + foreground
  useOTAUpdate();

  useEffect(() => {
    // Hide splash screen after initial render
    SplashScreen.hideAsync();
  }, []);

  // Double-press volume-down → Smart Scan (Android only, no-op on iOS)
  const openSmartScan = useCallback(() => {
    setSmartScanOpen(true);
  }, []);
  useVolumeShortcut(openSmartScan);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.sidebar },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>

      {/* Global Smart Scan — triggered by double-pressing volume-down */}
      <SmartScanModal
        visible={smartScanOpen}
        onClose={() => setSmartScanOpen(false)}
      />
    </>
  );
}
