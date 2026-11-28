import { planNotifications } from '@adwam/core';
import {
  addNotificationReceivedListener, cancelAllScheduledNotificationsAsync, dismissAllNotificationsAsync,
  getAllScheduledNotificationsAsync, type NotificationRequest,
} from 'expo-notifications';
import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import { Button } from '../../components/controls';
import { SectionHeader } from '../../components/headers';
import { Subpage } from '../../components/Subpage';
import { NotificationList } from '../../developer-tools/NotificationList';
import { simulateRain, simulatedCorrection } from '../../developer-tools/fake-events';
import { scheduleDebugPush } from '../../developer-tools/notification-test';
import { t } from '../../language/messages';
import { useMessageFormat } from '../../language/useMessageFormat';
import { canTestCrashReporting, triggerPreviewTestCrash } from '../../services/crash-reporting';
import { checkLocalSupabase, resetLocalSupabaseSession } from '../../services/supabase';
import { simulateServerRain } from '../../services/server-sync';
import { scheduledTime } from '../../services/notification-request';
import { deviceStores, settingsStore } from '../../state/native';
import { moments } from '../../state/moments';
import { reminderCatalog } from '../../state/reminder-catalog';
import { defaultServerCache, defaultSettings, defaultTrackers } from '../../state/schema';
import { selectReminderState } from '../../state/selectors';
import { setDebugMoment, setDebugTime, useClock, useReminderStores } from '../../state/useClock';
import { Prose } from '../../theme/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { typography } from '../../theme/typography';

export default function DebugScreen() {
  const router = useRouter();
  const { palette } = useTheme();
  const crashReports = useStore(settingsStore, ({ value }) => value.crashReports);
  const stores = useReminderStores();
  const settings = useStore(stores.settings, ({ value }) => value);
  const trackers = useStore(stores.trackers, ({ value }) => value);
  const cache = useStore(stores.serverCache, ({ value }) => value);
  const now = useClock();
  const format = useMessageFormat(settings.location?.timeZone);
  const state = selectReminderState(settings, trackers, cache, reminderCatalog);
  const planned = useMemo(() => state ? planNotifications(now, state) : [], [now, state]);
  const next = planned[0];
  const [connection, setConnection] = useState<'connected' | 'failed'>();
  const [scheduled, setScheduled] = useState<NotificationRequest[]>([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void checkLocalSupabase()?.then((result) => {
      if (active) setConnection(result);
    });
    return () => {
      active = false;
    };
  }, []);

  const refreshSchedule = useCallback(async () => {
    try {
      setScheduled(await getAllScheduledNotificationsAsync());
    } catch {
      setStatus(t('developerTools.scheduleUnavailable'));
    }
  }, []);
  useEffect(() => {
    void refreshSchedule();
    const subscription = addNotificationReceivedListener(() => { void refreshSchedule(); });
    return () => subscription.remove();
  }, [refreshSchedule]);

  const fireNext = async () => {
    if (!next) return;
    setBusy(true);
    try {
      const result = await scheduleDebugPush(next);
      setStatus(t(result === 'scheduled' ? 'developerTools.testScheduled' : 'notification.off'));
      await refreshSchedule();
    } catch {
      setStatus(t('developerTools.testFailed'));
    } finally {
      setBusy(false);
    }
  };
  const reset = async () => {
    setBusy(true);
    try {
      await cancelAllScheduledNotificationsAsync();
      await dismissAllNotificationsAsync();
      await resetLocalSupabaseSession();
      deviceStores.settings.getState().update(defaultSettings);
      deviceStores.trackers.getState().update(defaultTrackers);
      deviceStores.serverCache.getState().update(defaultServerCache);
      setDebugTime(null);
      router.dismissTo('/setup');
    } catch {
      setStatus(t('developerTools.resetFailed'));
    } finally {
      setBusy(false);
    }
  };
  const showRain = async () => {
    if (stores === deviceStores && cache.config?.debugToolsEnabled) {
      setBusy(true);
      try {
        if (!await simulateServerRain()) {
          setStatus(t('developerTools.simulationFailed'));
          return;
        }
      } catch {
        setStatus(t('developerTools.simulationFailed'));
        return;
      } finally {
        setBusy(false);
      }
    } else {
      stores.serverCache.getState().update((value) => simulateRain(now, value));
    }
    router.dismissTo('/today');
  };
  const showCorrection = () => {
    if (!state || !settings.location) return;
    const correctionOffer = simulatedCorrection(now, state.calendar, settings.location.name);
    stores.serverCache.getState().update((value) => ({ ...value, correctionOffer }));
    router.dismissTo('/today');
  };
  const pending = scheduled.map(({ identifier, content, trigger }) => ({
    id: identifier, title: content.title ?? identifier,
    at: scheduledTime(trigger),
  })).sort((first, second) => (first.at ?? Infinity) - (second.at ?? Infinity));

  return (
    <Subpage title={t('developerTools.title')}>
      {connection && (
        <Text accessibilityLiveRegion="polite" style={[typography.subtitle, styles.row, { color: palette.ink2 }]}>
          {t(`development.supabase.${connection}`)}
        </Text>
      )}
      <View style={styles.controls}>
        <Link href="/debug/clock" style={[typography.button, styles.row, { color: palette.green }]}>{t('developerTools.dateAndTime')}</Link>
        <Button label={t('developerTools.nextPush')} variant="outlined" disabled={!next || busy} onPress={() => {
          if (!next) return;
          setDebugTime(next.at, true);
          router.dismissTo('/today');
        }} />
      </View>
      <SectionHeader title={t('developerTools.simulation')} />
      <View style={styles.controls}>
        <Button label={t('developerTools.simulateRain')} variant="outlined" disabled={!state || busy} onPress={() => { void showRain(); }} />
        <Button label={t('developerTools.correction')} variant="outlined" disabled={!state || busy} onPress={showCorrection} />
      </View>
      <SectionHeader title={t('settings.notifications')} />
      <View style={styles.controls}>
        <NotificationList title={t('developerTools.planned')} rows={planned} format={format} />
        <NotificationList title={t('developerTools.scheduled')} rows={pending} format={format} />
        <Button label={t('developerTools.refreshSchedule')} variant="text" onPress={() => { void refreshSchedule(); }} />
        <Button label={t('developerTools.fireNext')} variant="outlined" disabled={!next || busy} onPress={() => { void fireNext(); }} />
        {status && <Prose accessibilityLiveRegion="polite" style={[typography.caption, { color: palette.ink2 }]}>{status}</Prose>}
      </View>
      <SectionHeader title={t('developerTools.galleries')} />
      <Link href="/debug/theme" style={[typography.button, styles.row, { color: palette.green }]}>{t('developerTools.themeGallery')}</Link>
      <Link href="/debug/components" style={[typography.button, styles.row, { color: palette.green }]}>{t('developerTools.componentGallery')}</Link>
      <SectionHeader title={t('developerTools.install')} />
      <View style={styles.controls}>
        {canTestCrashReporting && <Button label={t('developerTools.testCrash')} variant="outlined"
          disabled={!crashReports || busy} onPress={triggerPreviewTestCrash} />}
        <Button label={t(settings.setupDone ? 'developerTools.showSetup' : 'developerTools.skipSetup')} variant="outlined" disabled={busy} onPress={() => {
          const device = settingsStore.getState();
          if (!settings.setupDone && !device.value.location) {
            setDebugMoment(moments[0]);
            router.dismissTo('/today');
            return;
          }
          setDebugTime(null);
          device.update((value) => ({ ...value, setupDone: !settings.setupDone }));
          router.dismissTo('/');
        }} />
        <Button label={t('developerTools.reset')} variant="outlined" disabled={busy} onPress={() => {
          Alert.alert(t('developerTools.reset'), t('developerTools.resetConfirmation'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('developerTools.reset'), style: 'destructive', onPress: () => { void reset(); } },
          ]);
        }} />
      </View>
    </Subpage>
  );
}

const styles = StyleSheet.create({ controls: { gap: 8 }, row: { paddingVertical: 12 } });
