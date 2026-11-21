import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { useStore } from 'zustand';

import { startCrashReporting } from '../services/crash-reporting';
import { settingsStore } from '../state/native';
import { useForegroundClock } from '../state/useClock';
import { bundledFonts } from '../theme/fonts';
import { isTestBuild } from '../theme/isTestBuild';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';

startCrashReporting();

export const unstable_settings = { anchor: '(tabs)' };

function Navigator() {
  const { palette } = useTheme();
  const setupDone = useStore(settingsStore, ({ value }) => value.setupDone);
  const [loaded, error] = useFonts(bundledFonts);
  if (!loaded && !error) return null;
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: palette.paper } }}>
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Protected guard={!setupDone} redirectTo="/today">
        <Stack.Screen name="setup/index" options={{ animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={setupDone} redirectTo="/setup">
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="item/[id]" />
        <Stack.Screen name="reminders" />
        <Stack.Screen name="about" />
      </Stack.Protected>
      <Stack.Protected guard={isTestBuild} redirectTo="/">
        <Stack.Screen name="debug/index" />
        <Stack.Screen name="debug/components" />
        <Stack.Screen name="debug/theme" />
        <Stack.Screen name="debug/clock" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  useForegroundClock();
  return (
    <ThemeProvider>
      <Navigator />
    </ThemeProvider>
  );
}
