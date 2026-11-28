import type { GroupedSunnah } from '@adwam/content/schema';
import { hijriMonths, level, type CivilDate, type Preset, type PushEstimate, type ReminderLevel, type ReminderState } from '@adwam/core';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Segmented, Switch } from '../components/controls';
import { Icon } from '../icons';
import { t } from '../language/messages';
import { PauseDurationChips } from '../settings/PauseDurationChips';
import type { PauseDays } from '../settings/fasting-pause';
import { prayerEntry } from '../state/reminder-catalog';
import { reminderOptions } from '../state/reminder-choices';
import { Prose } from '../theme/Text';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';

export const groupOrder = ['weekly', 'monthly', 'yearly', 'weather', 'disputed'] as const;
const monthOf = (entry: GroupedSunnah) => entry.month ? hijriMonths.indexOf(entry.month) + 1 : 0;
const presetOptions = [
  { value: 'recommended', label: t('reminders.preferred') },
  { value: 'inapp', label: t('reminders.inappOnly') },
] as const;

export function PresetCard({ estimate, preset, onChange }: { estimate: PushEstimate; preset: Preset; onChange: (value: Preset) => void }) {
  const { palette } = useTheme();
  const { daily, weekly, monthly, yearly, weather, none } = estimate;
  const total = weekly ? t('reminders.weekly', { count: weekly }) : t('reminders.noWeekly');
  const other = [
    daily ? t('reminders.daily', { count: daily }) : '',
    monthly ? t('reminders.monthly', { count: monthly }) : '',
    yearly ? t('reminders.yearly', { count: yearly }) : '',
    weather ? t('reminders.weather') : '',
  ].filter(Boolean).join(' · ');
  const more = other ? t('reminders.plus', { text: other }) : t('reminders.nothingElse');
  return <Panel style="summary">
    <Prose style={[typography.overline, { color: palette.goldText }]}>{t('reminders.total')}</Prose>
    <Prose accessibilityLiveRegion="polite" style={[typography.sheetTitle, styles.total]}>{none ? t('reminders.noPushes') : total}</Prose>
    <Prose style={[typography.supporting, styles.subtitle, { color: palette.ink2 }]}>{none ? t('reminders.allOnToday') : more}</Prose>
    <View style={styles.presetOptions}>
      <Segmented<Preset> label={t('reminders.title')} options={presetOptions} value={preset} onChange={onChange} />
    </View>
    {preset === 'custom' && <View style={styles.custom}>
      <Prose style={[typography.caption, { color: palette.ink2 }]}>{t('reminders.customChoices')}</Prose>
      <Button label={t('common.reset')} icon="restart_alt" variant="text" small onPress={() => onChange('recommended')} />
    </View>}
  </Panel>;
}

export function PrayerTimesCard({ choice, onChoice, onOpen }: {
  choice: ReminderLevel; onChoice: (value: ReminderLevel) => void; onOpen: () => void;
}) {
  const { palette } = useTheme();
  const title = t('reminders.prayers.title');
  return <Panel style="prayers">
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onOpen} style={styles.itemTitle}>
      <Prose style={[typography.cardTitle, styles.itemName]}>{title}</Prose>
      <Icon name="chevron_right" size={18} color={palette.ink3} />
    </Pressable>
    <Prose accessibilityLiveRegion="polite" style={[typography.caption, { color: palette.ink2 }]}>{t(`reminders.prayers.${choice}`)}</Prose>
    <View style={styles.prayerOptions}>
      <Segmented testID="reminders-prayers" label={title} options={reminderOptions(prayerEntry)} value={choice} onChange={onChoice} />
    </View>
  </Panel>;
}

export function FastingPauseCard({ duration, until, onToggle, onDuration }: {
  duration?: number; until?: CivilDate | null; onToggle: (active: boolean) => void; onDuration: (days: PauseDays) => void;
}) {
  const active = duration !== undefined;
  const title = t('sheet.pause.title');
  let subtitle = t('reminders.pauseReason');
  if (active) subtitle = until ? t('reminders.pausedUntil', { date: until }) : t('reminders.pausedIndefinite');
  return <Panel style="pause">
    <View style={styles.pauseHeader}>
      <View style={styles.grow}><Heading title={title} subtitle={subtitle} /></View>
      <Switch testID="reminders-pause-switch" label={title} checked={active} onChange={onToggle} />
    </View>
    {active && <View style={styles.pauseOptions}><PauseDurationChips selected={duration} onChange={onDuration} /></View>}
  </Panel>;
}

type GroupActions = {
  onChoice: (entry: GroupedSunnah, value: ReminderLevel) => void;
  onOpen: (entry: GroupedSunnah) => void;
  onUdhiyah: () => void;
};

export function ReminderGroup({ group, state, year, onToggle, onChoice, onOpen, onUdhiyah }: GroupActions & {
  group: (typeof groupOrder)[number]; state: ReminderState; year: number; onToggle: (enabled: boolean) => void;
}) {
  const { palette } = useTheme();
  const [open, setOpen] = useState(group === 'weekly');
  const entries = useMemo(() => {
    const items = state.catalog.filter((entry) => entry.group === group && !entry.hidden);
    if (group === 'yearly') items.sort((left, right) => monthOf(left) - monthOf(right));
    return items;
  }, [group, state.catalog]);
  const disputed = group === 'disputed';
  if (disputed && entries.length === 0) return null;
  const choices = entries.map((entry) => ({ entry, choice: level(state, entry.id, year) }));
  const enabled = disputed || state.preferences.groupOn?.[group] !== false;
  const pushes = choices.filter(({ choice }) => choice === 'push').length;
  const participating = choices.filter(({ choice }) => choice !== 'off').length;
  const title = disputed ? t('reminders.disputedTitle') : t(`reminders.group.${group}`);
  const pushLabel = pushes ? t('reminders.pushesInGroup', { count: pushes }) : t('reminders.inappGroup');
  let subtitle = enabled ? t('reminders.groupCount', { count: entries.length, detail: pushLabel }) : t('reminders.off');
  if (disputed) {
    subtitle = participating ? t('reminders.disputedOn', { count: participating }) : t('reminders.disputedOff', { count: entries.length });
  }
  return <Panel>
    <View style={styles.groupHeader}>
      <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)} style={styles.expand}>
        <View style={styles.grow}><Heading title={title} subtitle={subtitle} /></View>
        <View style={open && styles.expanded}><Icon name="expand_more" size={22} color={palette.ink3} /></View>
      </Pressable>
      {!disputed && <Switch testID={`reminders-group-${group}-switch`} label={title} checked={enabled} onChange={onToggle} />}
    </View>
    {open && <View style={[styles.groupBody, { borderColor: palette.hair }]}>
      {!enabled && <Prose style={[typography.caption, styles.groupNote, { color: palette.ink2 }]}>{t('reminders.restoreChoices')}</Prose>}
      {choices.map(({ entry, choice }, index) => {
        const month = monthOf(entry);
        const previous = entries[index - 1];
        const newMonth = group === 'yearly' && (!previous || monthOf(previous) !== month);
        const gated = Boolean(entry.rules?.includes('requires-udhiyah') && state.preferences.udhiyah?.[year] !== 'yes');
        return <View key={entry.id} style={index > 0 && !newMonth && [styles.divider, { borderColor: palette.hair }]}>
          {newMonth && <Prose accessibilityRole="header" style={[typography.overline, styles.month, { color: palette.goldText }]}>
            {month ? t('detail.hijriMonth', { month }) : t('reminders.throughYear')}
          </Prose>}
          <ReminderRow entry={entry} choice={choice} gated={gated} onChoice={onChoice} onOpen={onOpen} onUdhiyah={onUdhiyah} />
        </View>;
      })}
      {group === 'weather' && <Prose style={[typography.caption, styles.groupNote, { color: palette.ink2 }]}>{t('reminders.weatherOff')}</Prose>}
    </View>}
  </Panel>;
}

function ReminderRow({ entry, choice, gated, onChoice, onOpen, onUdhiyah }: GroupActions & {
  entry: GroupedSunnah; choice: ReminderLevel; gated: boolean;
}) {
  const { palette } = useTheme();
  return <View style={styles.row}>
    <Pressable accessibilityRole="button" accessibilityLabel={entry.title} onPress={() => onOpen(entry)} style={styles.itemTitle}>
      <Prose style={[typography.bannerTitle, styles.itemName]}>{entry.title}</Prose>
      <Icon name="chevron_right" size={18} color={palette.ink3} />
    </Pressable>
    {entry.group === 'disputed' && <Prose style={[typography.small, { color: palette.ink2 }]}>{entry.short}</Prose>}
    {gated ? <>
      <Prose style={[typography.small, { color: palette.ink2 }]}>{t('reminders.udhiyahOnly')}</Prose>
      <Button label={t('reminders.setUdhiyah')} variant="text" small onPress={onUdhiyah} style={styles.udhiyahLink} />
    </> : <View style={styles.levelOptions}>
      <Segmented testID={`reminders-${entry.id}`} label={entry.title} options={reminderOptions(entry)} value={choice}
        onChange={(value) => onChoice(entry, value)} />
    </View>}
  </View>;
}

function Panel({ children, style }: { children: ReactNode; style?: 'summary' | 'pause' | 'prayers' }) {
  const { palette } = useTheme();
  return <View style={[styles.panel, style && styles[style], { backgroundColor: palette.surface, borderColor: palette.hair }]}>{children}</View>;
}

function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  const { palette } = useTheme();
  return <>
    <Prose style={typography.cardTitle}>{title}</Prose>
    <Prose style={[typography.caption, styles.groupSubtitle, { color: palette.ink2 }]}>{subtitle}</Prose>
  </>;
}

const styles = StyleSheet.create({
  panel: { marginTop: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 16 },
  summary: { marginTop: 16, padding: 16 },
  total: { marginTop: 6 },
  subtitle: { marginTop: 4 },
  presetOptions: { marginTop: 14 },
  custom: { marginTop: 6, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' },
  pause: { paddingVertical: 14, paddingLeft: 16, paddingRight: 14 },
  prayers: { paddingTop: 4, paddingBottom: 14, paddingHorizontal: 16 },
  prayerOptions: { marginTop: 10 },
  pauseHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pauseOptions: { marginTop: 8 },
  grow: { flex: 1 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', paddingRight: 14, gap: 12 },
  expand: { flex: 1, minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 16 },
  expanded: { transform: [{ rotate: '180deg' }] },
  groupSubtitle: { marginTop: 2 },
  groupBody: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 4, paddingHorizontal: 16, paddingBottom: 14 },
  groupNote: { marginTop: 12 },
  month: { marginTop: 18 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 10 },
  row: { paddingTop: 4, paddingBottom: 2 },
  itemTitle: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemName: { flexShrink: 1 },
  levelOptions: { marginTop: 2 },
  udhiyahLink: { paddingHorizontal: 0 },
});
