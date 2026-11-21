import catalog from '@adwam/content/catalog';
import { laterFor } from '@adwam/core';
import {
  dismissNotificationAsync, getAllScheduledNotificationsAsync, type NotificationResponse,
} from 'expo-notifications';

import { deviceStores } from '../state/native';
import { selectReminderState } from '../state/selectors';
import { editTick } from '../state/tracker-edits';
import { calendarNotification, scheduleCalendarNotification, snoozeSuffix } from './notification-request';
import { syncSchedule } from './notification-schedule';

const active = new Map<string, Promise<boolean>>();

export function handleReminderAction(response: NotificationResponse): Promise<boolean> {
  const { actionIdentifier, notification } = response;
  if (actionIdentifier !== 'done' && actionIdentifier !== 'later') return Promise.resolve(false);
  const { identifier, content, trigger } = notification.request;
  const data = content.data;
  if (!identifier || (trigger && 'type' in trigger && trigger.type === 'push') || data?.kind !== calendarNotification) {
    return Promise.resolve(false);
  }
  const doneKey = typeof data.doneKey === 'string' && identifier.startsWith(`${data.doneKey}|`) ? data.doneKey : undefined;
  if (actionIdentifier === 'done' && !doneKey) return Promise.resolve(false);
  if (actionIdentifier === 'later' && identifier.endsWith(snoozeSuffix)) return Promise.resolve(false);

  const key = `${actionIdentifier}:${identifier}`;
  const existing = active.get(key);
  if (existing) return existing;
  const next = applyAction(identifier, actionIdentifier, doneKey).catch(() => false).finally(() => active.delete(key));
  active.set(key, next);
  return next;
}

async function applyAction(identifier: string, action: 'done' | 'later', doneKey?: string) {
  const { settings, trackers, serverCache } = deviceStores;
  const prefs = settings.getState().value;
  if (!prefs.setupDone) return false;
  let changed = false;
  if (action === 'done' && doneKey) {
    const current = trackers.getState();
    if (current.value.done[doneKey] !== true) {
      current.update((value) => editTick(value, { kind: 'done', key: doneKey }, true).next);
      changed = true;
    }
  } else if (action === 'later') {
    const existing = await getAllScheduledNotificationsAsync();
    if (!existing.some((request) => request.identifier === identifier + snoozeSuffix)) {
      const state = selectReminderState(settings.getState().value, trackers.getState().value, serverCache.getState().value, catalog.sunnahs);
      const snooze = state && laterFor(identifier, Date.now(), state);
      if (snooze) {
        await scheduleCalendarNotification(snooze);
        changed = true;
      }
    }
  }
  if (changed) await syncSchedule();
  await dismissNotificationAsync(identifier);
  return changed;
}
