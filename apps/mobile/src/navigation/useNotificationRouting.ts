import {
  addNotificationResponseReceivedListener, clearLastNotificationResponse, DEFAULT_ACTION_IDENTIFIER,
  getLastNotificationResponse, type NotificationResponse,
} from 'expo-notifications';
import { useRootNavigationState, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { handleReminderAction } from '../services/notification-actions';
import { calendarNotification } from '../services/notification-request';
import { isTestBuild } from '../theme/isTestBuild';
import { notificationRoute } from './notification-route';

export function useNotificationRouting(setupDone: boolean) {
  const router = useRouter();
  const ready = !!useRootNavigationState()?.key && setupDone;
  const handled = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!ready) return;
    const respond = (response: NotificationResponse) => {
      const { notification, actionIdentifier } = response;
      const key = `${notification.request.identifier}:${notification.date}:${actionIdentifier}`;
      if (handled.current === key) return;
      handled.current = key;
      clearLastNotificationResponse();
      if (actionIdentifier !== DEFAULT_ACTION_IDENTIFIER) {
        void handleReminderAction(response);
        return;
      }
      const data = notification.request.content.data;
      if (data?.kind !== calendarNotification && !(isTestBuild && data?.debug === true)) return;
      const route = notificationRoute(data?.link);
      if (route) router.navigate(route);
    };
    const subscription = addNotificationResponseReceivedListener(respond);
    const response = getLastNotificationResponse();
    if (response) respond(response);
    return () => subscription.remove();
  }, [ready, router]);
}
