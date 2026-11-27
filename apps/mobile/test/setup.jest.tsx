import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SetupScreen from '../src/app/setup';
import { t } from '../src/language/messages';
import type { NamedCity } from '../src/location/cities';
import { requestSetupNotifications } from '../src/services/setup-notifications';
import { settingsStore } from '../src/state/native';
import { defaultSettings } from '../src/state/schema';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { setFixedClock } from './fixed-clock';

const mockReplace = jest.fn();
const mockNavigate = jest.fn();
jest.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
  useFocusEffect: () => {},
  useRouter: () => ({ replace: mockReplace, navigate: mockNavigate }),
}));
jest.mock('@adwam/content/catalog', () => ({ sunnahs: [] }), { virtual: true });
jest.mock('../src/services/setup-notifications', () => ({ requestSetupNotifications: jest.fn() }));
jest.mock('../src/services/usage-statistics', () => ({ track: jest.fn() }));
jest.mock('../src/location/current-city', () => ({ locateCurrentCity: jest.fn() }));
jest.mock('../src/location/CityPicker', () => {
  const london: NamedCity = {
    id: 2643743, name: 'London', asciiName: 'London', population: 8_961_989, country: 'United Kingdom',
    countryCode: 'GB', latitude: 51.5085, longitude: -0.1257, timeZone: 'Europe/London',
  };
  const { Pressable: MockPressable, Text: MockText } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    CityPicker: ({ open, onPick }: { open: boolean; onPick: (city: NamedCity) => void }) => open
      ? <MockPressable accessibilityRole="button" onPress={() => onPick(london)}><MockText>London</MockText></MockPressable> : null,
  };
});

beforeEach(async () => {
  jest.clearAllMocks();
  await setFixedClock(Date.UTC(2026, 11, 14, 15, 0));
});

afterEach(async () => {
  await setFixedClock(null);
  settingsStore.getState().update(defaultSettings);
});

async function reachPrayerStep() {
  await render(<SafeAreaProvider initialMetrics={{
    frame: { x: 0, y: 0, width: 412, height: 915 },
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
  }}><ThemeProvider><SetupScreen /></ThemeProvider></SafeAreaProvider>);
  await fireEvent.press(screen.getByRole('button', { name: t('setup.location.pickCity') }));
  await fireEvent.press(screen.getByRole('button', { name: 'London' }));
  await fireEvent.press(screen.getByRole('button', { name: t('common.continue') }));
  expect(screen.getByRole('header', { name: t('setup.prayers.title') })).toBeOnTheScreen();
  expect(screen.getByText(t('setup.step', { step: 3, total: 5 }))).toBeOnTheScreen();
  expect(screen.getByText(t('setup.prayers.method', { method: t('settings.prayerMethodsShort.mwl') }))).toBeOnTheScreen();
}

const radio = (name: string) => screen.getByRole('radio', { name: new RegExp(`^${name}`) });

it('asks about prayer times, preselects Push and skips notifications for in-app choices', async () => {
  await reachPrayerStep();
  expect(radio(t('reminders.push'))).toBeChecked();
  await fireEvent.press(radio(t('reminders.inapp')));
  expect(radio(t('reminders.inapp'))).toBeChecked();
  await fireEvent.press(screen.getByRole('button', { name: t('common.continue') }));
  expect(screen.getByRole('header', { name: t('setup.reminders.title') })).toBeOnTheScreen();
  await fireEvent.press(radio(t('reminders.inappOnly')));
  await fireEvent.press(screen.getByRole('button', { name: t('common.continue') }));

  const { setupDone, reminders } = settingsStore.getState().value;
  expect(setupDone).toBe(true);
  expect(reminders.choice.prayers).toBe('inapp');
  expect(reminders.notifications).toBe('unset');
  expect(requestSetupNotifications).not.toHaveBeenCalled();
  expect(mockReplace).toHaveBeenCalledWith({ pathname: '/today', params: { setup: '1' } });
});

it('asks for notifications when only prayer times will push', async () => {
  jest.mocked(requestSetupNotifications).mockResolvedValue('granted');
  await reachPrayerStep();
  await fireEvent.press(screen.getByRole('button', { name: t('common.continue') }));
  await fireEvent.press(radio(t('reminders.inappOnly')));
  await fireEvent.press(screen.getByRole('button', { name: t('common.continue') }));

  expect(screen.getByRole('header', { name: t('setup.notifications.title') })).toBeOnTheScreen();
  expect(screen.getByText(t('setup.notifications.prayers'))).toBeOnTheScreen();
  expect(screen.queryByText(t('setup.notifications.fasts'))).toBeNull();
  expect(screen.getByText(t('reminder.prayers.pushTitle', { prayer: t('calendar.prayer.maghrib') }))).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: t('common.continue') }));

  const { reminders } = settingsStore.getState().value;
  expect(requestSetupNotifications).toHaveBeenCalledTimes(1);
  expect(reminders.notifications).toBe('granted');
  expect(reminders.choice).toEqual({ prayers: 'push' });
});

it('keeps prayer times off when the user says so', async () => {
  await reachPrayerStep();
  await fireEvent.press(radio(t('reminders.off')));
  await fireEvent.press(screen.getByRole('button', { name: t('common.continue') }));
  await fireEvent.press(screen.getByRole('button', { name: t('common.continue') }));
  expect(screen.getByRole('header', { name: t('setup.notifications.title') })).toBeOnTheScreen();
  expect(screen.queryByText(t('setup.notifications.prayers'))).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: t('common.notNow') }));
  expect(settingsStore.getState().value.reminders.choice).toEqual({});
});
