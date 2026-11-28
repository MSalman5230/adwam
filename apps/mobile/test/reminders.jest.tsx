import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RemindersScreen from '../src/app/reminders';
import { t } from '../src/language/messages';
import { settingsStore } from '../src/state/native';
import * as reminderCatalog from '../src/state/reminder-catalog';
import { defaultSettings } from '../src/state/schema';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { setFixedClock } from './fixed-clock';

const mockDismiss = jest.fn();
const mockPush = jest.fn();
let mockFromSetup: string | undefined;
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ fromSetup: mockFromSetup }),
  useRouter: () => ({ dismissTo: mockDismiss, push: mockPush }),
}));
jest.mock('@adwam/content/catalog', () => {
  const example = { status: 'review', short: 'A practice.', when: 'After prayer.', what: ['A practice.'], evidence: [], duas: [], occurrences: [] };
  return { sunnahs: [
    { ...example, id: 'monthu', group: 'weekly', title: 'Fast on Mondays and Thursdays', tier: 'push' },
    { ...example, id: 'hidden', group: 'weekly', title: 'Hidden item', tier: 'inapp', hidden: true },
    { ...example, id: 'through-year', group: 'yearly', title: 'Through-year item', tier: 'inapp' },
    { ...example, id: 'hair-nails', group: 'yearly', month: 'dhul-hijjah', title: 'Hair and nails', tier: 'push', rules: ['requires-udhiyah'] },
    { ...example, id: 'disputed-item', group: 'disputed', title: 'Disputed item', tier: 'inapp', default: 'off' },
  ] };
}, { virtual: true });

beforeEach(async () => {
  settingsStore.getState().update((settings) => ({ ...settings, setupDone: true, location: {
    source: 'city', name: 'London', countryCode: 'GB', latitude: 51.5, longitude: -0.12, timeZone: 'Europe/London',
  } }));
  await setFixedClock(Date.UTC(2026, 11, 18, 11, 30));
});

afterEach(async () => {
  mockFromSetup = undefined;
  await setFixedClock(null);
  settingsStore.getState().update(defaultSettings);
});

const choices = (id: string) => within(screen.getByTestId(`reminders-${id}`));
// Prose keeps hyphenated words together with non-breaking hyphens.
const prose = (text: string) => text.replace(/(?<=\p{L})-(?=\p{L})/gu, '‑');

function renderReminders() {
  return render(<SafeAreaProvider initialMetrics={{
    frame: { x: 0, y: 0, width: 412, height: 915 },
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
  }}><ThemeProvider><RemindersScreen /></ThemeProvider></SafeAreaProvider>);
}

it('restores saved choices, re-enables an off group when edited, and resets the preset', async () => {
  await renderReminders();
  expect(screen.getByText(t('reminders.weekly', { count: 2 }))).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('radio', { name: t('reminders.inappOnly') }));
  expect(screen.getByText(t('reminders.noPushes'))).toBeOnTheScreen();

  const name = t('reminders.group.weekly');
  expect(screen.queryByText('Hidden item')).toBeNull();
  const switchForWeekly = () => screen.getByRole('switch', { name });
  const monday = () => choices('monthu');
  const inApp = () => monday().getByRole('radio', { name: t('reminders.inapp') });
  expect(inApp()).toBeChecked();
  await fireEvent.press(switchForWeekly());
  expect(screen.getByText(t('reminders.restoreChoices'))).toBeOnTheScreen();
  await fireEvent.press(switchForWeekly());
  expect(inApp()).toBeChecked();
  await fireEvent.press(switchForWeekly());
  await fireEvent.press(monday().getByRole('radio', { name: t('reminders.push') }));
  expect(switchForWeekly()).toBeChecked();

  // Changing the group manually leaves a distinct custom combination.
  await fireEvent.press(switchForWeekly());
  expect(screen.getByText(t('reminders.customChoices'))).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: t('common.reset') }));
  expect(switchForWeekly()).toBeChecked();
  expect(screen.getByRole('radio', { name: t('reminders.preferred') })).toBeChecked();
});

it('undoes a pause and preserves the setup Done action', async () => {
  mockFromSetup = '1';
  await renderReminders();
  const toggle = () => screen.getByRole('switch', { name: t('sheet.pause.title') });
  await fireEvent.press(toggle());
  expect(settingsStore.getState().value.reminders.pause).toEqual({ days: 7, until: '2026-12-24' });
  await fireEvent.press(screen.getByRole('button', { name: t('common.undo') }));
  expect(toggle()).not.toBeChecked();
  await fireEvent.press(toggle());
  await fireEvent.press(screen.getByRole('button', { name: t('reminders.pauseUntilOff') }));
  expect(settingsStore.getState().value.reminders.pause).toEqual({ until: null });
  await fireEvent.press(screen.getByRole('button', { name: t('common.done') }));
  expect(mockDismiss).toHaveBeenCalledWith({ pathname: '/today', params: { setup: '1' } });
});

it('exposes distinct switches for the Android reminder flow', async () => {
  await renderReminders();
  const monthly = () => screen.getByTestId('reminders-group-monthly-switch');
  const pause = () => screen.getByTestId('reminders-pause-switch');

  expect(monthly()).toBeChecked();
  expect(pause()).not.toBeChecked();
  await fireEvent.press(monthly());
  await fireEvent.press(pause());
  expect(monthly()).not.toBeChecked();
  expect(pause()).toBeChecked();
});

it('gates hair and nails by the yearly answer and offers no Push for disputed items', async () => {
  await renderReminders();
  await fireEvent.press(screen.getByRole('button', { name: t('reminders.group.weekly') }));
  const yearly = () => screen.getByRole('button', { name: t('reminders.group.yearly') });
  // The prayer-time card always offers Push, so count the others.
  const pushes = () => screen.queryAllByRole('radio', { name: t('reminders.push') }).length - 1;
  await fireEvent.press(yearly());
  expect(screen.getByRole('header', { name: t('reminders.throughYear') })).toBeOnTheScreen();
  expect(pushes()).toBe(0);
  await fireEvent.press(screen.getByRole('button', { name: t('reminders.setUdhiyah') }));
  await fireEvent.press(screen.getByRole('radio', { name: t('sheet.udhiyah.yes') }));
  expect(choices('hair-nails').getByRole('radio', { name: t('reminders.push') })).toBeOnTheScreen();
  await fireEvent.press(yearly());

  await fireEvent.press(screen.getByRole('button', { name: t('reminders.disputedTitle') }));
  expect(pushes()).toBe(0);
  await fireEvent.press(choices('disputed-item').getByRole('radio', { name: t('reminders.inapp') }));
  expect(screen.getByText(t('reminders.disputedOn', { count: 1 }).replace('in-app', 'in‑app'))).toBeOnTheScreen();
});

it('sets prayer-time reminders on their own, outside the presets', async () => {
  await renderReminders();
  const prayers = () => choices('prayers');
  expect(prayers().getByRole('radio', { name: t('reminders.off') })).toBeChecked();
  expect(screen.getByText(prose(t('reminders.prayers.off')))).toBeOnTheScreen();

  await fireEvent.press(prayers().getByRole('radio', { name: t('reminders.push') }));
  expect(settingsStore.getState().value.reminders.choice).toEqual({ prayers: 'push' });
  expect(screen.getByText(prose(t('reminders.prayers.push')))).toBeOnTheScreen();
  expect(screen.getByText(t('reminders.plus', { text: t('reminders.daily', { count: 5 }) }))).toBeOnTheScreen();
  expect(screen.getByRole('radio', { name: t('reminders.preferred') })).toBeChecked();

  await fireEvent.press(screen.getByRole('radio', { name: t('reminders.inappOnly') }));
  expect(screen.getByRole('radio', { name: t('reminders.inappOnly') })).toBeChecked();
  expect(prayers().getByRole('radio', { name: t('reminders.push') })).toBeChecked();
  expect(settingsStore.getState().value.reminders.choice).toEqual({ monthu: 'inapp', 'hair-nails': 'inapp', prayers: 'push' });

  await fireEvent.press(screen.getByRole('button', { name: t('reminders.prayers.title') }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/item/[id]', params: { id: 'prayers' } });
});

it('omits the Disputed group when no disputed reminders ship', async () => {
  const replacement = jest.replaceProperty(reminderCatalog, 'reminderCatalog',
    reminderCatalog.reminderCatalog.filter(({ group }) => group !== 'disputed'));
  try {
    await renderReminders();
    expect(screen.getByRole('button', { name: t('reminders.group.yearly') })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('reminders.disputedTitle') })).toBeNull();
    expect(screen.getByRole('button', { name: t('reminders.prayers.title') })).toBeOnTheScreen();
  } finally {
    replacement.restore();
  }
});
