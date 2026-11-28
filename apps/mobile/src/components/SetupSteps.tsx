import { civil, day, dayLine, effectiveHijri, isoAdd, isoParts, localToMs, type DaySettings, type ReminderLevel } from '@adwam/core';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Crescent, Icon, type IconName } from '../icons';
import { t } from '../language/messages';
import { useMessageFormat } from '../language/useMessageFormat';
import { useTheme } from '../theme/ThemeProvider';
import { brandCrescent } from '../theme/tokens';
import { typography } from '../theme/typography';
import { DayLine } from './calendarDisplay';
import { RadioCard } from './cards';
import { Segmented } from './controls';

export type SetupPreset = 'recommended' | 'inapp' | 'custom';
export type DateShift = -1 | 0 | 1;

function PromiseList({ children }: { children: ReactNode }) {
  const { palette } = useTheme();
  return <View style={[styles.promise, { backgroundColor: palette.surface, borderColor: palette.hair }]}>{children}</View>;
}

function PromiseRow({ icon, title, body, divided }: { icon: IconName; title?: string; body: string; divided?: boolean }) {
  const { palette } = useTheme();
  return (
    <View style={[styles.promiseRow, divided && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: palette.hair }]}>
      <Icon name={icon} size={22} color={palette.gold} />
      <View style={styles.grow}>
        {title && <Text style={[typography.listTitle, { color: palette.ink }]}>{title}</Text>}
        <Text style={[typography.supporting, { color: palette.ink2 }]}>{body}</Text>
      </View>
    </View>
  );
}

export function SetupWelcome() {
  const { palette } = useTheme();
  return (
    <View style={[styles.welcome, { borderColor: palette.goldLine }]}>
      <View style={[styles.welcomeIcon, { backgroundColor: palette.green }]}><Crescent color={brandCrescent} size={30} /></View>
      <View style={styles.grow}>
        <Text style={[typography.sheetTitle, { color: palette.ink }]}>{t('app.name')}</Text>
        <Text style={[typography.sheetLead, { color: palette.ink2 }]}>{t('app.tagline')}</Text>
      </View>
    </View>
  );
}

export function SetupLocationDetails({ placeName }: { placeName?: string }) {
  const { palette } = useTheme();
  return (
    <View style={[styles.details, styles.location]}>
      <PromiseList>
        <PromiseRow icon="lock" title={t('setup.location.noAccount')} body={t('setup.location.trackers')} />
        <PromiseRow icon="location_on" title={t('setup.location.roughArea')} body={t('setup.location.areaUse')} divided />
        <PromiseRow icon="notifications" title={t('setup.location.reminders')} body={t('setup.location.reminderChoice')} divided />
      </PromiseList>
      {placeName && <Text accessibilityLiveRegion="polite" style={[typography.listTitle, { color: palette.ink }]}>{placeName}</Text>}
    </View>
  );
}

export function SetupHijriDate({ calendar, city, now, shift, onShift }: {
  calendar: DaySettings; city: string; now: number; shift: DateShift; onShift: (shift: DateShift) => void;
}) {
  const { palette } = useTheme();
  const format = useMessageFormat(calendar.place.timeZone);
  const { iso } = civil(now, format.timeZone);
  const today = day(iso, calendar);
  const hijri = effectiveHijri(now, calendar);
  const tomorrow = day(isoAdd(iso, 1), calendar).hijri;
  const monday = isoAdd(iso, -((today.weekday + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => day(isoAdd(monday, i), calendar));
  const first = week[0]!.hijri;
  const last = week[6]!.hijri;
  const month = t('setup.hijri.monthName', { month: last.month });
  const monthSpan = first.month === last.month ? month
    : t('setup.hijri.monthSpan', { first: first.month, last: last.month });
  return (
    <View style={styles.details}>
      <View style={styles.hijriDate}>
        <Text style={[typography.setupBody, { color: palette.ink2 }]}>{t('setup.hijri.todayIs')}</Text>
        <Text accessibilityLiveRegion="polite" style={[typography.hijriTitle, styles.dateText, { color: palette.green }]}>
          {t('calendar.hijriDate', hijri)}
        </Text>
        <Text style={[typography.setupBody, { color: palette.ink2 }]}>{t('setup.hijri.place', { date: iso, city })}</Text>
      </View>
      <Text style={[typography.setupBody, { color: palette.ink }]}>{t('setup.hijri.question')}</Text>
      <Segmented label={t('setup.hijri.question')} value={String(shift) as '-1' | '0' | '1'} onChange={(value) => onShift(Number(value) as DateShift)}
        options={[
          { value: '-1', label: t('setup.hijri.previousDay') }, { value: '0', label: t('setup.hijri.sameDay') },
          { value: '1', label: t('setup.hijri.nextDay') },
        ]} />
      <View>
        <View accessibilityLabel={t('setup.hijri.week')} role="group"
          style={[styles.week, { borderColor: palette.hair, backgroundColor: palette.surface }]}>
          {week.map(({ iso: date, hijri: cell }) => (
            <View key={date} style={[styles.weekDay, date === iso && { backgroundColor: palette.sage }]}>
              <Text style={[typography.tag, { color: palette.ink2 }]}>{t('setup.hijri.weekday', { date }).slice(0, 2).toUpperCase()}</Text>
              <Text style={[typography.cardTitle, { color: palette.ink }]}>{isoParts(date).day}</Text>
              <Text style={[typography.tag, { color: palette.green }]}>{cell.day}</Text>
              {cell.day === 1 && <Text style={[styles.monthAbbreviation, typography.tag, { color: palette.goldText }]} numberOfLines={1}>
                {t('setup.hijri.monthName', { month: cell.month }).split(' ')[0]?.slice(0, 5)}
              </Text>}
            </View>
          ))}
        </View>
        <View style={styles.weekCaption}>
          <Text style={[typography.prayerTime, { color: palette.paperCaption }]}>{t('setup.hijri.weekStart', { date: monday })}</Text>
          <Text style={[typography.prayerTime, { color: palette.goldText }]}>{t('setup.hijri.weekEnd', { month: monthSpan, year: last.year })}</Text>
        </View>
      </View>
      <PromiseList>
        <PromiseRow icon="bedtime" body={hijri.sinceMaghrib ? t('setup.hijri.afterMaghrib')
          : t('setup.hijri.beforeMaghrib', { time: today.times.maghrib, day: tomorrow.day, month: tomorrow.month }, format)} />
        <PromiseRow icon="calendar_month" body={t('setup.hijri.calculated')} divided />
      </PromiseList>
    </View>
  );
}

export function SetupReminderChoices({ preset, onChoose }: { preset: SetupPreset; onChoose: (preset: SetupPreset) => void }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={t('setup.reminders.title')} style={styles.choices}>
      <RadioCard title={t('reminders.preferred')} subtitle={t('setup.reminders.recommended')} detail={t('setup.reminders.estimated')} detailIcon="notifications"
        selected={preset === 'recommended'} onPress={() => onChoose('recommended')} />
      <RadioCard title={t('reminders.inappOnly')} subtitle={t('setup.reminders.inapp')} detail={t('setup.reminders.inappHint')} detailIcon="notifications_off"
        selected={preset === 'inapp'} onPress={() => onChoose('inapp')} />
      <RadioCard title={t('setup.reminders.choose')} subtitle={t('setup.reminders.chooseBody')} detail={t('setup.reminders.chooseHint')} detailIcon="tune"
        selected={preset === 'custom'} onPress={() => onChoose('custom')} />
    </View>
  );
}

export function SetupPrayerTimes({ calendar, city, now, choice, onChoose }: {
  calendar: DaySettings; city: string; now: number; choice: ReminderLevel; onChoose: (choice: ReminderLevel) => void;
}) {
  const { palette } = useTheme();
  const format = useMessageFormat(calendar.place.timeZone);
  const today = day(civil(now, format.timeZone).iso, calendar);
  const method = t(`settings.prayerMethodsShort.${calendar.prayer.method}`);
  return (
    <View style={styles.details}>
      <Text style={[typography.setupBody, { color: palette.ink2 }]}>{t('setup.prayers.body', { city })}</Text>
      <DayLine timeline={dayLine(now, today)} format={format} />
      <Text style={[typography.supporting, { color: palette.ink2 }]}>{t('setup.prayers.method', { method })}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={t('setup.prayers.title')} style={styles.prayerChoices}>
        <RadioCard title={t('reminders.push')} subtitle={t('setup.prayers.push')} detail={t('setup.prayers.pushDetail')} detailIcon="notifications"
          selected={choice === 'push'} onPress={() => onChoose('push')} />
        <RadioCard title={t('reminders.inapp')} subtitle={t('setup.prayers.inapp')} selected={choice === 'inapp'} onPress={() => onChoose('inapp')} />
        <RadioCard title={t('reminders.off')} subtitle={t('setup.prayers.off')} selected={choice === 'off'} onPress={() => onChoose('off')} />
      </View>
    </View>
  );
}

export function SetupNotificationPreview({ now, timeZone, quiet, reminders, prayers }: {
  now: number; timeZone: string; quiet: { start: number; end: number }; reminders: boolean; prayers: boolean;
}) {
  const { palette } = useTheme();
  const format = useMessageFormat(timeZone);
  const { iso } = civil(now, timeZone);
  const start = localToMs(iso, quiet.start, timeZone);
  const end = localToMs(iso, quiet.end, timeZone);
  const body = !prayers ? 'setup.notifications.body' : reminders ? 'setup.notifications.bodyPrayers' : 'setup.notifications.bodyPrayersOnly';
  return (
    <View style={styles.details}>
      <Text style={[typography.setupBody, { color: palette.ink2 }]}>{t(body, { start, end }, format)}</Text>
      <View style={[styles.preview, { backgroundColor: palette.sys, borderColor: palette.hair }]}>
        <Text style={[typography.overline, { color: palette.ink2 }]}>{t('setup.notifications.sample')}</Text>
        <View style={[styles.previewCard, { backgroundColor: palette.surface }]}>
          <View style={styles.previewHeading}>
            <Crescent size={15} color={palette.green} />
            <Text style={[typography.caption, { color: palette.ink2 }]}>{t('notification.header', { when: t('setup.notifications.sampleDate') })}</Text>
          </View>
          {reminders ? <>
            <Text style={[typography.listTitle, { color: palette.ink }]}>{t('setup.notifications.sampleTitle')}</Text>
            <Text style={[typography.supporting, { color: palette.ink2 }]}>{t('setup.notifications.sampleBody')}</Text>
            <Text style={[typography.button, styles.previewAction, { color: palette.green }]}>{t('common.later')}</Text>
          </> : <>
            <Text style={[typography.listTitle, { color: palette.ink }]}>
              {t('reminder.prayers.pushTitle', { prayer: t('calendar.prayer.maghrib') })}
            </Text>
            <Text style={[typography.supporting, { color: palette.ink2 }]}>{t('reminder.prayers.pushBody')}</Text>
            <View style={styles.previewActions}>
              <Text style={[typography.button, { color: palette.green }]}>{t('common.done')}</Text>
              <Text style={[typography.button, { color: palette.green }]}>{t('common.later')}</Text>
            </View>
          </>}
        </View>
      </View>
      <PromiseList>
        {prayers && <PromiseRow icon="schedule" title={t('setup.notifications.prayers')} body={t('setup.notifications.prayersTime')} />}
        {reminders && <>
          <PromiseRow icon="event" title={t('setup.notifications.fasts')} body={t('setup.notifications.fastTime')} divided={prayers} />
          <PromiseRow icon="mosque" title={t('setup.notifications.friday')} body={t('setup.notifications.fridayTime')} divided />
          <PromiseRow icon="rainy" title={t('setup.notifications.weather')} body={t('setup.notifications.weatherTime')} divided />
        </>}
      </PromiseList>
    </View>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  welcome: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 8, paddingBottom: 20, borderBottomWidth: 1 },
  welcomeIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  promise: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, paddingVertical: 4, paddingHorizontal: 16 },
  promiseRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 13 },
  details: { gap: 14, marginTop: 14 },
  location: { marginTop: 26 },
  hijriDate: { gap: 6, marginTop: 4, marginBottom: 6 },
  dateText: { fontSize: 36, lineHeight: 40 },
  week: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, padding: 6 },
  weekDay: { flex: 1, minWidth: 0, alignItems: 'center', gap: 4, paddingVertical: 8, borderRadius: 11 },
  monthAbbreviation: { fontSize: 10 },
  weekCaption: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 4, margin: 6 },
  choices: { gap: 10, marginTop: 10 },
  prayerChoices: { gap: 10 },
  preview: { borderRadius: 20, borderWidth: 1, padding: 14, gap: 10 },
  previewCard: { borderRadius: 15, padding: 14, gap: 3 },
  previewHeading: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  previewAction: { marginTop: 8 },
  previewActions: { flexDirection: 'row', gap: 24, marginTop: 8 },
});
