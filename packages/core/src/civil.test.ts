import { describe, expect, it } from 'vitest';

import {
  civil,
  dayDiff,
  isoAdd,
  localToMs,
  tzOffset,
  wdOf,
  type CivilDate,
} from './civil';

describe('civil dates', () => {
  it('adds calendar days and finds weekdays without using the host time zone', () => {
    expect(isoAdd('2024-02-28', 1)).toBe('2024-02-29');
    expect(isoAdd('2024-02-29', 1)).toBe('2024-03-01');
    expect(wdOf('2026-12-18')).toBe(5);
    expect(dayDiff('2026-03-30', '2026-03-28')).toBe(2);
    expect(isoAdd('0004-02-28', 1)).toBe('0004-02-29');
  });

  it('rejects invalid calendar dates', () => {
    expect(() => isoAdd('2026-02-30', 1)).toThrow(RangeError);
  });
});

describe('time zones', () => {
  it.each<[string, CivilDate, number, string, number]>([
    ['Europe/London', '2026-03-29', 90, '2026-03-29T01:30:00Z', 150],
    ['Europe/London', '2026-10-25', 90, '2026-10-25T00:30:00Z', 90],
    ['America/Toronto', '2026-03-08', 150, '2026-03-08T07:30:00Z', 210],
    ['America/Toronto', '2026-11-01', 90, '2026-11-01T05:30:00Z', 90],
    ['Australia/Sydney', '2026-10-04', 150, '2026-10-03T16:30:00Z', 210],
    ['Australia/Lord_Howe', '2026-10-04', 135, '2026-10-03T15:45:00Z', 165],
    ['Asia/Kolkata', '2027-01-01', 10, '2026-12-31T18:40:00Z', 10],
  ])(
    'resolves %s %s at minute %s',
    (zone, iso, minutes, expected, actualMinute) => {
      const instant = localToMs(iso, minutes, zone);
      expect(instant).toBe(Date.parse(expected));
      expect(civil(instant, zone)).toEqual({ iso, min: actualMinute });
    },
  );

  it('moves forward across a skipped calendar day', () => {
    const instant = localToMs('2011-12-30', 720, 'Pacific/Apia');
    expect(civil(instant, 'Pacific/Apia')).toEqual({
      iso: '2011-12-31',
      min: 720,
    });
  });

  it('returns the offset in minutes and preserves the local date at midnight', () => {
    const instant = Date.parse('2026-12-31T18:30:00.123Z');
    expect(tzOffset(instant, 'Asia/Kolkata')).toBe(330);
    expect(civil(instant, 'Asia/Kolkata')).toEqual({
      iso: '2027-01-01',
      min: 0,
    });
  });
});
