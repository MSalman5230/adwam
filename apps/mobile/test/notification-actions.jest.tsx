import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { laterFor } from '@adwam/core';
import { dismissNotificationAsync, getAllScheduledNotificationsAsync, type NotificationResponse } from 'expo-notifications';

import { handleReminderAction } from '../src/services/notification-actions';
import { scheduleCalendarNotification } from '../src/services/notification-request';
import { syncSchedule } from '../src/services/notification-schedule';
import { settingsStore, trackersStore } from '../src/state/native';
import { defaultSettings, defaultTrackers } from '../src/state/schema';

jest.mock('@adwam/core', () => ({ ...jest.requireActual<Record<string, unknown>>('@adwam/core'), laterFor: jest.fn() }));
jest.mock('@adwam/content/catalog', () => ({ sunnahs: [] }), { virtual: true });
jest.mock('expo-notifications', () => ({ dismissNotificationAsync: jest.fn(), getAllScheduledNotificationsAsync: jest.fn() }));
jest.mock('../src/services/notification-schedule', () => ({ syncSchedule: jest.fn() }));
jest.mock('../src/services/notification-request', () => ({
  calendarNotification: 'adwam-calendar', snoozeSuffix: '|later', scheduleCalendarNotification: jest.fn(),
}));

const doneKey = 'example:2026-12-18';
const id = `${doneKey}|main`;
const time = Date.UTC(2026, 11, 18, 12);
function response(actionIdentifier: string, identifier = id): NotificationResponse {
  return { actionIdentifier, notification: { date: time, request: {
    identifier, trigger: { type: 'unknown' },
    content: {
      title: null, subtitle: null, body: null, categoryIdentifier: null, sound: null, threadIdentifier: null,
      data: { kind: 'adwam-calendar', doneKey },
    },
  } } };
}

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(time);
  settingsStore.getState().update((settings) => ({ ...settings, setupDone: true, location: {
    source: 'city', name: 'London', countryCode: 'GB', latitude: 51.5, longitude: -0.12, timeZone: 'Europe/London',
  } }));
});

afterEach(() => {
  jest.restoreAllMocks();
  settingsStore.getState().update(defaultSettings);
  trackersStore.getState().update(defaultTrackers);
});

it('records Done once and refreshes the real schedule without navigating', async () => {
  const action = response('done');
  await Promise.all([handleReminderAction(action), handleReminderAction(action)]);
  await handleReminderAction(action);
  expect(trackersStore.getState().value.done).toEqual({ [doneKey]: true });
  expect(syncSchedule).toHaveBeenCalledTimes(1);
  expect(dismissNotificationAsync).toHaveBeenCalledWith(id);
});

it('reads a background Android action before Expo has mapped the notification data', async () => {
  const action = response('done');
  const request = action.notification.request;
  const raw = { ...request.content, data: undefined, dataString: JSON.stringify(request.content.data) };
  request.content = raw;
  expect(await handleReminderAction(action)).toBe(true);
  expect(trackersStore.getState().value.done[doneKey]).toBe(true);
});

it('queues one Later copy while the core window permits it', async () => {
  const action = response('later');
  const copy = {
    id: id + '|later', channel: 'weekly' as const, at: time + 60 * 60_000, title: 'Example', body: 'Example',
    buttons: ['done'] as const, hash: 'fresh', link: '/today', doneKey,
  };
  jest.mocked(laterFor).mockReturnValue(copy);
  jest.mocked(getAllScheduledNotificationsAsync).mockResolvedValueOnce([])
    .mockResolvedValue([response('later', copy.id).notification.request]);
  await Promise.all([handleReminderAction(action), handleReminderAction(action)]);
  await handleReminderAction(action);
  await handleReminderAction(response('later', copy.id));
  expect(laterFor).toHaveBeenCalledTimes(1);
  expect(scheduleCalendarNotification).toHaveBeenCalledTimes(1);
  expect(scheduleCalendarNotification).toHaveBeenCalledWith(copy);
});

it('dismisses an expired reminder when Later can no longer schedule it', async () => {
  jest.mocked(getAllScheduledNotificationsAsync).mockResolvedValue([]);
  expect(await handleReminderAction(response('later'))).toBe(false);
  expect(scheduleCalendarNotification).not.toHaveBeenCalled();
  expect(dismissNotificationAsync).toHaveBeenCalledWith(id);
});
