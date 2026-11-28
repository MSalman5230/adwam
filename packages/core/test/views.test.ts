import { describe, expect, it } from 'vitest';

import { checkedContent } from '../../content/scripts/check.ts';
import { isoAdd, localToMs, MINUTE_MS } from '../src/civil';
import { day } from '../src/day';
import { hijriMonthStart } from '../src/hijri';
import type { ReminderState } from '../src/rules';
import { detailState, todayState, upcomingRows } from '../src/views';

const { sunnahs } = await checkedContent();
const timeZone = 'Europe/London';
const state: ReminderState = {
  calendar: {
    place: { latitude: 51.5074, longitude: -0.1278, timeZone, countryCode: 'GB' },
    prayer: { method: 'mwl', asr: 'standard', jumuah: { mode: 'fixed', minutes: 810 } },
    hijri: { method: 'umalqura' },
  },
  catalog: sunnahs,
  preferences: { notifications: 'granted' },
};

describe('Today', () => {
  it('shows Friday prayer marks, the active cards, rain and done cards last', () => {
    const date = '2026-12-18';
    const morning = todayState(localToMs(date, 690, timeZone), state);
    expect(morning.dayLine.marks.map(({ name }) => name)).toEqual(['fajr', 'jumuah', 'asr', 'maghrib', 'isha']);
    expect(morning.active.map(({ occurrence }) => occurrence.entry.id)).toEqual(['friday-prep', 'kahf']);
    const now = localToMs(date, 908, timeZone);
    const afternoon = todayState(now, {
      ...state,
      tracking: { done: { 'kahf:2026-12-17': true } },
      events: [{ id: 'rain-sample', weather: 'rain-start', start: now - 5 * MINUTE_MS, end: now + 60 * MINUTE_MS }],
    });
    expect(afternoon.active.map(({ occurrence }) => occurrence.entry.id)).toEqual(['last-hour', 'rain', 'kahf']);
    expect(afternoon.active.at(-1)?.done).toBe(true);
  });

  it('advances the title and gives the last ten nights precedence after Maghrib', () => {
    const date = '2027-02-27';
    const { maghrib } = day(date, state.calendar).times;
    const before = todayState(maghrib - MINUTE_MS, state);
    const after = todayState(maghrib, state);
    expect(before.banner?.item).toBe('ramadan-daily');
    expect(after.hijri.day).toBe(before.hijri.day + 1);
    expect(after.sinceMaghribLabel?.key).toBe('today.sinceMaghrib');
    expect(after.banner?.item).toBe('last-ten');
    expect(after.active.some(({ occurrence }) => occurrence.definition.key === 'night')).toBe(true);
  });

  it('shows empty-state data and the next three reminders on a quiet Tuesday', () => {
    const view = todayState(localToMs('2026-12-01', 602, timeZone), state);
    expect(view.active).toHaveLength(0);
    expect(view.coming).toHaveLength(3);
    expect(view.empty?.body).toMatchObject({ key: 'timing.next.reminder', params: { title: 'Thursday fast' } });
  });

  it('selects notice actions for the date correction, sacrifice year, pause and usage', () => {
    const date = isoAdd(hijriMonthStart(1448, 11, state.calendar.hijri), 15);
    const now = localToMs(date, 602, timeZone);
    const preferences = { notifications: 'denied', pause: { until: date } } as const;
    const correction = { id: 'gb-ramadan-1448', region: 'the United Kingdom', countryCode: 'GB', year: 1448, month: 9, start: '2027-02-07' } as const;
    const view = todayState(now, { ...state, preferences }, { correction, usagePrompt: true });
    expect(view.notices.map(({ id }) => id)).toEqual(['notifications', 'correction', 'usage', 'udhiyah', 'pause']);
    expect(view.notices.find(({ id }) => id === 'correction')?.actions[0]?.label.params).toEqual({ announced: correction.start });
    expect(todayState(now, state, { correction, correctionChoices: { [correction.id]: 'declined' } }).notices.map(({ id }) => id)).toEqual(['udhiyah']);
  });
});

describe('Upcoming and detail', () => {
  it('shows month starts, ranges and no-fasting tags while keeping forecast weather out', () => {
    const now = localToMs('2027-02-20', 660, timeZone);
    const { rows, count } = upcomingRows(now, {
      ...state,
      events: [{ id: 'rain', weather: 'rain-start', start: now, end: now + 60 * MINUTE_MS }],
    });
    const items = rows.filter((row) => row.kind === 'item');
    expect(rows.some(({ kind }) => kind === 'month')).toBe(true);
    expect(items.some(({ occurrence }) => occurrence.entry.id === 'rain')).toBe(false);
    expect(items.find(({ occurrence }) => occurrence.definition.key === 'night')?.until).toBeDefined();
    expect(items.find(({ occurrence }) => occurrence.entry.id === 'eid-fitr')?.tags).toEqual([{ key: 'upcoming.noFasting' }]);
    expect(count).toBe(items.length);
  });

  it('lists al-Sajdah and al-Insān on Thursday after ʿIshāʾ, with a bell only when set to Push', () => {
    const thursday = '2026-12-17';
    const now = localToMs('2026-12-16', 720, timeZone);
    const sajdah = (reminders: ReminderState) => upcomingRows(now, reminders).rows
      .flatMap((row) => row.kind === 'item' && row.occurrence.entry.id === 'sajdah' && row.date === thursday ? [row] : [])[0];
    const row = sajdah(state);
    expect(row).toMatchObject({ bell: false, title: 'Friday Fajr: al-Sajdah and al-Insān' });
    expect(row?.occurrence.definition.startAnchor).toBe('after-isha');
    const times = day(thursday, state.calendar).times;
    const friday = day(isoAdd(thursday, 1), state.calendar).times;
    expect([row?.occurrence.start, row?.occurrence.end]).toEqual([times.isha, friday.sunrise]);
    expect(sajdah({ ...state, preferences: { notifications: 'granted', choice: { sajdah: 'push' } } })?.bell).toBe(true);
    expect(upcomingRows(now, state, 'push').rows.some((item) => item.kind === 'item' && item.occurrence.entry.id === 'sajdah')).toBe(false);

    const active = (at: number) => todayState(at, state).active.some(({ occurrence }) => occurrence.entry.id === 'sajdah');
    expect([active(times.isha - MINUTE_MS), active(times.isha), active(friday.fajr), active(friday.sunrise)]).toEqual([false, true, true, false]);
  });

  it('shows paused fasts without bells and includes calculated eclipses in the push filter', () => {
    const now = localToMs('2026-08-01', 720, timeZone);
    const paused: ReminderState = { ...state, preferences: { notifications: 'granted', pause: {} } };
    const rows = upcomingRows(now, paused, 'fasts').rows;
    const firstFast = rows.find((row) => row.kind === 'item' && row.occurrence.definition.check === 'fast');
    expect(firstFast).toMatchObject({ bell: false, tags: [{ key: 'upcoming.paused' }] });
    const push = upcomingRows(now, paused, 'push').rows.filter((row) => row.kind === 'item');
    expect(push.some(({ occurrence }) => occurrence.definition.check === 'fast')).toBe(false);
    expect(push.some(({ occurrence }) => occurrence.event && 'eclipse' in occurrence.event)).toBe(true);
  });

  it('hides a fast tick before Fajr and keeps the make-up tracker available', () => {
    const date = '2027-03-29';
    const { fajr } = day(date, state.calendar).times;
    const withFasts: ReminderState = {
      ...state,
      tracking: { makeup: 3, fastLog: { '2027-03-15': true, '2027-03-18': true, '2027-03-22': true } },
    };
    const before = detailState(fajr - MINUTE_MS, withFasts, { item: 'shawwal6', date });
    const after = detailState(fajr + MINUTE_MS, withFasts, { item: 'shawwal6', date });
    expect(before?.tick).toBeUndefined();
    expect(after?.tick).toMatchObject({ key: date, type: 'fast', done: false });
    expect(after?.tracker).toMatchObject({ kind: 'shawwal', count: 3, total: 6 });
    expect(detailState(fajr, withFasts, { item: 'makeup' })?.tracker).toMatchObject({ kind: 'makeup', count: 3 });
    expect(detailState(fajr, { ...state, tracking: { makeup: 0 } }, { item: 'makeup' })?.tracker?.label.key).toBe('reminder.tracker.makeupComplete');
  });
});
