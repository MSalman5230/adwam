import { describe, expect, it } from 'vitest';

import { checkedContent } from '../../content/scripts/check.ts';
import { isoAdd, localToMs, MINUTE_MS } from '../src/civil';
import { day, type DaySettings } from '../src/day';
import { hijriMonthStart } from '../src/hijri';
import { fastingAllowed, occurrencesForDay, type OccurrenceEvent } from '../src/occurrences';

const settings: DaySettings = {
  place: { latitude: 51.5074, longitude: -0.1278, timeZone: 'Europe/London', countryCode: 'GB' },
  prayer: { method: 'mwl', asr: 'standard', jumuah: { mode: 'fixed', minutes: 810 } },
  hijri: { method: 'umalqura' },
};
const { sunnahs } = await checkedContent();

describe('occurrences from the review catalog', () => {
  it('resolves Thursday after Maghrib and the same Friday push time', () => {
    const thursday = '2026-12-17';
    const friday = isoAdd(thursday, 1);
    const kahf = occurrencesForDay(thursday, settings, sunnahs).find(({ entry }) => entry.id === 'kahf');
    const prep = occurrencesForDay(friday, settings, sunnahs).find(({ entry }) => entry.id === 'friday-prep');
    expect(kahf).toMatchObject({
      tickKey: 'kahf:2026-12-17',
      start: day(thursday, settings).times.maghrib,
      end: day(friday, settings).times.maghrib,
      rules: ['combine-into-friday-push'],
    });
    expect(kahf?.push?.at).toBe(day(friday, settings).times.jumuah - 120 * MINUTE_MS);
    expect(prep?.push?.at).toBe(kahf?.push?.at);
  });

  it('ends the last Ramadan zakat window at the following Eid prayer and keeps its annual tick', () => {
    const eid = hijriMonthStart(1448, 10, settings.hijri);
    const eve = isoAdd(eid, -1);
    const zakat = occurrencesForDay(eve, settings, sunnahs).find(({ entry }) => entry.id === 'zakat');
    expect(zakat?.tickKey).toBe('zakat:1448');
    expect(zakat?.end).toBe(day(eid, settings).times.sunrise + 45 * MINUTE_MS);
    expect(occurrencesForDay(eid, settings, sunnahs).some(({ definition }) => definition.check === 'fast')).toBe(false);
  });

  it('shows one fast and borrows a scheduled push from a lower-priority fast', () => {
    const march = '2027-03-29';
    const occurrences = occurrencesForDay(march, settings, sunnahs, { makeup: 3 });
    const fasts = occurrences.filter(({ definition }) => definition.check === 'fast');
    expect(fasts).toHaveLength(1);
    expect(fasts[0]).toMatchObject({
      entry: { id: 'shawwal6' },
      tickKey: march,
      also: ['a Monday fast'],
      push: { item: 'monthu', at: day(isoAdd(march, -1), settings).times.isha + 15 * MINUTE_MS },
    });
    const loggedDays = Object.fromEntries(Array.from({ length: 6 }, (_, index) => [isoAdd(march, -index - 1), true]));
    const afterSix = occurrencesForDay(march, settings, sunnahs, { fastLog: loggedDays });
    expect(afterSix.find(({ definition }) => definition.check === 'fast')?.entry.id).toBe('monthu');
    expect(afterSix.some(({ entry }) => entry.id === 'makeup')).toBe(false);
  });

  it('uses event boundaries and stable keys across weather and eclipse forecasts', () => {
    const date = '2027-02-27';
    const start = localToMs(date, 720, settings.place.timeZone);
    const end = start + 90 * MINUTE_MS;
    const events: OccurrenceEvent[] = [
      { weather: 'rain-start', id: 'west-london-rain', start, end },
      { eclipse: 'lunar', id: 'lunar-february', start, end },
    ];
    const occurrences = occurrencesForDay(date, settings, sunnahs, { events });
    expect(occurrences.find(({ entry }) => entry.id === 'rain')).toMatchObject({
      key: 'rain:2027-02-27:west-london-rain',
      tickKey: 'rain:2027-02-27',
      start, end, push: { at: start },
    });
    expect(occurrences.find(({ event }) => event && 'eclipse' in event)).toMatchObject({ start, end });
    expect(occurrencesForDay(isoAdd(date, 1), settings, sunnahs, { events }).some(({ event }) => event)).toBe(false);
  });
});

it('applies Ramadan, Eid, Tashriq, Friday and late Shaban safeguards', () => {
  const date = { year: 1448, month: 8, day: 28, monthLength: 29 };
  expect(fastingAllowed(date, 3, 'specific')).toBe(false);
  expect(fastingAllowed(date, 4, 'habit')).toBe(true);
  expect(fastingAllowed(date, 5, 'makeup')).toBe(true);
  expect(fastingAllowed({ ...date, day: 15 }, 5)).toBe(false);
  expect(fastingAllowed({ ...date, day: 15 }, 5, 'specific')).toBe(true);
  for (const [month, day] of [[9, 1], [10, 1], [12, 10], [12, 11], [12, 12], [12, 13]] as const) {
    expect(fastingAllowed({ ...date, month, day }, 4, 'habit')).toBe(false);
  }
});
