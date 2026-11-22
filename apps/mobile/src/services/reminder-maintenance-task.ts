import { BackgroundTaskResult, registerTaskAsync } from 'expo-background-task';
import Constants from 'expo-constants';
import * as TaskManager from 'expo-task-manager';
import * as Updates from 'expo-updates';

import { syncSchedule } from './notification-schedule';
import { syncServer } from './server-sync';

const task = 'adwam-reminder-maintenance';
const variant: unknown = Constants.expoConfig?.extra?.variant;

TaskManager.defineTask(task, async ({ error }) => {
  if (error) return BackgroundTaskResult.Failed;
  try {
    await syncSchedule();
    await syncServer();
    if (!__DEV__ && (variant === 'preview' || variant === 'production') && Updates.isEnabled) {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) await Updates.fetchUpdateAsync();
    }
    return BackgroundTaskResult.Success;
  } catch {
    return BackgroundTaskResult.Failed;
  }
});

let registration: Promise<void> | undefined;

export function registerReminderMaintenance(): Promise<void> {
  registration ??= registerTaskAsync(task, { minimumInterval: 12 * 60 }).catch((error: unknown) => {
    registration = undefined;
    throw error;
  });
  return registration;
}
