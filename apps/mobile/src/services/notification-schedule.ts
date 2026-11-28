import { laterFor, MINUTE_MS, planNotifications, type PlannedNotification } from '@adwam/core';
import { cancelScheduledNotificationAsync, getAllScheduledNotificationsAsync } from 'expo-notifications';

import { deviceStores } from '../state/native';
import { reminderCatalog } from '../state/reminder-catalog';
import { selectReminderState } from '../state/selectors';
import { recordScheduleCounts } from './crash-reporting';
import type { ScheduleCounts } from './crash-event';
import { refreshNotificationPermissions } from './notification-permissions';
import { registerNotificationPresentation } from './notification-presentation';
import { calendarNotification, scheduleCalendarNotification, scheduledTime, snoozeSuffix } from './notification-request';

let pending = false;
let running: Promise<void> | undefined;

export function syncSchedule(): Promise<void> {
  pending = true;
  running ??= Promise.resolve().then(async () => {
    try {
      while (pending) {
        pending = false;
        await reconcile();
      }
    } finally {
      running = undefined;
    }
  });
  return running;
}

async function reconcile() {
  const counts: ScheduleCounts = { planned: 0, added: 0, cancelled: 0, kept: 0, failed: 0 };
  try {
    const [scheduled] = await Promise.all([
      getAllScheduledNotificationsAsync(),
      registerNotificationPresentation().then(refreshNotificationPermissions),
    ]);
    const { settings, trackers, serverCache } = deviceStores;
    const saved = settings.getState().value;
    const state = saved.setupDone && selectReminderState(saved, trackers.getState().value, serverCache.getState().value, reminderCatalog);
    const now = Date.now();
    const plan = state ? planNotifications(now, state) : [];
    const missing = new Map<string, PlannedNotification>(plan.map((push) => [push.id, push]));
    counts.planned = missing.size;

    for (const request of scheduled) {
      if (request.content.data?.kind !== calendarNotification) continue;
      const { identifier } = request;
      const at = scheduledTime(request.trigger);
      if (identifier.endsWith(snoozeSuffix) && at !== undefined && at > now && state) {
        const snooze = laterFor(identifier.slice(0, -snoozeSuffix.length), at - 60 * MINUTE_MS, state);
        if (snooze) {
          missing.set(identifier, snooze);
          counts.planned += 1;
        }
      }
      const expected = missing.get(identifier);
      if (expected && expected.hash === request.content.data.hash && expected.at === at) {
        counts.kept += 1;
        missing.delete(identifier);
        continue;
      }
      try {
        await cancelScheduledNotificationAsync(identifier);
        counts.cancelled += 1;
      } catch {
        counts.failed += 1;
        missing.delete(identifier);
      }
    }

    await Promise.all(Array.from(missing.values(), async (push) => {
      if (push.at <= Date.now()) return;
      try {
        await scheduleCalendarNotification(push);
        counts.added += 1;
      } catch {
        counts.failed += 1;
      }
    }));
  } catch {
    counts.failed += 1;
  }
  recordScheduleCounts(counts);
}
