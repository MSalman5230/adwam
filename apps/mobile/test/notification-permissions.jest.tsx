import { afterEach, expect, it, jest } from '@jest/globals';
import { AndroidImportance, getNotificationChannelsAsync, getPermissionsAsync, PermissionStatus } from 'expo-notifications';
import { Platform } from 'react-native';

import { refreshNotificationPermissions } from '../src/services/notification-permissions';
import { settingsStore } from '../src/state/native';
import { defaultSettings } from '../src/state/schema';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { NONE: 2, DEFAULT: 5 },
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied' },
  getPermissionsAsync: jest.fn(),
  getNotificationChannelsAsync: jest.fn(async () => [
    { id: 'weekly', importance: 2 }, { id: 'monthly', importance: 5 },
  ]),
}));

afterEach(() => {
  jest.restoreAllMocks();
  settingsStore.getState().update(defaultSettings);
});

it('uses the OS permission and channel switches without rewriting unchanged settings', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  settingsStore.getState().update((value) => ({ ...value, setupDone: true }));
  jest.mocked(getPermissionsAsync).mockResolvedValue({
    status: PermissionStatus.DENIED, granted: false, canAskAgain: false, expires: 'never',
  });

  await refreshNotificationPermissions();
  const saved = settingsStore.getState().value;
  expect(saved.reminders).toMatchObject({ notifications: 'denied', channels: { weekly: false, monthly: true } });
  await refreshNotificationPermissions();
  expect(settingsStore.getState().value).toBe(saved);

  jest.mocked(getPermissionsAsync).mockResolvedValue({
    status: PermissionStatus.GRANTED, granted: true, canAskAgain: true, expires: 'never',
  });
  const channels = await getNotificationChannelsAsync();
  jest.mocked(getNotificationChannelsAsync).mockResolvedValue(channels.map((channel) => ({ ...channel, importance: AndroidImportance.DEFAULT })));
  await refreshNotificationPermissions();
  expect(settingsStore.getState().value.reminders).toMatchObject({ notifications: 'granted', channels: { weekly: true } });
});
