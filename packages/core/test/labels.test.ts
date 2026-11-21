import { expect, it } from 'vitest';

import english from '../../content/messages/en.json';
import { checkedContent } from '../../content/scripts/check.ts';
import { localToMs, MINUTE_MS } from '../src/civil';
import { activeMeta, comingLabel, fmtClock, fmtDur, nextSentence, relDay } from '../src/labels';
import type { Msg } from '../src/message';
import { occurrencesForDay } from '../src/occurrences';

const timeZone = 'Europe/London';
const settings = {
  place: { latitude: 51.5074, longitude: -0.1278, timeZone, countryCode: 'GB' },
  prayer: { method: 'mwl', asr: 'standard', jumuah: { mode: 'fixed', minutes: 810 } },
  hijri: { method: 'umalqura' },
} as const;
const { sunnahs } = await checkedContent();

it('uses the selected time style in the place time zone across a DST transition', () => {
  const midnight = localToMs('2027-03-28', 0, timeZone);
  const afternoon = localToMs('2027-03-28', 810, timeZone);
  expect(fmtClock(midnight, timeZone, false)).toBe('12:00 am');
  expect(fmtClock(afternoon, timeZone, false)).toBe('1:30 pm');
  expect(fmtClock(afternoon, timeZone, true)).toBe('13:30');
  expect(fmtClock(afternoon, 'Asia/Jakarta', true)).toBe('19:30');
});

it('chooses the duration and relative-day forms', () => {
  const now = localToMs('2026-12-01', 602, timeZone);
  expect(fmtDur(0)).toEqual({ key: 'timing.duration.minutes', params: { minutes: 1 } });
  expect(fmtDur(75 * MINUTE_MS)).toEqual({ key: 'timing.duration.hoursMinutes', params: { hours: 1, minutes: 15 } });
  expect(fmtDur(320 * MINUTE_MS)).toEqual({ key: 'timing.duration.hours', params: { hours: 5 } });
  expect(relDay(localToMs('2026-12-01', 1100, timeZone), now, timeZone, { evening: true }).key).toBe('timing.relative.standalone.tonight');
  expect(relDay(localToMs('2026-12-06', 600, timeZone), now, timeZone).key).toBe('timing.relative.weekday');
});

it('uses the reminder time before a fast and the countdown before Jumuah', () => {
  const thursday = occurrencesForDay('2026-12-03', settings, sunnahs).find(({ definition }) => definition.check === 'fast')!;
  const tonight = localToMs('2026-12-02', 602, timeZone);
  const tomorrow = localToMs('2026-12-01', 602, timeZone);
  expect(comingLabel(thursday, tonight, timeZone, true)).toMatchObject({
    key: 'timing.coming.reminder', params: { when: { params: { day: { key: 'timing.relative.sentence.tonight' } } } },
  });
  expect(nextSentence(thursday, tomorrow, timeZone, true)).toMatchObject({
    key: 'timing.next.reminder', params: { when: { params: { day: { key: 'timing.relative.sentence.tomorrow' } } } },
  });
  const friday = occurrencesForDay('2026-12-04', settings, sunnahs).find(({ entry }) => entry.id === 'friday-prep')!;
  expect(activeMeta(friday, friday.end - 75 * MINUTE_MS, timeZone)).toMatchObject({
    key: 'timing.active.toJumuah', params: { duration: { params: { hours: 1, minutes: 15 } } },
  });
});

it('has English entries for every label emitted across a full calendar year', () => {
  const visit = (label: Msg) => {
    const found = label.key.split('.').reduce<unknown>((value, key) =>
      value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined, english);
    expect(typeof found, label.key).toBe('string');
    for (const param of Object.values(label.params ?? {})) if (typeof param === 'object') visit(param);
  };
  for (let now = Date.UTC(2027, 0, 1, 10); now < Date.UTC(2028, 0, 1); now += 86_400_000) {
    const iso = new Date(now).toISOString().slice(0, 10) as `${number}-${number}-${number}`;
    for (const occurrence of occurrencesForDay(iso, settings, sunnahs)) {
      visit(comingLabel(occurrence, now, timeZone, true));
      visit(activeMeta(occurrence, occurrence.start, timeZone));
      visit(nextSentence(occurrence, now, timeZone, true));
    }
  }
});
