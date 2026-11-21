import type { PlannedNotification } from '@adwam/core';
import { scheduleNotificationAsync, SchedulableTriggerInputTypes, type NotificationRequest } from 'expo-notifications';

import { notificationCategory } from './notification-presentation';

export const calendarNotification = 'adwam-calendar';
export const snoozeSuffix = '|later';

export function scheduledTime(trigger: NotificationRequest['trigger']): number | undefined {
  if (trigger && 'value' in trigger && typeof trigger.value === 'number') return trigger.value;
}

export function scheduleCalendarNotification(push: PlannedNotification): Promise<string> {
  return scheduleNotificationAsync({
    identifier: push.id,
    content: {
      title: push.title,
      body: push.body,
      categoryIdentifier: notificationCategory(push.buttons),
      data: { kind: calendarNotification, hash: push.hash, link: push.link, ...(push.doneKey && { doneKey: push.doneKey }) },
    },
    trigger: { type: SchedulableTriggerInputTypes.DATE, date: push.at, channelId: push.channel },
  });
}
