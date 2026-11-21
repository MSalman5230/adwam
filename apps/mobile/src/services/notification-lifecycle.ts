import { useEffect } from 'react';
import { AppState } from 'react-native';

import { deviceStores } from '../state/native';
import { syncSchedule } from './notification-schedule';

export function useNotificationLifecycle() {
  useEffect(() => {
    const refresh = () => { void syncSchedule(); };
    const changed = ({ value }: { value: unknown }, previous: { value: unknown }) => {
      if (value !== previous.value) refresh();
    };
    const unsubscribeSettings = deviceStores.settings.subscribe(changed);
    const unsubscribeTrackers = deviceStores.trackers.subscribe(changed);
    const foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    // An applied Expo update mounts the root and reconciles against the new content.
    refresh();
    return () => {
      foreground.remove();
      unsubscribeSettings();
      unsubscribeTrackers();
    };
  }, []);
}
