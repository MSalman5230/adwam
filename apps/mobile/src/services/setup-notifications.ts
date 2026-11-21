import { requestPermissionsAsync } from 'expo-notifications';

import { notificationPermission } from './notification-permissions';
import { registerNotificationPresentation } from './notification-presentation';

export async function requestSetupNotifications(): Promise<'granted' | 'denied' | 'unset'> {
  await registerNotificationPresentation();
  return notificationPermission(await requestPermissionsAsync());
}
