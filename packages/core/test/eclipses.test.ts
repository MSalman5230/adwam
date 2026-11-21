import { expect, it } from 'vitest';

import { DAY_MS, MINUTE_MS } from '../src/civil';
import { eclipsesBetween } from '../src/eclipses';

const london = { latitude: 51.5074, longitude: -0.1278 };
const toronto = { latitude: 43.6532, longitude: -79.3832 };
const jakarta = { latitude: -6.2088, longitude: 106.8456 };
const capeTown = { latitude: -33.9249, longitude: 18.4241 };

// Eclipse Predictions by Fred Espenak, NASA's GSFC. Solar contacts are local
// standard time for London (UTC). Lunar contacts are U1 and U4 in universal time.
// https://eclipse.gsfc.nasa.gov/SEcirc/SEcircEU/LondonGBR1+21.html
// https://eclipse.gsfc.nasa.gov/LEdecade/LEdecade2021.html
it.each([
  ['London solar 2026', london, 'solar', 'partial', '2026-08-12T17:17:00Z', '2026-08-12T19:06:00Z'],
  ['Toronto lunar 2026', toronto, 'lunar', 'partial', '2026-08-28T02:33:48Z', '2026-08-28T05:51:55Z'],
  ['London solar 2027', london, 'solar', 'partial', '2027-08-02T08:03:00Z', '2027-08-02T09:59:00Z'],
  ['Jakarta lunar 2028', jakarta, 'lunar', 'total', '2028-12-31T15:07:35Z', '2028-12-31T18:36:24Z'],
  ['Cape Town lunar 2029', capeTown, 'lunar', 'total', '2029-06-26T01:32:18Z', '2029-06-26T05:11:50Z'],
  ['London solar 2030', london, 'solar', 'partial', '2030-06-01T04:25:00Z', '2030-06-01T06:22:00Z'],
  ['Cape Town lunar 2030', capeTown, 'lunar', 'partial', '2030-06-15T17:21:03Z', '2030-06-15T19:45:25Z'],
] as const)('matches NASA contacts within two minutes for %s', (_label, place, eclipse, kind, begins, ends) => {
  const start = Date.parse(begins);
  const end = Date.parse(ends);
  const periods = eclipsesBetween(start - DAY_MS, end + DAY_MS, place);
  expect(periods).toHaveLength(1);
  const visible = periods[0]!;
  expect(visible).toMatchObject({ eclipse, kind });
  expect(Math.abs(visible.start - start)).toBeLessThanOrEqual(2 * MINUTE_MS);
  expect(Math.abs(visible.end - end)).toBeLessThanOrEqual(2 * MINUTE_MS);
});

it('clips the 2026 August lunar eclipse at London moonset and omits it in Jakarta', () => {
  const from = Date.UTC(2026, 7, 28);
  const to = from + DAY_MS;
  const visible = eclipsesBetween(from, to, london)[0]!;
  expect(visible.id).toBe('lunar:2026-08-28:0');
  // USNO Complete Sun and Moon Data: London moonset at 05:16 UTC.
  // https://aa.usno.navy.mil/api/rstt/oneday?date=2026-08-28&coords=51.5074,-0.1278&tz=0
  expect(Math.abs(visible.end - Date.parse('2026-08-28T05:16:00Z'))).toBeLessThan(MINUTE_MS);
  expect(eclipsesBetween(visible.start + MINUTE_MS, to, london)).toEqual([visible]);
  expect(eclipsesBetween(from, to, jakarta)).toEqual([]);
});

it('skips the penumbral lunar eclipses in 2027', () => {
  const events = eclipsesBetween(Date.UTC(2027, 0, 1), Date.UTC(2028, 0, 1), london);
  expect(events.map(({ eclipse }) => eclipse)).toEqual(['solar']);
});
