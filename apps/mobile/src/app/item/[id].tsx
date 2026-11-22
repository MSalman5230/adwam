import catalog from '@adwam/content/catalog';
import type { Dua } from '@adwam/content/schema';
import { effectiveHijri, hijriMonths, type Msg, type ReminderLevel } from '@adwam/core';
import { setStringAsync } from 'expo-clipboard';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useStore } from 'zustand';

import { Subpage } from '../../components/Subpage';
import { TrackerDots } from '../../components/calendarDisplay';
import { Button, Checkbox, Segmented } from '../../components/controls';
import { SectionHeader } from '../../components/headers';
import { Snackbar } from '../../components/overlays';
import { ReportSheet } from '../../detail/ReportSheet';
import { Sources, duaCredit } from '../../detail/Sources';
import { Icon } from '../../icons';
import { renderMessage, t } from '../../language/messages';
import { useMessageFormat } from '../../language/useMessageFormat';
import { readItemParams } from '../../navigation/item-params';
import { track } from '../../services/usage-statistics';
import { editOccurrenceTick } from '../../state/occurrence-tracking';
import { reminderOptions, setReminderChoice } from '../../state/reminder-choices';
import { selectDetail, selectReminderState } from '../../state/selectors';
import { editMakeup, type TrackerEdit } from '../../state/tracker-edits';
import { useClock, useReminderStores } from '../../state/useClock';
import { ArabicText, Prose } from '../../theme/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { typography } from '../../theme/typography';

type Snack = { message: string; undo?: () => void };
const duasById = new Map(catalog.duas.map((dua) => [dua.id, dua]));

export default function ItemScreen() {
  const item = readItemParams(useLocalSearchParams());
  if (!item) return <Redirect href="/today" />;
  return <ReminderDetail key={item.id} item={item} />;
}

function ReminderDetail({ item }: { item: NonNullable<ReturnType<typeof readItemParams>> }) {
  const { palette } = useTheme();
  const { settings: settingsStore, trackers: trackersStore, serverCache: cacheStore } = useReminderStores();
  const settings = useStore(settingsStore, ({ value }) => value);
  const trackers = useStore(trackersStore, ({ value }) => value);
  const cache = useStore(cacheStore, ({ value }) => value);
  const now = useClock();
  const format = useMessageFormat(settings.location?.timeZone);
  const state = selectReminderState(settings, trackers, cache, catalog.sunnahs);
  const view = state && selectDetail(now, state, item.id, item.date, item.occurrenceKey);
  const [snack, setSnack] = useState<Snack>();
  const [reportOpen, setReportOpen] = useState(false);
  useEffect(() => {
    if (!snack) return;
    const timer = setTimeout(() => setSnack(undefined), 5_000);
    return () => clearTimeout(timer);
  }, [snack]);

  if (!view || !state) return <Redirect href="/today" />;
  const { entry, occurrence, status, tick, tracker, reminder } = view;
  const group = entry.group === 'weather' ? t('detail.weatherGroup') : t(`reminders.group.${entry.group}`);
  const month = entry.group === 'yearly' && entry.month
    ? t('detail.hijriMonth', { month: hijriMonths.indexOf(entry.month) + 1 }) : undefined;
  const quran = entry.quran;
  const overline = [group, month, t(`reminders.${entry.tier}`)].filter(Boolean).join(' · ');
  const udhiyahPending = entry.rules?.includes('requires-udhiyah')
    && settings.reminders.udhiyah[effectiveHijri(now, state.calendar).year] !== 'yes';

  const commitEdit = (edit: TrackerEdit, message: string) => {
    trackersStore.getState().update(() => edit.next);
    setSnack({ message, undo: () => {
      trackersStore.getState().update(edit.undo);
    } });
  };
  const toggleTick = (checked: boolean) => {
    if (!occurrence || !tick) return;
    const { edit, message } = editOccurrenceTick(trackersStore.getState().value, occurrence, tick, settings.hijri, checked);
    commitEdit(edit, renderMessage(message, format));
  };
  const logMakeup = () => {
    const previous = trackersStore.getState().value;
    if (!previous.makeup) return;
    const count = previous.makeup - 1;
    commitEdit(editMakeup(previous, count), count ? t('snackbar.makeupLogged', { count }) : t('snackbar.makeupDone'));
  };
  const changeLevel = (level: ReminderLevel) => {
    settingsStore.getState().update((previous) => setReminderChoice(previous, entry, level));
    if (view.level !== level) track({ event: 'reminder_level_changed', properties: { item: entry.id, level } });
  };
  const openLink = (url: string) => {
    void Linking.openURL(url).catch(() => setSnack({ message: t('detail.linkUnavailable') }));
  };
  const copy = async (dua: Dua) => {
    try {
      const copied = await setStringAsync([dua.ar, dua.tr, dua.en].join('\n'));
      setSnack({ message: t(copied ? 'snackbar.duaCopied' : 'detail.copyUnavailable') });
    } catch {
      setSnack({ message: t('detail.copyUnavailable') });
    }
  };

  return (
    <Subpage title={entry.title} overline={overline} titleDetails={<>
      {status && <DetailStatus message={status} label={renderMessage(status, format)} />}
      <View style={styles.when}>
        <Icon name="schedule" color={palette.gold} size={18} />
        <Prose style={[typography.supporting, styles.flex, { color: palette.ink2 }]}>{entry.when}</Prose>
      </View>
    </>} overlay={snack && <View style={styles.snackbar}><Snackbar message={snack.message} onUndo={snack.undo && (() => {
      snack.undo?.();
      setSnack(undefined);
    })} /></View>}>
      <SectionHeader title={t('detail.what')} />
      <View style={styles.paragraphs}>
        {entry.what.map((paragraph) => <Prose key={paragraph} style={typography.body}>{paragraph}</Prose>)}
      </View>
      {(tick || tracker) && <View style={styles.actions}>
        {tick && <Checkbox label={renderMessage(tick.label, format)} checked={tick.done} onChange={toggleTick} />}
        {tracker?.kind === 'makeup' && <View style={styles.makeup}>
          <Prose style={[typography.caption, styles.flex, { color: palette.ink2 }]}>{renderMessage(tracker.label, format)}</Prose>
          {!!tracker.count && <Button label={t('detail.logOne')} icon="check" variant="tonal" small onPress={logMakeup} />}
        </View>}
        {tracker && tracker.kind !== 'makeup' && <TrackerDots completed={tracker.count} total={tracker.total}
          label={renderMessage(tracker.label, format)} />}
      </View>}
      {quran && <Button label={quran.label} icon="menu_book" style={styles.quran} onPress={() => openLink(quran.url)} />}
      {entry.duas.length > 0 && <>
        <SectionHeader title={t('detail.dua')} />
        {entry.duas.map((id) => {
          const dua = duasById.get(id);
          return dua && <DuaCard key={id} dua={dua} onCopy={() => { void copy(dua); }} />;
        })}
      </>}
      <Sources entry={entry} openLink={openLink} />
      {reminder && <>
        <SectionHeader title={t('detail.reminderTitle')} />
        <Segmented label={t('detail.reminderTitle')} value={view.level} onChange={changeLevel} options={reminderOptions(entry)} />
        <Prose style={[typography.caption, styles.caption, { color: palette.ink2 }]}>
          {[renderMessage(reminder, format), udhiyahPending && t('detail.onlyWithUdhiyah')].filter(Boolean).join(' ')}
        </Prose>
      </>}
      <View style={[styles.footer, { borderColor: palette.hair }]}>
        <Button variant="text" style={styles.footerButton} label={t('detail.reportLink')} icon="flag" onPress={() => {
          setReportOpen(true);
          track({ event: 'report_opened', properties: { item: entry.id } });
        }} />
        {entry.group === 'weather' && entry.occurrences.some(({ on }) => 'weather' in on) && (
          <Button variant="text" style={styles.footerButton} label={t('about.weather')} icon="rainy"
            onPress={() => openLink('https://open-meteo.com/')} />
        )}
        <Prose style={[typography.small, { color: palette.paperCaption }]}>
          {t('detail.entryVersion', { id: `${entry.group}.${entry.id}`, version: catalog.version })}
        </Prose>
      </View>
      <ReportSheet entry={entry} version={catalog.version} open={reportOpen} onClose={() => setReportOpen(false)} />
    </Subpage>
  );
}

function DetailStatus({ message, label }: { message: Msg; label: string }) {
  const { palette } = useTheme();
  const active = message.key === 'detail.status.banner' || message.key === 'detail.status.active';
  const soon = message.key === 'detail.status.next';
  const color = active ? palette.onSage : soon ? palette.gold : palette.ink2;
  return (
    <View style={[styles.status, { backgroundColor: active ? palette.sage : soon ? palette.goldSoft : palette.paper2 }]}>
      <View aria-hidden style={[styles.statusDot, { backgroundColor: color }]} />
      <Prose style={[typography.button, styles.statusLabel, { color: soon ? palette.goldText : color }]}>{label}</Prose>
    </View>
  );
}

function DuaCard({ dua, onCopy }: { dua: Dua; onCopy: () => void }) {
  const { palette } = useTheme();
  const credit = duaCredit(dua.source);
  return (
    <View style={[styles.dua, { backgroundColor: palette.surface, borderColor: palette.hair }]}>
      <ArabicText>{dua.ar}</ArabicText>
      <Prose style={typography.transliteration}>{dua.tr}</Prose>
      <Prose style={[typography.prose, { color: palette.ink2 }]}>{dua.en}</Prose>
      {credit && <Prose style={[typography.small, { color: palette.ink2 }]}>{credit}</Prose>}
      <Button label={t('detail.copy')} variant="outlined" icon="content_copy" small onPress={onCopy} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  status: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { flexShrink: 1, fontSize: 13.5 },
  when: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 4 },
  paragraphs: { gap: 8 },
  actions: { marginTop: 6 },
  makeup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quran: { marginTop: 16 },
  dua: { gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderRadius: 16 },
  caption: { marginTop: 10 },
  footer: { marginTop: 28, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth, gap: 2 },
  footerButton: { alignSelf: 'flex-start', marginLeft: -8, paddingHorizontal: 8 },
  snackbar: { position: 'absolute', left: 16, right: 16, bottom: 16 },
});
