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
export { dailyAnchors, prayerTimes } from './prayer';
export type { Jumuah, PrayerAnchor, PrayerSettings, PrayerTimes } from './prayer';
export { day, effectiveHijri } from './day';
export type { Day, DaySettings } from './day';
export { countMonthFasts, fastingAllowed, occurrencesForDay } from './occurrences';
export type {
  Occurrence,
  OccurrenceEvent,
  OccurrenceOptions,
  OccurrencePush,
  ReminderLevel,
} from './occurrences';
export { chosenLevel, isDone, level, paused, pushAllowed, reminderOccurrences, visible } from './rules';
export type { FastingPause, ReminderPreferences, ReminderState, ReminderTracking } from './rules';
export { applyPreset, presetOf, pushEstimate } from './presets';
export type { Preset, PushEstimate } from './presets';
export { decidePushes, defaultWeatherThresholds, detectEvents } from './weather';
export type {
  WeatherEvent,
  WeatherForecast,
  WeatherInstall,
  WeatherPush,
  WeatherThresholds,
} from './weather';
