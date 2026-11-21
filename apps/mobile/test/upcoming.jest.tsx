import { afterEach, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import UpcomingScreen from '../src/app/(tabs)/upcoming';
import { t } from '../src/language/messages';
import { settingsStore } from '../src/state/native';
import { defaultSettings } from '../src/state/schema';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { setFixedClock } from './fixed-clock';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@adwam/content/catalog', () => ({
  sunnahs: [{
    id: 'example-reminder', status: 'review', group: 'weekly', tier: 'inapp',
    title: 'Example reminder', short: 'An in-app practice.', what: ['An in-app practice.'],
    when: 'Monday morning.', evidence: [], duas: [],
    occurrences: [{ on: { weekday: ['mon'] }, window: { from: { prayer: 'fajr' }, to: { prayer: 'dhuhr' } } }],
  }],
}), { virtual: true });

const zeroInsets = {
  frame: { x: 0, y: 0, width: 412, height: 915 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

afterEach(async () => {
  await setFixedClock(null);
  settingsStore.getState().update(defaultSettings);
});

it('changes the selected filter and shows an empty state when no reminders notify', async () => {
  settingsStore.getState().update((settings) => ({ ...settings, location: {
    source: 'city', name: 'London', countryCode: 'GB', latitude: 51.5, longitude: -0.12, timeZone: 'Europe/London',
  } }));
  await setFixedClock(Date.UTC(2026, 11, 20, 10));
  await render(<SafeAreaProvider initialMetrics={zeroInsets}><ThemeProvider><UpcomingScreen /></ThemeProvider></SafeAreaProvider>);

  expect(screen.getAllByText('Example reminder').length).toBeGreaterThan(0);
  await fireEvent.press(screen.getByRole('button', { name: t('upcoming.filters.push') }));
  expect(screen.getByRole('button', { name: t('upcoming.filters.push') })).toBeSelected();
  expect(screen.getByText(t('upcoming.empty.title'))).toBeOnTheScreen();
  expect(screen.queryByText('Example reminder')).toBeNull();
});
