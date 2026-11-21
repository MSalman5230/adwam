import { dayDiff, MINUTE_MS, paused, type CivilDate } from '@adwam/core';
import DateTimePicker from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { OptionRow } from '../components/cards';
import { Button, Chip, Switch } from '../components/controls';
import { Sheet } from '../components/overlays';
import { t, type MessageFormat } from '../language/messages';
import type { Settings } from '../state/schema';
import { Prose } from '../theme/Text';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { pauseDurations, pauseFor } from './fasting-pause';

type CloseProps = { onClose: () => void };
type SettingsProps = CloseProps & { settings: Settings; update: (change: (value: Settings) => Settings) => void };

function TimeField({ label, minutes, format, onChange }: {
  label: string; minutes: number; format: MessageFormat; onChange: (value: number) => void;
}) {
  const { palette } = useTheme();
  const [open, setOpen] = useState(false);
  const time = t('settings.wallTime', { time: minutes * MINUTE_MS }, { ...format, timeZone: 'UTC' });
  const value = new Date(2026, 0, 1, Math.floor(minutes / 60), minutes % 60);
  return <View style={styles.timeField}>
    <Prose style={[typography.caption, { color: palette.ink2 }]}>{label}</Prose>
    <Pressable accessibilityRole="button" accessibilityLabel={t('sheet.quiet.timeControl', { label, time })}
      style={[styles.timeButton, { backgroundColor: palette.surface, borderColor: palette.hair2 }]}
      onPress={() => setOpen(true)}>
      <Prose style={typography.button}>{time}</Prose>
    </Pressable>
    {open && <DateTimePicker value={value} mode="time" presentation="dialog" is24Hour={format.uses24HourClock}
      accentColor={palette.green} positiveButton={{ label: t('common.save') }} negativeButton={{ label: t('common.cancel') }}
      onDismiss={() => setOpen(false)} onValueChange={(_, date) => {
        setOpen(false);
        onChange(date.getHours() * 60 + date.getMinutes());
      }} />}
  </View>;
}

function ToggleRow({ title, description, checked, onChange }: {
  title: string; description: string; checked: boolean; onChange: (value: boolean) => void;
}) {
  const { palette } = useTheme();
  return <View style={[styles.toggleRow, { borderColor: palette.hair }]}>
    <Pressable accessible={false} style={styles.toggleText} onPress={() => onChange(!checked)}>
      <Prose style={typography.listTitle}>{title}</Prose>
      <Prose style={[typography.caption, { color: palette.ink2 }]}>{description}</Prose>
    </Pressable>
    <Switch label={title} checked={checked} onChange={onChange} />
  </View>;
}

export function QuietSheet({ settings, format, update, onClose }: SettingsProps & { format: MessageFormat }) {
  const { quietHours, eclipseQuiet } = settings.reminders;
  const setTime = (field: 'start' | 'end', minute: number) => update((value) => ({
    ...value, reminders: { ...value.reminders, quietHours: { ...value.reminders.quietHours, [field]: minute } },
  }));
  return (
    <Sheet open title={t('sheet.quiet.title')} lead={t('sheet.quiet.body')} onClose={onClose}>
      <View style={styles.timeRow}>
        <TimeField label={t('sheet.quiet.starts')} minutes={quietHours.start} format={format} onChange={(value) => setTime('start', value)} />
        <TimeField label={t('sheet.quiet.ends')} minutes={quietHours.end} format={format} onChange={(value) => setTime('end', value)} />
      </View>
      <ToggleRow title={t('sheet.quiet.eclipse')} description={t('sheet.quiet.eclipseHint')} checked={eclipseQuiet}
        onChange={(checked) => update((value) => ({ ...value, reminders: { ...value.reminders, eclipseQuiet: checked } }))} />
    </Sheet>
  );
}

export function PauseSheet({ settings, today, update, onClose }: SettingsProps & { today: CivilDate }) {
  const pause = settings.reminders.pause;
  const active = paused(pause, today);
  const selected = active ? pause?.until ? pause.days ?? dayDiff(pause.until, today) + 1 : 0 : undefined;
  return (
    <Sheet open title={t('sheet.pause.title')} lead={t('sheet.pause.body')} onClose={onClose}>
      <View style={styles.chips}>
        {pauseDurations.map((days) => <Chip key={days} label={days ? t('reminders.pauseDays', { count: days }) : t('reminders.pauseUntilOff')}
          selected={selected === days} onPress={() => update((value) => ({ ...value, reminders: { ...value.reminders, pause: pauseFor(today, days) } }))} />)}
      </View>
      {active && <Button label={t('sheet.pause.resume')} variant="outlined" style={styles.action} onPress={() => {
        update((value) => ({ ...value, reminders: { ...value.reminders, pause: null } }));
        onClose();
      }} />}
    </Sheet>
  );
}

const udhiyahOptions = [
  { value: 'yes', label: 'sheet.udhiyah.yes' },
  { value: 'no', label: 'sheet.udhiyah.no' },
  { value: null, label: 'sheet.udhiyah.unset', description: 'sheet.udhiyah.remind' },
] as const;

export function UdhiyahSheet({ settings, year, update, onClose }: SettingsProps & { year: number }) {
  const answer = settings.reminders.udhiyah[year] ?? null;
  return (
    <Sheet open title={t('sheet.udhiyah.title')} lead={t('sheet.udhiyah.body')} onClose={onClose}>
      <View style={styles.options}>
        {udhiyahOptions.map((option) => <OptionRow key={option.label} title={t(option.label)}
          subtitle={'description' in option ? t(option.description) : undefined} selected={answer === option.value}
          onPress={() => {
            update((value) => ({ ...value, reminders: { ...value.reminders, udhiyah: { ...value.reminders.udhiyah, [year]: option.value } } }));
            onClose();
          }} />)}
      </View>
    </Sheet>
  );
}

const appearances = [
  { value: 'system', label: 'sheet.theme.system' },
  { value: 'light', label: 'sheet.theme.light', description: 'sheet.theme.lightHint' },
  { value: 'dark', label: 'sheet.theme.dark', description: 'sheet.theme.darkHint' },
] as const;

export function AppearanceSheet({ onClose }: CloseProps) {
  const { preference, setPreference } = useTheme();
  return (
    <Sheet open title={t('sheet.theme.title')} lead={t('sheet.theme.body')} onClose={onClose}>
      <View style={styles.options}>
        {appearances.map((option) => <OptionRow key={option.value} title={t(option.label)}
          subtitle={'description' in option ? t(option.description) : undefined} selected={preference === option.value}
          onPress={() => setPreference(option.value)} />)}
      </View>
    </Sheet>
  );
}

export function PrivacySheet({ settings, update, onClose }: SettingsProps) {
  const { palette } = useTheme();
  const [confirm, setConfirm] = useState(false);
  if (confirm) return (
    <Sheet open title={t('sheet.privacy.confirmTitle')} lead={t('sheet.privacy.confirmBody')} onClose={() => setConfirm(false)}>
      <Prose style={[typography.caption, styles.options, { color: palette.ink2 }]}>{t('sheet.privacy.noSavedSettings')}</Prose>
      <View style={styles.chips}>
        <Button label={t('common.cancel')} variant="outlined" onPress={() => setConfirm(false)} />
        <Button label={t('common.delete')} disabled onPress={() => {}} />
      </View>
    </Sheet>
  );
  return (
    <Sheet open title={t('sheet.privacy.title')} onClose={onClose}>
      <View style={styles.options}>
        <ToggleRow title={t('sheet.privacy.crash')} description={t('sheet.privacy.crashHint')} checked={settings.crashReports}
          onChange={(crashReports) => update((value) => ({ ...value, crashReports }))} />
        <ToggleRow title={t('sheet.privacy.usage')} description={t('sheet.privacy.usageHint')} checked={settings.usageStats}
          onChange={(usageStats) => update((value) => ({ ...value, usageStats, usagePrompt: false }))} />
      </View>
      <Button label={t('sheet.privacy.delete')} variant="outlined" style={styles.action} onPress={() => setConfirm(true)} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  timeRow: { flexDirection: 'row', gap: 12, marginVertical: 16 },
  timeField: { flex: 1, gap: 4 },
  timeButton: { minHeight: 46, justifyContent: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12 },
  toggleRow: { flexDirection: 'row', gap: 12, alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 8 },
  toggleText: { flex: 1, gap: 3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  options: { marginTop: 16 },
  action: { marginTop: 20 },
});
