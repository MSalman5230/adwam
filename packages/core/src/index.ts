export { suggestedPrayerMethod, weatherArea } from './places';
export type { City, Coordinates, Place, PrayerMethod, WeatherArea } from './places';

export type MessageParams = Readonly<Record<string, string | number | boolean>>;

export type Msg = Readonly<{
  key: string;
  params?: MessageParams;
}>;

export function msg(key: string, params?: MessageParams): Msg {
  return params ? { key, params } : { key };
}

export {
  DAY_MS,
  MINUTE_MS,
  civil,
  dateToEpochDay,
  dayDiff,
  epochDayToDate,
  isoAdd,
  isoParts,
  localToMs,
  tzOffset,
  tzParts,
  wdOf,
} from './civil';
export type { CivilDate, CivilTime, DateParts, ZonedParts } from './civil';
export { hijriMonthStart, hijriOf } from './hijri';
export type { HijriCorrection, HijriDate, HijriMethod, HijriSettings } from './hijri';
