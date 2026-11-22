import catalog from '@adwam/content/catalog';
import { civil, effectiveHijri, MINUTE_MS, paused, presetOf, pushEstimate } from '@adwam/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import { ListRow } from '../../components/cards';
import { Hero } from '../../components/headers';
import { t } from '../../language/messages';
import { useMessageFormat } from '../../language/useMessageFormat';
import { appVersion } from '../../services/app-version';
import { openNotificationSettings } from '../../services/notification-settings';
import { HijriSheet, JumuahSheet, LocationSheet, PrayerSheet } from '../../settings/place-time-sheets';
import { AppearanceSheet, PauseSheet, PrivacySheet, QuietSheet, UdhiyahSheet } from '../../settings/preference-sheets';
import { selectReminderState } from '../../state/selectors';
import { useClock, useReminderStores } from '../../state/useClock';
import { isTestBuild } from '../../theme/isTestBuild';
import { useTheme } from '../../theme/ThemeProvider';
import { typography } from '../../theme/typography';

const sheetIds = ['quiet', 'pause', 'city', 'prayer', 'jumuah', 'hijri', 'udhiyah', 'theme', 'privacy'] as const;
type SheetId = (typeof sheetIds)[number];

function Group({ title, children }: { title: string; children: ReactNode }) {
  const { palette } = useTheme();
  return <>
    <Text accessibilityRole="header" style={[typography.overline, styles.groupTitle, { color: palette.goldText }]}>{title}</Text>
    <View style={[styles.group, { backgroundColor: palette.surface, borderColor: palette.hair }]}>{children}</View>
  </>;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { sheet: sheetParam } = useLocalSearchParams<{ sheet?: string }>();
  const sheet = sheetIds.find((id) => id === sheetParam);
  const openSheet = (id: SheetId) => router.setParams({ sheet: id });
  const { palette, preference } = useTheme();
  const stores = useReminderStores();
  const settings = useStore(stores.settings, ({ value }) => value);
  const trackers = useStore(stores.trackers, ({ value }) => value);
  const cache = useStore(stores.serverCache, ({ value }) => value);
  const now = useClock();
  const { location, reminders, prayer, hijri } = settings;
  const format = useMessageFormat(location?.timeZone);
  const state = selectReminderState(settings, trackers, cache, catalog.sunnahs);
  if (!state || !location) return null;
  const closeSheet = () => router.setParams({ sheet: undefined });
  const { update } = stores.settings.getState();
  const sheetProps = { settings, location, now, format, update, onClose: closeSheet };

  const today = civil(now, location.timeZone).iso;
  const { year } = effectiveHijri(now, state.calendar);
  const preset = presetOf(state);
  const presetName = t(preset === 'recommended' ? 'reminders.preferred' : preset === 'inapp' ? 'reminders.inappOnly' : 'reminders.custom');
  const { weekly } = pushEstimate(state, year);
  const notificationsAllowed = reminders.notifications === 'granted';
  const quiet = reminders.quietHours;
  const wallFormat = { ...format, timeZone: 'UTC' };
  const activePause = paused(reminders.pause, today);
  const pauseDate = reminders.pause?.until;
  const udhiyah = reminders.udhiyah[year];
  const summary: Record<SheetId, string> = {
    quiet: t(reminders.eclipseQuiet ? 'settings.quietRangeEclipses' : 'settings.quietRange', {
      start: quiet.start * MINUTE_MS, end: quiet.end * MINUTE_MS,
    }, wallFormat),
    pause: activePause ? pauseDate ? t('settings.pauseUntil', { date: pauseDate }) : t('settings.pauseIndefinite') : t('reminders.off'),
    city: t(location.source === 'current' ? 'settings.currentLocation' : 'settings.chosenCity', { city: location.name }),
    prayer: t('settings.prayerSummary', {
      method: t(`settings.prayerMethodsShort.${prayer.method}`),
      asr: t(prayer.asr === 'hanafi' ? 'settings.asrHanafi' : 'settings.asrStandard'),
    }),
    jumuah: prayer.jumuah.mode === 'dhuhr' ? t('settings.jumuahDhuhr') : t('settings.wallTime', { time: prayer.jumuah.minutes * MINUTE_MS }, wallFormat),
    hijri: t('settings.hijriSummary', {
      method: t(`sheet.hijri.${hijri.method}`),
      shift: t(hijri.shift === 0 ? 'settings.shiftNone' : hijri.shift === 1 ? 'settings.shiftPlus' : 'settings.shiftMinus'),
    }),
    udhiyah: t('settings.udhiyahStatus', { status: t(udhiyah ? `common.${udhiyah}` : 'settings.unset') }),
    theme: t(`settings.${preference}`),
    privacy: t('settings.privacySummary'),
  };
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: palette.paper }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Hero title={t('settings.title')} subtitle={t('settings.subtitle')} />
        <Group title={t('settings.section.reminders')}>
          <ListRow serif title={t('settings.reminders')} subtitle={weekly ? t('settings.presetWeekly', { preset: presetName, count: weekly }) : presetName}
            icon="tune" onPress={() => router.push('/reminders')} />
          <ListRow serif title={t('settings.notifications')} subtitle={t(notificationsAllowed ? 'settings.notificationsAllowed' : 'settings.notificationsOff')}
            icon={notificationsAllowed ? 'notifications' : 'notifications_off'} onPress={() => { void openNotificationSettings().catch(() => {}); }} />
          <ListRow serif title={t('settings.quietHours')} subtitle={summary.quiet} icon="bedtime" onPress={() => openSheet('quiet')} />
          <ListRow serif title={t('settings.pause')} subtitle={summary.pause} icon="pause_circle" onPress={() => openSheet('pause')} />
        </Group>
        <Group title={t('settings.section.place')}>
          <ListRow serif title={t('settings.location')} subtitle={summary.city} icon="location_on" onPress={() => openSheet('city')} />
          <ListRow serif title={t('settings.prayerTimes')} subtitle={summary.prayer} icon="schedule" onPress={() => openSheet('prayer')} />
          <ListRow serif title={t('settings.jumuah')} subtitle={summary.jumuah} icon="mosque" onPress={() => openSheet('jumuah')} />
          <ListRow serif title={t('settings.hijri')} subtitle={summary.hijri} icon="calendar_month" onPress={() => openSheet('hijri')} />
        </Group>
        <Group title={t('settings.section.thisYear')}>
          <ListRow serif title={t('settings.udhiyah')} subtitle={summary.udhiyah} icon="volunteer_activism" onPress={() => openSheet('udhiyah')} />
        </Group>
        <Group title={t('settings.section.app')}>
          <ListRow serif title={t('settings.appearance')} subtitle={summary.theme} onPress={() => openSheet('theme')}
            icon={preference === 'system' ? 'brightness_auto' : preference === 'light' ? 'light_mode' : 'dark_mode'} />
          <ListRow serif title={t('settings.privacy')} subtitle={summary.privacy} icon="privacy_tip" onPress={() => openSheet('privacy')} />
          <ListRow serif title={t('settings.about')} subtitle={t('settings.aboutSummary', { version: appVersion })} icon="info" onPress={() => router.push('/about')} />
          {isTestBuild && <ListRow serif title={t('developerTools.title')} icon="code" onPress={() => router.push('/debug')} />}
        </Group>
      </ScrollView>
      {sheet === 'city' && <LocationSheet {...sheetProps} />}
      {sheet === 'prayer' && <PrayerSheet {...sheetProps} />}
      {sheet === 'jumuah' && <JumuahSheet {...sheetProps} />}
      {sheet === 'hijri' && <HijriSheet {...sheetProps} />}
      {sheet === 'quiet' && <QuietSheet {...sheetProps} />}
      {sheet === 'pause' && <PauseSheet {...sheetProps} today={today} />}
      {sheet === 'udhiyah' && <UdhiyahSheet {...sheetProps} year={year} />}
      {sheet === 'theme' && <AppearanceSheet onClose={closeSheet} />}
      {sheet === 'privacy' && <PrivacySheet {...sheetProps} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 20 },
  groupTitle: { marginTop: 24, marginHorizontal: 4, marginBottom: 8 },
  group: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
});
