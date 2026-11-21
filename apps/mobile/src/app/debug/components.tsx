import { day, dayLine, localToMs } from '@adwam/core';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DayLine, TrackerDots } from '../../components/calendarDisplay';
import { Banner, Card, ListRow, Notice, OptionRow, RadioCard } from '../../components/cards';
import { Button, Checkbox, Chip, Segmented, Stepper, Switch, Tag } from '../../components/controls';
import { AppBar, Hero, PageTitle, SectionHeader, useAppBarScroll } from '../../components/headers';
import { Sheet, Snackbar } from '../../components/overlays';
import { t } from '../../language/messages';
import { isTestBuild } from '../../theme/isTestBuild';
import { useTheme } from '../../theme/ThemeProvider';

const format = { timeZone: 'Europe/London', uses24HourClock: false };
const friday = '2026-12-18';
const timeline = dayLine(localToMs(friday, 11 * 60 + 30, format.timeZone), day(friday, {
  place: { latitude: 51.5074, longitude: -0.1278, countryCode: 'GB', timeZone: format.timeZone },
  prayer: { method: 'mwl', asr: 'standard' }, hijri: { method: 'umalqura' },
}));

function Gallery() {
  const router = useRouter();
  const { palette } = useTheme();
  const [level, setLevel] = useState<'inapp' | 'push' | 'off'>('push');
  const [enabled, setEnabled] = useState(true);
  const [done, setDone] = useState(false);
  const [count, setCount] = useState(2);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [snackOpen, setSnackOpen] = useState(false);
  const { scrolled, onScroll } = useAppBarScroll();
  const componentGallery = t('developerTools.componentGallery');
  const reset = () => { setDone(false); setEnabled(true); setCount(2); setLevel('push'); };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.paper }]}>
      <AppBar title={componentGallery} scrolled={scrolled}
        start={{ label: t('common.back'), icon: 'arrow_back', onPress: () => router.back() }} />
      <ScrollView contentContainerStyle={styles.content} onScroll={onScroll} scrollEventThrottle={16}>
        <Hero title={componentGallery} />
        <Button label={t('developerTools.gallery.openSheet')} variant="outlined" onPress={() => setSheetOpen(true)} />
        <DayLine timeline={timeline} format={format} />
        <Notice
          title={t('today.notice.notifications.title')}
          body={t('today.notice.notifications.body')}
          icon="notifications_off"
          actions={[{ label: t('today.notice.notifications.openSettings'), onPress: () => setEnabled(true) }]}
        />
        <Banner title={t('calendar.month.9')} body={t('developerTools.gallery.sample')} onPress={() => setDone(false)} />
        <Card title={t('developerTools.gallery.sample')} icon="bedtime" onPress={() => setDone(true)} done={done}>
          <Checkbox label={t('common.done')} checked={done} onChange={setDone} />
        </Card>
        <ListRow title={t('settings.notifications')} subtitle={t('settings.notificationsAllowed')} icon="notifications" onPress={() => setEnabled(!enabled)} />
        <Switch label={t('settings.notifications')} checked={enabled} onChange={setEnabled} />
        <Segmented
          label={t('detail.reminderTitle')}
          value={level}
          onChange={setLevel}
          options={[
            { value: 'push', label: t('reminders.push') },
            { value: 'inapp', label: t('reminders.inapp') },
            { value: 'off', label: t('reminders.off') },
          ]}
        />
        <View style={styles.row}>
          <Chip label={t('upcoming.filters.fasts')} selected={enabled} onPress={() => setEnabled(!enabled)} />
          <Tag label={t('upcoming.noFasting')} tone="rust" icon="block" />
          <Tag label={t('today.sinceMaghrib')} tone="gold" />
        </View>
        <Stepper value={count} max={10} onChange={setCount} />
        <RadioCard title={t('reminders.preferred')} subtitle={t('setup.reminders.recommended')} selected={level === 'push'} onPress={() => setLevel('push')} />
        <OptionRow title={t('reminders.inappOnly')} selected={level === 'inapp'} onPress={() => setLevel('inapp')} />
        <TrackerDots total={3} completed={2} label={t('reminder.tracker.whiteDays', { count: 2, total: 3 })} />
        <SectionHeader title={t('settings.notifications')} aside={t('reminders.push')} />
        <PageTitle title={t('settings.prayerTimes')} subtitle={t('settings.section.place')} />
        <Button label={t('common.continue')} onPress={() => { setDone(true); setSnackOpen(true); }} />
        <Button label={t('common.save')} variant="tonal" icon="check" onPress={() => setDone(true)} />
        <Button label={t('common.reset')} variant="outlined" onPress={reset} />
      </ScrollView>
      {snackOpen && <View style={styles.snack}>
        <Snackbar message={t('snackbar.done')} onUndo={() => { setDone(false); setSnackOpen(false); }} />
      </View>}
      <Sheet open={sheetOpen} title={t('settings.prayerTimes')} onClose={() => setSheetOpen(false)}>
        <DayLine timeline={timeline} format={format} />
        <Button label={t('common.close')} onPress={() => setSheetOpen(false)} />
      </Sheet>
    </SafeAreaView>
  );
}

export default function ComponentGalleryRoute() {
  return isTestBuild ? <Gallery /> : <Redirect href="/" />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: 14, paddingHorizontal: 20, paddingVertical: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  snack: { position: 'absolute', bottom: 60, left: 12, right: 12 },
});
