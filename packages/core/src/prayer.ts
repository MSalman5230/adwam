import {
  CalculationMethod,
  Coordinates,
  HighLatitudeRule,
  Madhab,
  PolarCircleResolution,
  PrayerTimes as AdhanPrayerTimes,
} from 'adhan';

import {
  civil,
  dayDiff,
  isoAdd,
  isoParts,
  localToMs,
  MINUTE_MS,
  type CivilDate,
} from './civil';
import { assertCoordinates, type Place, type PrayerMethod } from './places';

const methods = {
  mwl: CalculationMethod.MuslimWorldLeague,
  isna: CalculationMethod.NorthAmerica,
  egypt: CalculationMethod.Egyptian,
  makkah: CalculationMethod.UmmAlQura,
  karachi: CalculationMethod.Karachi,
  turkey: CalculationMethod.Turkey,
  singapore: CalculationMethod.Singapore,
  dubai: CalculationMethod.Dubai,
  kuwait: CalculationMethod.Kuwait,
  qatar: CalculationMethod.Qatar,
  moonsighting: CalculationMethod.MoonsightingCommittee,
} satisfies Record<
  PrayerMethod,
  () => ReturnType<typeof CalculationMethod.Other>
>;

export function prayerMethodAngles(method: PrayerMethod) {
  const { fajrAngle, ishaAngle, ishaInterval } = methods[method]();
  return { fajr: fajrAngle, isha: ishaAngle, minutes: ishaInterval };
}

export type Jumuah = Readonly<
  { mode: 'dhuhr' } | { mode: 'fixed'; minutes: number }
>;
export type PrayerSettings = Readonly<{
  method: PrayerMethod;
  asr: 'standard' | 'hanafi';
  jumuah?: Jumuah;
}>;

export type PrayerAnchor =
  'fajr' | 'sunrise' | 'dhuhr' | 'jumuah' | 'asr' | 'maghrib' | 'isha';
export type PrayerTimes = Readonly<Record<PrayerAnchor, number>>;
export const dailyAnchors = [
  'fajr',
  'sunrise',
  'dhuhr',
  'asr',
  'maghrib',
  'isha',
] as const satisfies readonly PrayerAnchor[];

function adhanDate(iso: CivilDate): Date {
  const { year, month, day } = isoParts(iso);
  const value = new Date(0);
  value.setFullYear(year, month - 1, day);
  value.setHours(12, 0, 0, 0);
  return value;
}

export function prayerTimes(
  iso: CivilDate,
  place: Place,
  settings: PrayerSettings,
): PrayerTimes {
  assertCoordinates(place);
  const coordinates = new Coordinates(place.latitude, place.longitude);
  const parameters = methods[settings.method]();
  parameters.madhab = settings.asr === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  parameters.highLatitudeRule = HighLatitudeRule.TwilightAngle;
  parameters.polarCircleResolution = PolarCircleResolution.AqrabBalad;

  let calculated = new AdhanPrayerTimes(
    coordinates,
    adhanDate(iso),
    parameters,
  );
  const difference = dayDiff(
    iso,
    civil(calculated.dhuhr.getTime(), place.timeZone).iso,
  );
  if (difference) {
    calculated = new AdhanPrayerTimes(
      coordinates,
      adhanDate(isoAdd(iso, difference)),
      parameters,
    );
  }

  const value = (name: (typeof dailyAnchors)[number]) => {
    const instant = calculated[name].getTime();
    if (!Number.isFinite(instant))
      throw new RangeError(`Could not calculate ${name} on ${iso}`);
    return Math.round(instant / MINUTE_MS) * MINUTE_MS;
  };

  const dhuhr = value('dhuhr');
  let jumuah = dhuhr;
  if (settings.jumuah?.mode === 'fixed') {
    const minutes = settings.jumuah.minutes;
    if (!Number.isInteger(minutes) || minutes < 0 || minutes >= 24 * 60) {
      throw new RangeError('Jumuah time must be a valid wall-clock minute');
    }
    jumuah = localToMs(iso, minutes, place.timeZone);
  }

  return {
    fajr: value('fajr'),
    sunrise: value('sunrise'),
    dhuhr,
    jumuah,
    asr: value('asr'),
    maghrib: value('maghrib'),
    isha: value('isha'),
  };
}
