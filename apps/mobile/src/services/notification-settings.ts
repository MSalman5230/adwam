import { applicationId } from 'expo-application';
import { ActivityAction, startActivityAsync } from 'expo-intent-launcher';
import { Linking, Platform } from 'react-native';

export async function openNotificationSettings() {
  if (Platform.OS === 'android' && Number(Platform.Version) >= 26 && applicationId) {
    try {
      await startActivityAsync(ActivityAction.APP_NOTIFICATION_SETTINGS, {
        extra: { 'android.provider.extra.APP_PACKAGE': applicationId },
      });
      return;
    } catch {
      // Some Android variants expose only the app settings screen.
    }
  }
  await Linking.openSettings();
}
