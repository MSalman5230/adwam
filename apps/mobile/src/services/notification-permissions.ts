import { AndroidImportance, getNotificationChannelsAsync, getPermissionsAsync, type NotificationPermissionsStatus } from 'expo-notifications';
import { Platform } from 'react-native';

import { settingsStore } from '../state/native';
import type { Settings } from '../state/schema';
import { calendarChannels } from './notification-presentation';

export function notificationPermission(response: NotificationPermissionsStatus): Settings['reminders']['notifications'] {
  if (response.granted) return 'granted';
  return response.status === 'denied' ? 'denied' : 'unset';
}

export async function refreshNotificationPermissions() {
  if (!settingsStore.getState().value.setupDone) return;
  const [response, nativeChannels] = await Promise.all([
    getPermissionsAsync(),
    Platform.OS === 'android' ? getNotificationChannelsAsync() : [],
  ]);
  const permission = notificationPermission(response);
  const { value, update } = settingsStore.getState();
  const { reminders } = value;
  if (!value.setupDone) return;

  const channels = { ...reminders.channels };
  let changed = permission !== reminders.notifications;
  for (const id of calendarChannels) {
    const channel = nativeChannels.find((item) => item.id === id);
    if (!channel) continue;
    const allowed = channel.importance !== AndroidImportance.NONE;
    if (channels[id] !== allowed) {
      channels[id] = allowed;
      changed = true;
    }
  }
  if (changed) update((previous) => ({ ...previous, reminders: { ...previous.reminders, channels, notifications: permission } }));
}
