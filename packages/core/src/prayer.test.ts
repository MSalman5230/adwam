import { describe, expect, it } from 'vitest';

import { civil, isoAdd, localToMs } from './civil';
import { day, effectiveHijri, type DaySettings } from './day';
import type { Place } from './places';
import { dailyAnchors, prayerTimes } from './prayer';

const london: Place = {
  latitude: 51.5074,
  longitude: -0.1278,
  timeZone: 'Europe/London',
  countryCode: 'GB',
};
const settings: DaySettings = {
  place: london,
  prayer: { method: 'mwl', asr: 'standard' },
  hijri: { method: 'umalqura' },
};

describe('prayer times', () => {
  it('sets a fixed Jumuah in the place time zone and supports Hanafi Asr', () => {
    const iso = '2026-07-03';
    const standard = prayerTimes(iso, london, settings.prayer);
    const hanafi = prayerTimes(iso, london, {
      ...settings.prayer,
      asr: 'hanafi',
      jumuah: { mode: 'fixed', minutes: 810 },
    });
    expect(standard.jumuah).toBe(standard.dhuhr);
    expect(hanafi.jumuah).toBe(localToMs(iso, 810, london.timeZone));
    expect(hanafi.asr).toBeGreaterThan(standard.asr);
  });

  it.each<Place>([
    {
      latitude: 59.9139,
      longitude: 10.7522,
      timeZone: 'Europe/Oslo',
      countryCode: 'NO',
    },
    {
      latitude: 69.6492,
      longitude: 18.9553,
      timeZone: 'Europe/Oslo',
      countryCode: 'NO',
    },
    {
      latitude: -13.8333,
      longitude: -171.7667,
      timeZone: 'Pacific/Apia',
      countryCode: 'WS',
    },
  ])(
    'returns ordered minute-rounded times in $timeZone at $latitude',
    (place) => {
      const iso = '2026-06-21';
      const result = prayerTimes(iso, place, settings.prayer);
      const instants = dailyAnchors.map((anchor) => result[anchor]);
      expect(instants.every((instant) => instant % 60_000 === 0)).toBe(true);
      expect(instants).toEqual([...new Set(instants)].sort((a, b) => a - b));
      expect(civil(result.dhuhr, place.timeZone).iso).toBe(iso);
    },
  );
});

describe('day', () => {
  it('reuses a day and moves to the next Hijri date at Maghrib', () => {
    const iso = '2026-12-18';
    const date = day(iso, settings);
    expect(day(iso, settings)).toBe(date);
    expect(effectiveHijri(date.times.maghrib - 1, settings)).toEqual({
      ...date.hijri,
      sinceMaghrib: false,
    });
    expect(effectiveHijri(date.times.maghrib, settings)).toEqual({
      ...day(isoAdd(iso, 1), settings).hijri,
      sinceMaghrib: true,
    });
  });
});
