import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as Updates from 'expo-updates';
import { createMMKV } from 'react-native-mmkv';
import { createStore } from 'zustand/vanilla';

import messages from '@adwam/content/messages/en.json';

const prefix = 'adwam-spike-';
const channel = prefix + 'notifications';
const category = prefix + 'actions';
const notificationTask = prefix + 'notification-task';
const dailyTask = prefix + 'daily-task';
const hour = 3_600_000;
const mmkv = createMMKV({ id: prefix + 'settings' });
const settings = createStore(() => ({ probe: 0 }));

export function getLog() {
  return (mmkv.getString('log') ?? '').split('\n').filter(Boolean);
}

function log(line: string) {
  mmkv.set(
    'log',
    [`${new Date().toISOString()} ${line}`, ...getLog()]
      .slice(0, 200)
      .join('\n'),
  );
}

async function schedule(id: string, expectedAt: number, withActions = false) {
  await Notifications.scheduleNotificationAsync({
    identifier: prefix + id,
    content: {
      title: messages.spike.title,
      body: id,
      data: { expectedAt },
      ...(withActions && { categoryIdentifier: category }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: expectedAt,
      channelId: channel,
    },
  });
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

TaskManager.defineTask<Notifications.NotificationTaskPayload>(
  notificationTask,
  async ({ data }) => {
    if (!data || !('actionIdentifier' in data)) return;
    const id = data.notification.request.identifier;
    if (!id.startsWith(prefix)) return;

    try {
      if (data.actionIdentifier === 'done') {
        mmkv.set('done', id);
        await schedule('after-done', Date.now() + 120_000);
        log(`Done saved and replacement scheduled for ${id}`);
      } else if (data.actionIdentifier === 'later') {
        const when = Date.now() + hour;
        await schedule(`${id.slice(prefix.length)}-later`, when);
        log(`Later scheduled for ${new Date(when).toISOString()}`);
      }
    } catch (error) {
      log(`Notification action failed: ${String(error)}`);
    }
  },
);

TaskManager.defineTask(dailyTask, async () => {
  try {
    const probe = mmkv.getNumber('probe') ?? 0;
    settings.setState({ probe });
    log(`Background task read MMKV and Zustand: ${settings.getState().probe}`);
    if (Updates.isEnabled) {
      const update = await Updates.checkForUpdateAsync();
      log(`Background update check: available=${update.isAvailable}`);
    }
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    log(`Background task failed: ${String(error)}`);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

async function enableNotifications() {
  await Notifications.setNotificationChannelAsync(channel, {
    name: messages.spike.title,
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  const { granted } = await Notifications.requestPermissionsAsync();
  if (!granted) throw new Error(messages.spike.permission);
}

export async function scheduleActions() {
  await enableNotifications();
  await Notifications.setNotificationCategoryAsync(category, [
    {
      identifier: 'done',
      buttonTitle: messages.spike.done,
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'later',
      buttonTitle: messages.spike.later,
      options: { opensAppToForeground: false },
    },
  ]);
  await Notifications.registerTaskAsync(notificationTask);
  const time = Date.now() + 60_000;
  await schedule('done-test', time, true);
  await schedule('later-test', time + 60_000, true);
  log('Action tests scheduled for +1 and +2 min');
}

export async function scheduleSamples(kind: 'overnight' | 'capacity') {
  await enableNotifications();
  const group = prefix + kind + '-';
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  for (const { identifier } of pending) {
    if (identifier.startsWith(group))
      await Notifications.cancelScheduledNotificationAsync(identifier);
  }

  const hours =
    kind === 'overnight'
      ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 30, 36, 48]
      : Array.from(
          { length: 150 },
          (_, index) => ((index + 1) * 24 * 60) / 150,
        );
  const start = Date.now();
  for (const offset of hours)
    await schedule(`${kind}-${offset}`, start + offset * hour);
  await inspectNotifications();
}

export async function inspectNotifications() {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  const count = (kind: string) =>
    pending.filter((item) => item.identifier.startsWith(prefix + kind)).length;
  log(
    `Pending: overnight=${count('overnight-')}, capacity=${count('capacity-')}`,
  );
  for (const {
    date,
    request,
  } of await Notifications.getPresentedNotificationsAsync()) {
    if (
      !request.identifier.startsWith(prefix) ||
      mmkv.getBoolean('seen:' + request.identifier)
    )
      continue;
    const expected = request.content.data?.expectedAt;
    if (typeof expected !== 'number') continue;
    mmkv.set('seen:' + request.identifier, true);
    log(
      `${request.identifier} posted at ${new Date(date).toISOString()} (${Math.round((date - expected) / 60_000)} min offset)`,
    );
  }
}

export async function startBackgroundTask() {
  mmkv.set('probe', 42);
  await BackgroundTask.registerTaskAsync(dailyTask, { minimumInterval: 720 });
  log('Registered 12-hour background task');
}
