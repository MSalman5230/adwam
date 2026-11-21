import { civil, isoAdd, wdOf, type CivilDate } from './civil';
import { hijriOf, type HijriDate, type HijriSettings } from './hijri';
import type { Place } from './places';
import { prayerTimes, type PrayerSettings, type PrayerTimes } from './prayer';

export type DaySettings = Readonly<{
  place: Place;
  prayer: PrayerSettings;
  hijri: HijriSettings;
}>;
export type Day = Readonly<{
  iso: CivilDate;
  weekday: number;
  hijri: HijriDate;
  times: PrayerTimes;
}>;

const cache = new Map<string, Day>();
const cacheLimit = 240;

export function day(iso: CivilDate, settings: DaySettings): Day {
  const { place, prayer, hijri } = settings;
  const key = JSON.stringify([
    iso,
    place.latitude,
    place.longitude,
    place.timeZone,
    prayer,
    hijri,
  ]);
  const saved = cache.get(key);
  if (saved) return saved;

  const result = {
    iso,
    weekday: wdOf(iso),
    hijri: hijriOf(iso, hijri),
    times: prayerTimes(iso, place, prayer),
  };
  if (cache.size === cacheLimit) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, result);
  return result;
}

export function effectiveHijri(
  now: number,
  settings: DaySettings,
): HijriDate & { sinceMaghrib: boolean } {
  const iso = civil(now, settings.place.timeZone).iso;
  const today = day(iso, settings);
  const sinceMaghrib = now >= today.times.maghrib;
  const date = sinceMaghrib ? day(isoAdd(iso, 1), settings).hijri : today.hijri;
  return { ...date, sinceMaghrib };
}
