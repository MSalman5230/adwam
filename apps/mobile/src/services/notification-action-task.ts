import {
  BackgroundNotificationTaskResult, registerTaskAsync, type NotificationTaskPayload,
} from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import { handleReminderAction } from './notification-actions';

const task = 'adwam-notification-actions';

TaskManager.defineTask<NotificationTaskPayload>(task, async ({ data, error }) => {
  if (error || !data || !('actionIdentifier' in data)) return BackgroundNotificationTaskResult.NoData;
  return await handleReminderAction(data) ? BackgroundNotificationTaskResult.NewData : BackgroundNotificationTaskResult.NoData;
});

let registration: Promise<void> | undefined;

export function registerNotificationActionTask(): Promise<void> {
  registration ??= TaskManager.isTaskRegisteredAsync(task).then(async (registered) => {
    if (!registered) await registerTaskAsync(task);
  }).catch((error: unknown) => {
    registration = undefined;
    throw error;
  });
  return registration;
}
