import type { PlannedNotification } from '@adwam/core';
import {
  AndroidImportance, cancelScheduledNotificationAsync, getPermissionsAsync, scheduleNotificationAsync,
  SchedulableTriggerInputTypes, setNotificationChannelAsync, setNotificationHandler,
} from 'expo-notifications';
import { Platform } from 'react-native';

import { t } from '../language/messages';

export async function scheduleDebugPush(push: PlannedNotification): Promise<'scheduled' | 'disabled'> {
  const permission = await getPermissionsAsync();
  if (!permission.granted) return 'disabled';

  const identifier = 'debug-next-push';
  if (Platform.OS === 'android') {
    await setNotificationChannelAsync(push.channel, { name: t(`notification.channel.${push.channel}`), importance: AndroidImportance.DEFAULT });
  }
  setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
    }),
  });
  await cancelScheduledNotificationAsync(identifier);
  await scheduleNotificationAsync({
    identifier,
    content: { title: push.title, body: push.body, data: { link: push.link, debug: true } },
    trigger: { type: SchedulableTriggerInputTypes.DATE, channelId: push.channel, date: Date.now() + 10_000 },
  });
  return 'scheduled';
}
