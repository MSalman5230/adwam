import { describe, expect, it } from 'vitest';

import {
  dateToEpochDay,
  epochDayToDate,
  isoAdd,
  type CivilDate,
} from './civil';
import {
  hijriMonthStart,
  hijriOf,
  type HijriCorrection,
  type HijriMethod,
  type HijriSettings,
} from './hijri';

const settings: HijriSettings = { method: 'umalqura' };
const makePin = (month: number, start: CivilDate): HijriCorrection => ({
  year: 1448,
  month,
  start,
});

describe('Hijri calendars', () => {
  it.each<[HijriMethod, string]>([
    ['umalqura', 'islamic-umalqura'],
    ['civil', 'islamic-civil'],
  ])(
    'matches Node for every supported day using %s',
    (method, calendar) => {
      const formatter = new Intl.DateTimeFormat('en', {
        calendar,
        numberingSystem: 'latn',
        timeZone: 'UTC',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      });
      const first = dateToEpochDay(hijriMonthStart(1400, 1, { method }));
      const end = dateToEpochDay(hijriMonthStart(1501, 1, { method }));
      expect(end - first).toBeGreaterThan(35_000);
      for (let day = first; day < end; day++) {
        const iso = epochDayToDate(day);
        const expected = Object.fromEntries(
          formatter
            .formatToParts(new Date(iso + 'T12:00:00Z'))
            .map(({ type, value }) => [type, Number(value)]),
        );
        const actual = hijriOf(iso, { method });
        if (
          actual.year !== expected.year ||
          actual.month !== expected.month ||
          actual.day !== expected.day
        ) {
          throw new Error(
            `${iso}: expected ${expected.year}-${expected.month}-${expected.day}, got ${actual.year}-${actual.month}-${actual.day}`,
          );
        }
      }
    },
    30_000,
  );

  it('shifts the Gregorian input and continues through the Umm al-Qura table boundaries', () => {
    expect(hijriOf('2027-02-07', { method: 'umalqura', shift: 1 })).toEqual(
      hijriOf('2027-02-08', settings),
    );
    for (const year of [1400, 1501]) {
      const start = hijriMonthStart(year, 1, settings);
      const prior = hijriOf(isoAdd(start, -1), settings);
      expect(prior).toMatchObject({ year: year - 1, month: 12 });
      expect([29, 30]).toContain(prior.monthLength);
      expect(prior.day).toBe(prior.monthLength);
      expect(hijriOf(start, settings)).toMatchObject({
        year,
        month: 1,
        day: 1,
      });
    }
  });
});

describe('accepted corrections', () => {
  it.each([-1, 1])('pins a month moved by %s day', (difference) => {
    const start = isoAdd('2027-02-08', difference);
    const corrected = { ...settings, corrections: [makePin(9, start)] };
    expect(hijriOf(start, corrected)).toMatchObject({
      year: 1448,
      month: 9,
      day: 1,
    });
    const previous = hijriOf(isoAdd(start, -1), corrected);
    expect(previous.month).toBe(8);
    expect(previous.day).toBe(previous.monthLength);
    expect([29, 30]).toContain(previous.monthLength);
  });

  it('adjusts a neighboring month that would have become 31 days', () => {
    const original = hijriMonthStart(1448, 8, settings);
    const corrected = { ...settings, corrections: [makePin(9, '2027-02-09')] };
    expect(hijriMonthStart(1448, 8, corrected)).toBe(isoAdd(original, 1));
    expect(hijriOf('2027-02-08', corrected)).toMatchObject({
      month: 8,
      day: 30,
    });
  });

  it('preserves two adjacent pins and restores a withdrawn correction', () => {
    const ramadan = makePin(9, '2027-02-07');
    const shawwal = makePin(10, '2027-03-09');
    const corrected = { ...settings, corrections: [shawwal, ramadan] };
    expect(hijriOf('2027-03-08', corrected)).toMatchObject({
      month: 9,
      day: 30,
      monthLength: 30,
    });
    expect(hijriOf('2027-03-09', corrected)).toMatchObject({
      month: 10,
      day: 1,
    });
    expect(
      hijriOf('2027-02-07', {
        ...settings,
        corrections: [{ ...ramadan, withdrawn: true }, shawwal],
      }),
    ).toEqual(hijriOf('2027-02-07', settings));
  });

  it('rejects pins that cannot leave a valid month between them', () => {
    const corrections = [makePin(9, '2027-02-08'), makePin(10, '2027-03-01')];
    expect(() => hijriOf('2027-02-08', { ...settings, corrections })).toThrow(
      RangeError,
    );
  });
});
