import { AndroidImportance, requestPermissionsAsync, setNotificationChannelAsync } from 'expo-notifications';
import { Platform } from 'react-native';

import { t } from '../language/messages';

export async function requestSetupNotifications(): Promise<'granted' | 'denied' | 'unset'> {
  if (Platform.OS === 'android') {
    await setNotificationChannelAsync('weekly', { name: t('notification.channel.weekly'), importance: AndroidImportance.DEFAULT });
  }
  const response = await requestPermissionsAsync();
  if (response.granted) return 'granted';
  return response.status === 'denied' ? 'denied' : 'unset';
}
