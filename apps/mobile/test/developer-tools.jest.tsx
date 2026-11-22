import { afterEach, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DeveloperTools from '../src/app/debug';
import { t } from '../src/language/messages';
import { serverCacheStore, settingsStore } from '../src/state/native';
import { defaultServerCache, defaultSettings } from '../src/state/schema';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { setFixedClock } from './fixed-clock';

const mockDismiss = jest.fn();
jest.mock('expo-router', () => ({
  Link: () => null,
  useRouter: () => ({ dismissTo: mockDismiss }),
}));
jest.mock('@adwam/content/catalog', () => ({ sunnahs: [] }), { virtual: true });
jest.mock('expo-notifications', () => ({
  addNotificationReceivedListener: () => ({ remove: jest.fn() }),
  getAllScheduledNotificationsAsync: async () => [],
}));
jest.mock('../src/services/crash-reporting', () => ({ canTestCrashReporting: false }));
jest.mock('../src/services/supabase', () => ({ checkLocalSupabase: () => undefined }));

afterEach(async () => {
  await setFixedClock(null);
  settingsStore.getState().update(defaultSettings);
  serverCacheStore.getState().update(defaultServerCache);
});

it('simulates rain and an offer for the active location and opens Today', async () => {
  const now = Date.UTC(2026, 11, 18, 11, 30);
  await setFixedClock(now);
  settingsStore.getState().update((settings) => ({ ...settings, setupDone: true, location: {
    source: 'city', name: 'London', countryCode: 'GB', latitude: 51.5, longitude: -0.12, timeZone: 'Europe/London',
  } }));
  await render(<SafeAreaProvider initialMetrics={{
    frame: { x: 0, y: 0, width: 412, height: 915 },
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
  }}><ThemeProvider><DeveloperTools /></ThemeProvider></SafeAreaProvider>);

  const rain = () => screen.getByRole('button', { name: t('developerTools.simulateRain') });
  await fireEvent.press(rain());
  await fireEvent.press(rain());
  expect(serverCacheStore.getState().value.events).toEqual([
    { id: 'debug-rain', weather: 'rain-start', start: now, end: now + 3 * 60 * 60_000 },
  ]);
  await fireEvent.press(screen.getByRole('button', { name: t('developerTools.correction') }));
  expect(serverCacheStore.getState().value.correctionOffer).toMatchObject({ region: 'London', countryCode: 'GB' });
  expect(mockDismiss).toHaveBeenLastCalledWith('/today');
});
