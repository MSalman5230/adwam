import { requestPermissionsAsync } from 'expo-notifications';

import { registerNotificationPresentation } from './notification-presentation';

export async function requestSetupNotifications(): Promise<'granted' | 'denied' | 'unset'> {
  await registerNotificationPresentation();
  const response = await requestPermissionsAsync();
  if (response.granted) return 'granted';
  return response.status === 'denied' ? 'denied' : 'unset';
}
