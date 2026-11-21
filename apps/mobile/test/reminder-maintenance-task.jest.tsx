import { expect, it, jest } from '@jest/globals';
import { BackgroundTaskResult, registerTaskAsync } from 'expo-background-task';
import { defineTask } from 'expo-task-manager';

import { syncSchedule } from '../src/services/notification-schedule';
import { registerReminderMaintenance } from '../src/services/reminder-maintenance-task';

jest.mock('expo-background-task', () => ({ registerTaskAsync: jest.fn(async () => {}), BackgroundTaskResult: { Success: 1, Failed: 2 } }));
jest.mock('expo-task-manager', () => ({ defineTask: jest.fn() }));
jest.mock('expo-updates', () => ({ isEnabled: false }));
jest.mock('../src/services/notification-schedule', () => ({ syncSchedule: jest.fn(async () => {}) }));

it('registers twelve-hour maintenance and runs the same scheduler as the app', async () => {
  await Promise.all([registerReminderMaintenance(), registerReminderMaintenance()]);
  expect(registerTaskAsync).toHaveBeenCalledTimes(1);
  expect(registerTaskAsync).toHaveBeenCalledWith('adwam-reminder-maintenance', { minimumInterval: 720 });

  const callback = jest.mocked(defineTask).mock.calls[0]?.[1];
  const result = await callback?.({
    data: {}, error: null, executionInfo: { eventId: 'test', taskName: 'adwam-reminder-maintenance' },
  });
  expect(syncSchedule).toHaveBeenCalledTimes(1);
  expect(result).toBe(BackgroundTaskResult.Success);
});
