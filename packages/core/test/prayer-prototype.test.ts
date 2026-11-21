import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';

import { isoAdd, isoParts, MINUTE_MS, type CivilDate } from '../src/civil';
import type { Place, PrayerMethod } from '../src/places';
import { dailyAnchors, prayerTimes, type PrayerAnchor } from '../src/prayer';

type Prototype = {
  PT: {
    compute(
      year: number,
      month: number,
      day: number,
      latitude: number,
      longitude: number,
      method: unknown,
      asrFactor: number,
    ): Record<PrayerAnchor, number>;
  };
  METHODS: Record<string, unknown>;
};

const locations: Array<[string, Place, PrayerMethod]> = [
  [
    'London',
    {
      latitude: 51.5074,
      longitude: -0.1278,
      timeZone: 'Europe/London',
      countryCode: 'GB',
    },
    'mwl',
  ],
  [
    'Oslo',
    {
      latitude: 59.9139,
      longitude: 10.7522,
      timeZone: 'Europe/Oslo',
      countryCode: 'NO',
    },
    'mwl',
  ],
  [
    'Jakarta',
    {
      latitude: -6.2088,
      longitude: 106.8456,
      timeZone: 'Asia/Jakarta',
      countryCode: 'ID',
    },
    'mwl',
  ],
  [
    'Toronto',
    {
      latitude: 43.6532,
      longitude: -79.3832,
      timeZone: 'America/Toronto',
      countryCode: 'CA',
    },
    'isna',
  ],
  [
    'Cape Town',
    {
      latitude: -33.9249,
      longitude: 18.4241,
      timeZone: 'Africa/Johannesburg',
      countryCode: 'ZA',
    },
    'mwl',
  ],
];

it('matches a year of prototype prayer times in five cities within two minutes, with six Oslo exceptions', () => {
  const html = readFileSync(
    new URL('../../../docs/mobile-app-ui.html', import.meta.url),
    'utf8',
  );
  const start = html.indexOf('const MIN =');
  const end = html.indexOf('const SN =');
  if (start === -1 || end <= start)
    throw new Error('Could not locate prototype prayer code');
  const prototype = runInNewContext(
    html.slice(start, end) + '\n({ PT, METHODS });',
    {},
    { timeout: 1_000 },
  ) as Prototype;

  const differences: string[] = [];
  for (const [city, place, method] of locations) {
    for (
      let iso: CivilDate = '2026-01-01';
      iso < '2027-01-01';
      iso = isoAdd(iso, 1)
    ) {
      const { year, month, day } = isoParts(iso);
      const reference = prototype.PT.compute(
        year,
        month,
        day,
        place.latitude,
        place.longitude,
        prototype.METHODS[method],
        1,
      );
      const actual = prayerTimes(iso, place, { method, asr: 'standard' });
      for (const anchor of dailyAnchors) {
        const minutes = (actual[anchor] - reference[anchor]) / MINUTE_MS;
        if (Math.abs(minutes) > 2)
          differences.push(`${city} ${iso} ${anchor} ${minutes} min`);
      }
    }
  }

  expect(differences).toEqual([
    'Oslo 2026-01-15 asr 3 min',
    'Oslo 2026-01-18 asr 3 min',
    'Oslo 2026-01-22 asr 3 min',
    'Oslo 2026-01-28 asr 3 min',
    'Oslo 2026-01-29 asr 3 min',
    'Oslo 2026-02-10 asr 3 min',
  ]);
});
