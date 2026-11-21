import { civil, day, effectiveHijri, MINUTE_MS, prayerMethodAngles, suggestedPrayerMethod } from '@adwam/core';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ListRow, OptionRow } from '../components/cards';
import { Button, Chip, Segmented } from '../components/controls';
import { Sheet } from '../components/overlays';
import { t, type MessageFormat } from '../language/messages';
import { CitySearch } from '../location/CityPicker';
import type { NamedCity } from '../location/cities';
import { locateCurrentCity } from '../location/current-city';
import { prayerMethods, type Settings } from '../state/schema';
import { Prose } from '../theme/Text';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';

type CloseProps = { onClose: () => void };
type EditSettings = (change: (value: Settings) => Settings) => void;
type TimeContext = CloseProps & {
  settings: Settings;
  location: NonNullable<Settings['location']>;
  now: number;
  format: MessageFormat;
  update: EditSettings;
};

function FieldLabel({ children }: { children: string }) {
  const { palette } = useTheme();
  return <Prose accessibilityRole="header" style={[typography.overline, styles.label, { color: palette.gold }]}>{children}</Prose>;
}

function Preview({ title, children }: { title: string; children: string }) {
  const { palette } = useTheme();
  return <View style={[styles.preview, { backgroundColor: palette.sage }]}>
    <Prose style={[typography.cardTitle, { color: palette.onSage }]}>{title}</Prose>
    <Prose style={[typography.caption, { color: palette.onSage }]}>{children}</Prose>
  </View>;
}

export function LocationSheet({ onClose, update }: CloseProps & { update: EditSettings }) {
  const { palette } = useTheme();
  const [locationStatus, setLocationStatus] = useState<'locating' | 'denied' | 'unavailable'>();
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  const close = () => { active.current = false; onClose(); };

  function choose(city: NamedCity, source: 'city' | 'current') {
    if (!active.current) return;
    const { name, latitude, longitude, countryCode, timeZone } = city;
    update((settings) => ({
      ...settings, location: { source, name, latitude, longitude, countryCode, timeZone },
      prayer: { ...settings.prayer, method: suggestedPrayerMethod(countryCode) },
    }));
    close();
  }

  async function locate() {
    setLocationStatus('locating');
    const result = await locateCurrentCity();
    if (!active.current) return;
    if (result.status === 'located') choose(result.city, 'current');
    else setLocationStatus(result.status);
  }

  return (
    <Sheet open title={t('sheet.city.title')} lead={t('sheet.city.body')} onClose={close}>
      <CitySearch onPick={(city) => choose(city, 'city')} leading={<>
        <ListRow title={t('sheet.city.useCurrent')} subtitle={t('sheet.city.updates')} icon="my_location" onPress={() => {
          if (locationStatus !== 'locating') void locate();
        }} />
        {locationStatus && <Prose accessibilityLiveRegion="polite" style={[typography.caption, styles.hint, { color: palette.ink2 }]}>
          {t(locationStatus === 'denied' ? 'snackbar.locationDenied' : `sheet.city.${locationStatus}`)}
        </Prose>}
      </>} />
    </Sheet>
  );
}

export function PrayerSheet({ settings, location, now, format, update, onClose }: TimeContext) {
  const today = civil(now, location.timeZone).iso;
  const { times } = day(today, { place: location, prayer: settings.prayer, hijri: settings.hijri });
  const suggested = suggestedPrayerMethod(location.countryCode);
  return (
    <Sheet open title={t('sheet.prayer.title')} lead={t('sheet.prayer.body', {
      city: location.name, method: t(`settings.prayerMethodsShort.${suggested}`),
    })} onClose={onClose}>
      <FieldLabel>{t('sheet.prayer.method')}</FieldLabel>
      {prayerMethods.map((method) => {
        const angles = prayerMethodAngles(method);
        return <OptionRow key={method} title={t(`sheet.prayer.methods.${method}`)} selected={settings.prayer.method === method}
          subtitle={t(angles.minutes ? 'sheet.prayer.interval' : 'sheet.prayer.angles', angles)}
          onPress={() => update((value) => ({ ...value, prayer: { ...value.prayer, method } }))} />;
      })}
      <FieldLabel>{t('sheet.prayer.asr')}</FieldLabel>
      <Segmented label={t('sheet.prayer.asr')} value={settings.prayer.asr}
        options={[{ value: 'standard', label: t('sheet.prayer.standard') }, { value: 'hanafi', label: t('sheet.prayer.hanafi') }]}
        onChange={(asr) => update((value) => ({ ...value, prayer: { ...value.prayer, asr } }))} />
      <Preview title={t('sheet.prayer.previewTitle', { city: location.name })}>
        {t('sheet.prayer.preview', { asr: times.asr, maghrib: times.maghrib }, format)}
      </Preview>
    </Sheet>
  );
}

const fridayTimes = [12 * 60 + 30, 13 * 60, 13 * 60 + 15, 13 * 60 + 30, 13 * 60 + 45, 14 * 60];

export function JumuahSheet({ settings, location, now, format, update, onClose }: TimeContext) {
  const { palette } = useTheme();
  const jumuah = settings.prayer.jumuah;
  const today = day(civil(now, location.timeZone).iso, { place: location, prayer: settings.prayer, hijri: settings.hijri });
  const chooseTime = (minutes: number) => update((value) => ({ ...value, prayer: { ...value.prayer, jumuah: { mode: 'fixed', minutes } } }));
  return (
    <Sheet open title={t('sheet.jumuah.title')} lead={t('sheet.jumuah.body')} onClose={onClose}>
      <View style={styles.topSpace}>
        <Segmented label={t('sheet.jumuah.title')} value={jumuah.mode}
          options={[{ value: 'dhuhr', label: t('sheet.jumuah.dhuhr') }, { value: 'fixed', label: t('sheet.jumuah.fixed') }]}
          onChange={(mode) => {
            if (mode === 'dhuhr') update((value) => ({ ...value, prayer: { ...value.prayer, jumuah: { mode } } }));
            else if (jumuah.mode !== 'fixed') chooseTime(13 * 60 + 30);
          }} />
      </View>
      {jumuah.mode === 'fixed' ? <View style={styles.chips}>
        {(fridayTimes.includes(jumuah.minutes) ? fridayTimes : [...fridayTimes, jumuah.minutes].sort((a, b) => a - b)).map((minutes) => (
          <Chip key={minutes} label={t('settings.wallTime', { time: minutes * MINUTE_MS }, { ...format, timeZone: 'UTC' })}
            selected={jumuah.minutes === minutes} onPress={() => chooseTime(minutes)} />
        ))}
      </View> : <Prose style={[typography.caption, styles.hint, { color: palette.ink2 }]}>
        {t('sheet.jumuah.preview', { time: today.times.dhuhr, city: location.name }, format)}
      </Prose>}
    </Sheet>
  );
}

const shifts = [
  { value: '-1', label: 'settings.shiftMinus' },
  { value: '0', label: 'sheet.hijri.shiftNone' },
  { value: '1', label: 'settings.shiftPlus' },
] as const;

export function HijriSheet({ settings, location, now, update, onClose }: TimeContext) {
  const { palette } = useTheme();
  const calendar = { place: location, prayer: settings.prayer, hijri: settings.hijri };
  const hijri = effectiveHijri(now, calendar);
  const today = civil(now, location.timeZone).iso;
  const corrections = settings.hijri.corrections.filter(({ withdrawn }) => !withdrawn);
  return (
    <Sheet open title={t('sheet.hijri.title')} lead={t('sheet.hijri.body')} onClose={onClose}>
      <FieldLabel>{t('sheet.hijri.calculation')}</FieldLabel>
      <OptionRow title={t('sheet.hijri.umalqura')} subtitle={t('sheet.hijri.umalquraHint')} selected={settings.hijri.method === 'umalqura'}
        onPress={() => update((value) => ({ ...value, hijri: { ...value.hijri, method: 'umalqura' } }))} />
      <OptionRow title={t('sheet.hijri.civil')} subtitle={t('sheet.hijri.civilHint')} selected={settings.hijri.method === 'civil'}
        onPress={() => update((value) => ({ ...value, hijri: { ...value.hijri, method: 'civil' } }))} />
      <FieldLabel>{t('sheet.hijri.shift')}</FieldLabel>
      <Segmented label={t('sheet.hijri.shift')} value={String(settings.hijri.shift)}
        options={shifts.map(({ value, label }) => ({ value, label: t(label) }))}
        onChange={(shift) => update((value) => ({ ...value, hijri: { ...value.hijri, shift: Number(shift) as -1 | 0 | 1 } }))} />
      <Preview title={t('calendar.hijriDate', hijri)}>{t('sheet.hijri.preview', { date: today })}</Preview>
      <FieldLabel>{t('sheet.hijri.accepted')}</FieldLabel>
      {corrections.length ? corrections.map(({ year, month, start }) => (
        <View key={`${year}-${month}`} style={styles.correction}>
          <View style={styles.correctionText}>
            <Prose style={typography.listTitle}>{t('sheet.hijri.savedCorrection', { year, month })}</Prose>
            <Prose style={[typography.caption, { color: palette.ink2 }]}>{t('sheet.hijri.starts', { date: start })}</Prose>
          </View>
          <Button label={t('common.remove')} variant="outlined" small onPress={() => update((value) => ({
            ...value, hijri: { ...value.hijri, corrections: value.hijri.corrections.filter((correction) => correction.year !== year || correction.month !== month) },
          }))} />
        </View>
      )) : <Prose style={[typography.caption, { color: palette.ink2 }]}>{t('sheet.hijri.noCorrections')}</Prose>}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  label: { marginTop: 18, marginBottom: 8 },
  preview: { marginTop: 16, padding: 12, borderRadius: 12, gap: 3 },
  hint: { marginTop: 12 },
  topSpace: { marginTop: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  correction: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  correctionText: { flex: 1 },
});
