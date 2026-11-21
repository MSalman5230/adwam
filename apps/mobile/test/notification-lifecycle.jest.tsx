import { afterEach, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { useNotificationLifecycle } from '../src/services/notification-lifecycle';
import { syncSchedule } from '../src/services/notification-schedule';
import { settingsStore, trackersStore } from '../src/state/native';
import { defaultSettings, defaultTrackers } from '../src/state/schema';

jest.mock('../src/services/notification-schedule', () => ({ syncSchedule: jest.fn() }));
jest.mock('../src/services/notification-action-task', () => ({ registerNotificationActionTask: async () => {} }));
jest.mock('../src/services/reminder-maintenance-task', () => ({ registerReminderMaintenance: async () => {} }));

afterEach(() => {
  jest.restoreAllMocks();
  settingsStore.getState().update(defaultSettings);
  trackersStore.getState().update(defaultTrackers);
});

it('resyncs at launch, on edits, and when returning to the active app', async () => {
  const remove = jest.fn();
  const subscribe = jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove });
  const { unmount } = await renderHook(useNotificationLifecycle);
  expect(syncSchedule).toHaveBeenCalledTimes(1);

  const foreground = subscribe.mock.calls[0]?.[1];
  await act(() => {
    settingsStore.getState().update((value) => ({ ...value, reminders: { ...value.reminders, eclipseQuiet: true } }));
    trackersStore.getState().update((value) => ({ ...value, done: { 'example:2026-12-18': true } }));
    foreground?.('background');
  });
  expect(syncSchedule).toHaveBeenCalledTimes(3);
  await act(() => { foreground?.('active'); });
  expect(syncSchedule).toHaveBeenCalledTimes(4);

  await unmount();
  expect(remove).toHaveBeenCalledTimes(1);
  settingsStore.getState().update(defaultSettings);
  expect(syncSchedule).toHaveBeenCalledTimes(4);
});
