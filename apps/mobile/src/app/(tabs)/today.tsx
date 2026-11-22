import catalog from '@adwam/content/catalog';
import type { CivilDate } from '@adwam/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { LayoutAnimation, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import { DayLine } from '../../components/calendarDisplay';
import { Banner, ListRow, Notice } from '../../components/cards';
import { Button, Tag } from '../../components/controls';
import { Hero, SectionHeader } from '../../components/headers';
import { Snackbar } from '../../components/overlays';
import { Icon, type IconName } from '../../icons';
import { renderMessage, t } from '../../language/messages';
import { useMessageFormat } from '../../language/useMessageFormat';
import { appVersion } from '../../services/app-version';
import { openNotificationSettings } from '../../services/notification-settings';
import { needsServerUpdate } from '../../services/server-sync-payload';
import { editOccurrenceTick } from '../../state/occurrence-tracking';
import { selectReminderState, selectToday } from '../../state/selectors';
import { editMakeup, type TrackerEdit } from '../../state/tracker-edits';
import { useClock, useReminderStores } from '../../state/useClock';
import { useTheme } from '../../theme/ThemeProvider';
import { typography } from '../../theme/typography';
import { useDeviceReduceMotion } from '../../theme/useDeviceReduceMotion';
import { ActiveCard, type ActiveReminder, type MakeupAction } from '../../today/ActiveCard';
import { answerTodayNotice, undoTodayCorrection } from '../../today/notice-actions';

type Snack = { message: string; undo?: () => void };
const noticeIcons: Readonly<Record<string, IconName>> = {
  notifications: 'notifications_off', correction: 'event', usage: 'privacy_tip', udhiyah: 'bedtime', pause: 'pause_circle',
};

export default function TodayScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const { setup } = useLocalSearchParams<{ setup?: string }>();
  const { settings: settingsStore, trackers: trackersStore, serverCache: serverCacheStore } = useReminderStores();
  const settings = useStore(settingsStore, ({ value }) => value);
  const trackers = useStore(trackersStore, ({ value }) => value);
  const cached = useStore(serverCacheStore, ({ value }) => value);
  const now = useClock();
  const reduceMotion = useDeviceReduceMotion();
  const { location } = settings;
  const format = useMessageFormat(location?.timeZone);
  const correction = cached.correctionOffer ?? undefined;
  const state = selectReminderState(settings, trackers, cached, catalog.sunnahs);
  const view = state && selectToday(now, state, settings, correction);
  const updateNeeded = cached.config && needsServerUpdate(appVersion, cached.config.minAppVersion);
  const banner = view?.banner;
  const [snack, setSnack] = useState<Snack>();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  useEffect(() => {
    setSnack(undefined);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [trackersStore]);
  useEffect(() => {
    if (setup !== '1') return;
    setSnack({ message: t('snackbar.setup') });
    router.setParams({ setup: undefined });
  }, [router, setup]);
  useEffect(() => {
    if (!snack) return;
    const timer = setTimeout(() => setSnack(undefined), 5_000);
    return () => clearTimeout(timer);
  }, [snack]);

  const openItem = (id: string, date: CivilDate) => router.push({ pathname: '/item/[id]', params: { id, date } });
  const animateLayout = () => {
    if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.create(420, 'easeInEaseOut', 'opacity'));
  };
  const commitEdit = (edit: TrackerEdit, message?: string, animate = false) => {
    if (animate) animateLayout();
    trackersStore.getState().update(() => edit.next);
    if (message) setSnack({ message, undo: () => {
      if (animate) animateLayout();
      trackersStore.getState().update(edit.undo);
    } });
  };
  const toggle = ({ tick, occurrence }: ActiveReminder, checked: boolean) => {
    if (!tick) return;
    const { edit, message } = editOccurrenceTick(trackersStore.getState().value, occurrence, tick, settings.hijri, checked);
    commitEdit(edit, renderMessage(message, format), tick.type === 'done');
  };
  const updateMakeup = (action: MakeupAction) => {
    const previous = trackersStore.getState().value;
    if (action.kind === 'save') {
      commitEdit(editMakeup(previous, action.count));
    } else if (previous.makeup) {
      const count = previous.makeup - 1;
      commitEdit(editMakeup(previous, count), count ? t('snackbar.makeupLogged', { count }) : t('snackbar.makeupDone'), true);
    }
  };
  const answerNotice = (id: string, action: string, year: number) => {
    if (id === 'notifications') {
      void openNotificationSettings().catch(() => {});
      return;
    }
    const previous = settingsStore.getState().value;
    settingsStore.getState().update((value) => answerTodayNotice(value, id, action, year, correction));
    if (id === 'pause') setSnack({ message: t('snackbar.resumed') });
    if (id === 'udhiyah') setSnack({ message: t(action === 'yes' ? 'snackbar.udhiyahOn' : 'snackbar.udhiyahOff') });
    if (id === 'correction' && correction) {
      const accepted = action === 'accept';
      setSnack({
        message: accepted ? t('snackbar.dateAccepted', { month: correction.month, date: correction.start }) : t('snackbar.dateUnchanged'),
        undo: () => {
          settingsStore.getState().update((current) => undoTodayCorrection(current, previous, correction, accepted));
        },
      });
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: palette.paper }]}>
      <ScrollView ref={scroll} contentContainerStyle={styles.body}>
        {view && location ? <>
          <Hero title={renderMessage(view.title, format)} date subtitle={<>
            <Text style={[typography.subtitle, { color: palette.ink2 }]}>{t('setup.hijri.place', { date: view.date, city: location.name })}</Text>
            {view.sinceMaghribLabel && <Tag label={renderMessage(view.sinceMaghribLabel, format)} tone="gold" icon="bedtime" />}
          </>} />
          <DayLine timeline={view.dayLine} format={format} />
          {(updateNeeded || !!view.notices.length) && <View style={styles.notices}>
            {updateNeeded && <Notice icon="info" title={t('today.notice.updateNeeded.title')} body={t('today.notice.updateNeeded.body')} />}
            {view.notices.map((notice) => (
            <Notice key={notice.id} title={renderMessage(notice.title, format)} body={renderMessage(notice.body, format)}
              icon={noticeIcons[notice.id]} actions={notice.actions.map((action) => ({
                label: renderMessage(action.label, format), variant: action.id === 'accept' ? 'tonal' : 'outlined',
                onPress: () => answerNotice(notice.id, action.id, view.hijri.year),
              }))} />
          ))}</View>}
          {banner && <View style={styles.banner}><Banner
            title={banner.title.replace('{{month}}', t('setup.hijri.monthName', { month: banner.hijri.month }))}
            body={banner.body} onPress={() => openItem(banner.item, banner.date)} />
          </View>}
          <SectionHeader title={t('today.activeTitle')} aside={view.active.length ? renderMessage(view.activeCount, format) : undefined} />
          {view.empty ? <View style={[styles.empty, { borderColor: palette.hair2 }]}>
            <Icon name="wb_twilight" color={palette.gold} />
            <View style={styles.emptyText}>
              <Text style={[typography.bannerTitle, { color: palette.ink }]}>{renderMessage(view.empty.title, format)}</Text>
              <Text style={[typography.supporting, { color: palette.ink2 }]}>{renderMessage(view.empty.body, format)}</Text>
            </View>
          </View> : <View style={styles.cards}>
            {view.active.map((reminder) => (
              <ActiveCard key={reminder.occurrence.key} reminder={reminder} format={format} onMakeup={updateMakeup}
                onOpen={() => openItem(reminder.occurrence.entry.id, reminder.occurrence.date)}
                onTick={(checked) => toggle(reminder, checked)} />
            ))}
          </View>}
          {!!view.coming.length && <>
            <SectionHeader title={t('today.comingTitle')} />
            <View style={[styles.coming, { borderColor: palette.hair, backgroundColor: palette.surface }]}>
              {view.coming.map(({ occurrence, bell, label }) => (
                <ListRow key={occurrence.key} title={occurrence.title} subtitle={renderMessage(label, format)} serif
                  end={bell && <Icon name="notifications" label={t('reminders.push')} size={18} color={palette.gold} />}
                  onPress={() => openItem(occurrence.entry.id, occurrence.date)} />
              ))}
            </View>
            <Button label={t('today.allUpcoming')} variant="text" icon="arrow_forward" iconPosition="end"
              style={styles.allUpcoming} onPress={() => router.navigate('/upcoming')} />
          </>}
        </> : <Hero title={t('navigation.today')} />}
      </ScrollView>
      {snack && <View style={styles.snack}><Snackbar message={snack.message} onUndo={snack.undo && (() => {
        snack.undo?.();
        setSnack(undefined);
      })} /></View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { paddingHorizontal: 20, paddingBottom: 28 },
  notices: { marginTop: 12, gap: 12 },
  banner: { marginTop: 16 },
  cards: { gap: 10 },
  empty: { flexDirection: 'row', gap: 12, borderStyle: 'dashed', borderWidth: 1, borderRadius: 16, padding: 16 },
  emptyText: { flex: 1, gap: 3 },
  coming: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  allUpcoming: { alignSelf: 'flex-end', marginTop: 8 },
  snack: { position: 'absolute', bottom: 20, left: 12, right: 12 },
});
