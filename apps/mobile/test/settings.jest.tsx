import { afterEach, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SettingsScreen from '../src/app/(tabs)/settings';
import { t } from '../src/language/messages';
import { settingsStore } from '../src/state/native';
import { defaultSettings } from '../src/state/schema';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { setFixedClock } from './fixed-clock';

const mockSetParams = jest.fn();
const mockPush = jest.fn();
let mockSheet: string | undefined;
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ sheet: mockSheet }),
  useRouter: () => ({ push: mockPush, setParams: mockSetParams }),
}));
jest.mock('@adwam/content/catalog', () => ({ sunnahs: [] }), { virtual: true });
jest.mock('../src/services/notification-schedule', () => ({ syncSchedule: jest.fn() }));

const zeroInsets = {
  frame: { x: 0, y: 0, width: 412, height: 915 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

afterEach(async () => {
  mockSheet = undefined;
  await setFixedClock(null);
  settingsStore.getState().update(defaultSettings);
});

it('saves the Hijri method and shift from the calendar sheet', async () => {
  mockSheet = 'hijri';
  settingsStore.getState().update((settings) => ({ ...settings, location: {
    source: 'city', name: 'London', countryCode: 'GB', latitude: 51.5, longitude: -0.12, timeZone: 'Europe/London',
  } }));
  await setFixedClock(Date.UTC(2026, 11, 18, 11, 30));
  await render(<SafeAreaProvider initialMetrics={zeroInsets}><ThemeProvider><SettingsScreen /></ThemeProvider></SafeAreaProvider>);

  await fireEvent.press(screen.getByText(t('sheet.hijri.civil')));
  await fireEvent.press(screen.getByRole('radio', { name: t('settings.shiftPlus') }));
  expect(settingsStore.getState().value.hijri).toMatchObject({ method: 'civil', shift: 1 });
});

it('pauses fasting reminders across the selected dates and resumes them', async () => {
  mockSheet = 'pause';
  settingsStore.getState().update((settings) => ({ ...settings, location: {
    source: 'city', name: 'London', countryCode: 'GB', latitude: 51.5, longitude: -0.12, timeZone: 'Europe/London',
  } }));
  await setFixedClock(Date.UTC(2026, 11, 18, 11, 30));
  await render(<SafeAreaProvider initialMetrics={zeroInsets}><ThemeProvider><SettingsScreen /></ThemeProvider></SafeAreaProvider>);

  await fireEvent.press(screen.getByRole('button', { name: t('reminders.pauseDays', { count: 7 }) }));
  expect(settingsStore.getState().value.reminders.pause).toEqual({ until: '2026-12-24', days: 7 });
  await fireEvent.press(screen.getByRole('button', { name: t('sheet.pause.resume') }));
  expect(settingsStore.getState().value.reminders.pause).toBeNull();
});

it('lets the user toggle crash reports by tapping the row label', async () => {
  mockSheet = 'privacy';
  settingsStore.getState().update((settings) => ({ ...settings, location: {
    source: 'city', name: 'London', countryCode: 'GB', latitude: 51.5, longitude: -0.12, timeZone: 'Europe/London',
  } }));
  await setFixedClock(Date.UTC(2026, 11, 18, 11, 30));
  await render(<SafeAreaProvider initialMetrics={zeroInsets}><ThemeProvider><SettingsScreen /></ThemeProvider></SafeAreaProvider>);

  await fireEvent.press(screen.getByText(t('sheet.privacy.crash')));
  expect(settingsStore.getState().value.crashReports).toBe(false);
  expect(screen.getByRole('switch', { name: t('sheet.privacy.crash') })).not.toBeChecked();
});

it('shows saved settings in the four groups and opens their destinations', async () => {
  settingsStore.getState().update((settings) => ({ ...settings, location: {
    source: 'city', name: 'London', countryCode: 'GB', latitude: 51.5, longitude: -0.12, timeZone: 'Europe/London',
  } }));
  await setFixedClock(Date.UTC(2026, 11, 18, 11, 30));
  await render(<SafeAreaProvider initialMetrics={zeroInsets}><ThemeProvider><SettingsScreen /></ThemeProvider></SafeAreaProvider>);

  for (const group of ['reminders', 'place', 'thisYear', 'app'] as const) {
    expect(screen.getByRole('header', { name: t(`settings.section.${group}`) })).toBeOnTheScreen();
  }
  expect(screen.getByText(t('settings.chosenCity', { city: 'London' }))).toBeOnTheScreen();
  expect(screen.getByText(t('settings.privacySummary'))).toBeOnTheScreen();
  await fireEvent.press(screen.getByText(t('settings.quietHours')));
  expect(mockSetParams).toHaveBeenCalledWith({ sheet: 'quiet' });
  await fireEvent.press(screen.getByText(t('settings.about')));
  expect(mockPush).toHaveBeenCalledWith('/about');
});
