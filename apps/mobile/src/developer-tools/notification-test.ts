import type { PlannedNotification } from '@adwam/core';
import {
  cancelScheduledNotificationAsync, getPermissionsAsync, scheduleNotificationAsync,
  SchedulableTriggerInputTypes,
} from 'expo-notifications';

import { notificationCategory, registerNotificationPresentation } from '../services/notification-presentation';

export async function scheduleDebugPush(push: PlannedNotification): Promise<'scheduled' | 'disabled'> {
  const permission = await getPermissionsAsync();
  if (!permission.granted) return 'disabled';

  const identifier = 'debug-next-push';
  await registerNotificationPresentation();
  await cancelScheduledNotificationAsync(identifier);
  await scheduleNotificationAsync({
    identifier,
    content: {
      title: push.title, body: push.body, categoryIdentifier: notificationCategory(push.buttons),
      data: { link: push.link, debug: true },
    },
    trigger: { type: SchedulableTriggerInputTypes.DATE, channelId: push.channel, date: Date.now() + 10_000 },
  });
  return 'scheduled';
}
