import { Stack } from 'expo-router';
import { useStore } from 'zustand';

import { ScreenRecovery } from '../components/ScreenRecovery';
import { useNotificationRouting } from '../navigation/useNotificationRouting';
import { useUsageScreens } from '../navigation/useUsageScreens';
import { startCrashReporting } from '../services/crash-reporting';
import { useNotificationLifecycle } from '../services/notification-lifecycle';
import { useServerSyncLifecycle } from '../services/server-sync-lifecycle';
import { useForegroundClock, useReminderStores } from '../state/useClock';
import { isTestBuild } from '../theme/isTestBuild';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';
import { DeviceMotionProvider, useDeviceReduceMotion } from '../theme/useDeviceReduceMotion';

startCrashReporting();

export const unstable_settings = { anchor: '(tabs)', screenErrorBoundary: ScreenRecovery };
export { ScreenRecovery as ErrorBoundary };

function Navigator() {
  const { palette } = useTheme();
  const reduced = useDeviceReduceMotion();
  const { settings } = useReminderStores();
  const setupDone = useStore(settings, ({ value }) => value.setupDone);
  useNotificationRouting(setupDone);
  return (
    <Stack screenOptions={{ headerShown: false, animation: reduced ? 'none' : 'slide_from_right', contentStyle: { backgroundColor: palette.paper } }}>
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Protected guard={!setupDone} redirectTo="/today">
        <Stack.Screen name="setup/index" options={{ animation: reduced ? 'none' : 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={setupDone} redirectTo="/setup">
        <Stack.Screen name="(tabs)" options={{ animation: reduced ? 'none' : 'fade' }} />
        <Stack.Screen name="item/[id]" />
        <Stack.Screen name="reminders" />
        <Stack.Screen name="about" />
      </Stack.Protected>
      {isTestBuild && <Stack.Protected guard={isTestBuild} redirectTo="/">
        <Stack.Screen name="debug/index" />
        <Stack.Screen name="debug/components" />
        <Stack.Screen name="debug/theme" />
        <Stack.Screen name="debug/clock" />
      </Stack.Protected>}
    </Stack>
  );
}

export default function RootLayout() {
  useForegroundClock();
  useNotificationLifecycle();
  useServerSyncLifecycle();
  useUsageScreens();
  return (
    <ThemeProvider>
      <DeviceMotionProvider><Navigator /></DeviceMotionProvider>
    </ThemeProvider>
  );
}
