import type { PlannedNotification } from '@adwam/core';
import {
  AndroidImportance, setNotificationCategoryAsync, setNotificationChannelAsync, type NotificationAction,
} from 'expo-notifications';
import { Platform } from 'react-native';

import { t } from '../language/messages';

export const reminderChannels = ['weekly', 'monthly', 'yearly', 'weather', 'corrections', 'corrections-silent'] as const;
const doneAndLater = 'adwam-done-and-later';
const laterOnly = 'adwam-later';

export function notificationCategory(buttons: PlannedNotification['buttons']): string | undefined {
  if (!buttons.includes('later')) return undefined;
  return buttons.includes('done') ? doneAndLater : laterOnly;
}

let registration: Promise<void> | undefined;

export function registerNotificationPresentation(): Promise<void> {
  registration ??= register().catch((error: unknown) => {
    registration = undefined;
    throw error;
  });
  return registration;
}

async function register() {
  if (Platform.OS === 'android') {
    await Promise.all(reminderChannels.map((id) => {
      const name = t(`notification.channel.${id}`);
      return setNotificationChannelAsync(id, id === 'corrections-silent'
        ? { name, importance: AndroidImportance.LOW, sound: null, enableVibrate: false }
        : { name, importance: AndroidImportance.DEFAULT });
    }));
  }
  const done: NotificationAction = { identifier: 'done', buttonTitle: t('common.done'), options: { opensAppToForeground: false } };
  const later: NotificationAction = { identifier: 'later', buttonTitle: t('common.later'), options: { opensAppToForeground: false } };
  await Promise.all([
    setNotificationCategoryAsync(doneAndLater, [done, later]),
    setNotificationCategoryAsync(laterOnly, [later]),
  ]);
}
