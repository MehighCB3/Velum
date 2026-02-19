import React, { useEffect } from 'react';
import { Stack, ErrorBoundary } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '../src/theme/colors';
import { useOTAUpdate } from '../src/hooks/useOTAUpdate';

// Keep splash screen visible while we load resources
SplashScreen.preventAutoHideAsync();

export { ErrorBoundary };

export default function RootLayout() {
  // Check for OTA updates silently on every app launch + foreground
  useOTAUpdate();

  useEffect(() => {
    // Hide splash screen after initial render
    SplashScreen.hideAsync();
  }, []);

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
    </>
  );
}
