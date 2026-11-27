import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { day, reminderPrayers } from '@adwam/core';
import {
  cancelScheduledNotificationAsync, getAllScheduledNotificationsAsync, scheduleNotificationAsync,
  type NotificationRequest, type NotificationRequestInput,
} from 'expo-notifications';

import { syncSchedule } from '../src/services/notification-schedule';
import { settingsStore } from '../src/state/native';
import { defaultSettings, type Settings } from '../src/state/schema';

jest.mock('@adwam/content/catalog', () => ({ sunnahs: [] }), { virtual: true });
jest.mock('expo-notifications', () => ({
  cancelScheduledNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));
jest.mock('../src/services/crash-reporting', () => ({ recordScheduleCounts: jest.fn() }));
jest.mock('../src/services/notification-permissions', () => ({ refreshNotificationPermissions: async () => {} }));
jest.mock('../src/services/notification-presentation', () => ({
  notificationCategory: () => 'adwam-done-and-later',
  registerNotificationPresentation: () => Promise.resolve(),
}));

const location = {
  source: 'city', name: 'London', countryCode: 'GB', latitude: 51.5074, longitude: -0.1278, timeZone: 'Europe/London',
} as const;
const now = Date.UTC(2026, 11, 14, 0, 0);
let native: NotificationRequest[] = [];

function trigger(input: NotificationRequestInput) {
  const date = input.trigger && 'date' in input.trigger ? input.trigger.date : undefined;
  if (typeof date !== 'number') throw new Error('Expected a date trigger');
  return { date, channelId: input.trigger && 'channelId' in input.trigger ? input.trigger.channelId : undefined };
}

beforeEach(() => {
  jest.clearAllMocks();
  native = [];
  jest.spyOn(Date, 'now').mockReturnValue(now);
  jest.mocked(getAllScheduledNotificationsAsync).mockImplementation(async () => native);
  jest.mocked(cancelScheduledNotificationAsync).mockImplementation(async (id) => {
    native = native.filter(({ identifier }) => identifier !== id);
  });
  jest.mocked(scheduleNotificationAsync).mockImplementation(async (input) => {
    const identifier = input.identifier!;
    native = [...native.filter((request) => request.identifier !== identifier), {
      identifier,
      content: { ...input.content, data: input.content.data ?? {} } as NotificationRequest['content'],
      trigger: { type: 'date', value: trigger(input).date } as unknown as NotificationRequest['trigger'],
    }];
    return identifier;
  });
  settingsStore.getState().update((settings) => ({
    ...settings, setupDone: true, location,
    reminders: { ...settings.reminders, notifications: 'granted', choice: { prayers: 'push' } },
  }));
});

afterEach(() => {
  jest.restoreAllMocks();
  settingsStore.getState().update(defaultSettings);
});

const fajr = 'prayers.fajr:2026-12-14|main';
const times = (prayer: Settings['prayer']) => day('2026-12-14', { place: location, prayer, hijri: { method: 'umalqura' } }).times;
const scheduledAt = (id: string) => {
  const request = native.find(({ identifier }) => identifier === id);
  return request && 'value' in request.trigger! ? request.trigger.value : undefined;
};

it('schedules two weeks of prayer pushes on the Prayer times channel', async () => {
  await syncSchedule();
  expect(native).toHaveLength(70);
  const today = times(settingsStore.getState().value.prayer);
  for (const prayer of reminderPrayers) expect(scheduledAt(`prayers.${prayer}:2026-12-14|main`)).toBe(today[prayer]);
  expect(scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
    identifier: fajr,
    content: expect.objectContaining({ title: 'Time for Fajr', data: expect.objectContaining({ doneKey: 'prayers.fajr:2026-12-14' }) }),
    trigger: { type: 'date', date: today.fajr, channelId: 'daily' },
  }));
});

it('moves the scheduled prayer pushes to the new calculation method', async () => {
  await syncSchedule();
  const before = settingsStore.getState().value.prayer;
  const after = { ...before, method: 'isna' } as const;
  expect(times(after).fajr).not.toBe(times(before).fajr);
  jest.clearAllMocks();

  settingsStore.getState().update((settings) => ({ ...settings, prayer: after }));
  await syncSchedule();

  expect(native).toHaveLength(70);
  expect(scheduledAt(fajr)).toBe(times(after).fajr);
  expect(scheduledAt('prayers.isha:2026-12-14|main')).toBe(times(after).isha);
  expect(cancelScheduledNotificationAsync).toHaveBeenCalledWith(fajr);
  // Ẓuhr doesn't depend on the method's angles, so it stays scheduled as it was.
  expect(cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('prayers.dhuhr:2026-12-14|main');
});

it('cancels every prayer push when the reminder is set to In-app', async () => {
  await syncSchedule();
  settingsStore.getState().update((settings) => ({ ...settings, reminders: { ...settings.reminders, choice: { prayers: 'inapp' } } }));
  await syncSchedule();
  expect(native).toEqual([]);
});
