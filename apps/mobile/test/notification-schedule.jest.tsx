import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { planNotifications, type PlannedNotification } from '@adwam/core';
import {
  cancelScheduledNotificationAsync, getAllScheduledNotificationsAsync, scheduleNotificationAsync,
  SchedulableTriggerInputTypes, type NotificationRequest,
} from 'expo-notifications';

import { syncSchedule } from '../src/services/notification-schedule';
import { recordScheduleCounts } from '../src/services/crash-reporting';
import { settingsStore } from '../src/state/native';
import { defaultSettings } from '../src/state/schema';

jest.mock('@adwam/core', () => ({ ...jest.requireActual<Record<string, unknown>>('@adwam/core'), planNotifications: jest.fn() }));
jest.mock('@adwam/content/catalog', () => ({ sunnahs: [] }), { virtual: true });
jest.mock('expo-notifications', () => ({
  cancelScheduledNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));
jest.mock('../src/services/crash-reporting', () => ({ recordScheduleCounts: jest.fn() }));
jest.mock('../src/services/notification-presentation', () => ({
  notificationCategory: () => 'adwam-later',
  registerNotificationPresentation: () => Promise.resolve(),
}));

const at = Date.UTC(2026, 11, 18, 12);
function item(id: string): PlannedNotification {
  return { id, at, channel: 'weekly', title: 'Example', body: 'Example body', buttons: ['later'], link: '/today', hash: 'fresh' };
}

function scheduled(identifier: string, hash = 'fresh', time = at, kind = 'adwam-calendar'): NotificationRequest {
  const trigger = { type: SchedulableTriggerInputTypes.DATE as const, date: time, value: time };
  return {
    identifier,
    content: { title: null, subtitle: null, body: null, categoryIdentifier: null, sound: null, threadIdentifier: null, data: { kind, hash } },
    trigger,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(at - 60_000);
  settingsStore.getState().update((settings) => ({ ...settings, setupDone: true, location: {
    source: 'city', name: 'London', countryCode: 'GB', latitude: 51.5, longitude: -0.12, timeZone: 'Europe/London',
  } }));
});

afterEach(() => {
  jest.restoreAllMocks();
  settingsStore.getState().update(defaultSettings);
});

it('reconciles content and time, leaves unmanaged notifications alone, and records counts', async () => {
  jest.mocked(planNotifications).mockReturnValue(['same', 'changed', 'moved', 'missing'].map(item));
  jest.mocked(getAllScheduledNotificationsAsync).mockResolvedValue([
    scheduled('same'), scheduled('changed', 'old'), scheduled('moved', 'fresh', at + 1),
    scheduled('obsolete'), scheduled('debug', 'fresh', at, 'debug'),
  ]);
  await syncSchedule();

  expect(jest.mocked(cancelScheduledNotificationAsync).mock.calls.map(([id]) => id)).toEqual(['changed', 'moved', 'obsolete']);
  expect(jest.mocked(scheduleNotificationAsync).mock.calls.map(([request]) => request.identifier)).toEqual(['changed', 'moved', 'missing']);
  expect(scheduleNotificationAsync).toHaveBeenLastCalledWith(expect.objectContaining({
    identifier: 'missing', trigger: { type: 'date', date: at, channelId: 'weekly' },
    content: expect.objectContaining({ data: { kind: 'adwam-calendar', hash: 'fresh', link: '/today' } }),
  }));
  expect(recordScheduleCounts).toHaveBeenLastCalledWith({ planned: 4, added: 3, cancelled: 3, kept: 1, failed: 0 });
});

it('queues one follow-up pass for updates during an active pass', async () => {
  let firstRead!: (result: NotificationRequest[]) => void;
  let started!: () => void;
  const requested = new Promise<void>((resolve) => { started = resolve; });
  const waitForNative = new Promise<NotificationRequest[]>((resolve) => { firstRead = resolve; });
  jest.mocked(planNotifications).mockReturnValue([]);
  jest.mocked(getAllScheduledNotificationsAsync).mockImplementationOnce(() => {
    started();
    return waitForNative;
  }).mockResolvedValue([]);

  const initial = syncSchedule();
  await requested;
  expect(syncSchedule()).toBe(initial);
  expect(syncSchedule()).toBe(initial);
  expect(getAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  firstRead([]);
  await initial;
  expect(getAllScheduledNotificationsAsync).toHaveBeenCalledTimes(2);
});
