import catalog from '@adwam/content/catalog';
import { planNotifications, type PlannedNotification } from '@adwam/core';
import { cancelScheduledNotificationAsync, getAllScheduledNotificationsAsync } from 'expo-notifications';

import { deviceStores } from '../state/native';
import { selectReminderState } from '../state/selectors';
import { recordScheduleCounts } from './crash-reporting';
import type { ScheduleCounts } from './crash-event';
import { registerNotificationPresentation } from './notification-presentation';
import { calendarNotification, scheduleCalendarNotification, scheduledTime } from './notification-request';

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
    await registerNotificationPresentation();
    const scheduled = await getAllScheduledNotificationsAsync();
    const { settings, trackers, serverCache } = deviceStores;
    const saved = settings.getState().value;
    const state = saved.setupDone && selectReminderState(saved, trackers.getState().value, serverCache.getState().value, catalog.sunnahs);
    const plan = state ? planNotifications(Date.now(), state) : [];
    const missing = new Map<string, PlannedNotification>(plan.map((push) => [push.id, push]));
    counts.planned = missing.size;

    for (const request of scheduled) {
      if (request.content.data?.kind !== calendarNotification) continue;
      const { identifier } = request;
      const expected = missing.get(identifier);
      if (expected && expected.hash === request.content.data.hash && expected.at === scheduledTime(request.trigger)) {
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

    for (const push of missing.values()) {
      if (push.at <= Date.now()) continue;
      try {
        await scheduleCalendarNotification(push);
        counts.added += 1;
      } catch {
        counts.failed += 1;
      }
    }
  } catch {
    counts.failed += 1;
  }
  recordScheduleCounts(counts);
}
