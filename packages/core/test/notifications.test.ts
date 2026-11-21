import type { GroupedSunnah } from '@adwam/content/schema';
import { expect, it } from 'vitest';

import { checkedContent } from '../../content/scripts/check.ts';
import { civil, isoAdd, localToMs, MINUTE_MS } from '../src/civil';
import { day } from '../src/day';
import { hijriMonthStart } from '../src/hijri';
import { laterFor, planNotifications, type NotificationState } from '../src/notifications';

const { sunnahs } = await checkedContent();
const timeZone = 'Europe/London';
const state: NotificationState = {
  calendar: {
    place: { latitude: 51.5074, longitude: -0.1278, timeZone, countryCode: 'GB' },
    prayer: { method: 'mwl', asr: 'standard', jumuah: { mode: 'fixed', minutes: 810 } },
    hijri: { method: 'umalqura' },
  },
  catalog: sunnahs,
  preferences: { notifications: 'granted', quietHours: { start: 1320, end: 420 } },
};

it('plans the calendar portion of a week in the app', () => {
  const now = localToMs('2026-12-13', 720, timeZone);
  const until = localToMs('2026-12-20', 0, timeZone);
  const week = planNotifications(now, state).filter(({ at }) => at < until);
  expect(week.map(({ id, title, buttons }) => [id, title, buttons])).toEqual([
    ['2026-12-14|main', 'Tomorrow is Monday, a Sunnah fast', ['later']],
    ['2026-12-17|main', 'Tomorrow is Thursday, a Sunnah fast', ['later']],
    ['friday-prep:2026-12-18|main', 'Friday · al-Kahf and preparation', ['later']],
    ['last-hour:2026-12-18|main', 'Last hour of Friday', ['done', 'later']],
  ]);
  expect(week[2]?.link).toBe('/today');
  expect(week[3]?.doneKey).toBe('last-hour:2026-12-18');
  expect(week[0]?.at).toBe(day('2026-12-13', state.calendar).times.isha + 15 * MINUTE_MS);
  expect(week[2]?.at).toBe(localToMs('2026-12-18', 690, timeZone));
});

it('uses standalone Friday wording after a tick and falls back to al-Kahf on its own', () => {
  const now = localToMs('2026-12-18', 510, timeZone);
  const id = 'friday-prep:2026-12-18|main';
  const combined = planNotifications(now, state).find((push) => push.id === id)!;
  const ticked: NotificationState = { ...state, tracking: { done: { 'kahf:2026-12-17': true, 'last-hour:2026-12-18': true } } };
  const plans = planNotifications(now, ticked);
  const single = plans.find((push) => push.id === id)!;
  expect(single).toMatchObject({ title: 'Friday preparation', at: combined.at, buttons: ['done', 'later'] });
  expect(single.hash).not.toBe(combined.hash);
  expect(plans.some((push) => push.id === 'last-hour:2026-12-18|main')).toBe(false);

  const fallback = { ...state, preferences: { ...state.preferences, choice: { 'friday-prep': 'inapp' } } } as const;
  const kahf = planNotifications(now, fallback).find((push) => push.id === 'kahf:2026-12-17|main')!;
  expect(kahf.at).toBe(combined.at);
  expect(kahf.link).toContain('/item/kahf?date=2026-12-17');
  expect(kahf.buttons).toEqual(['done', 'later']);
});

it('advances a London summer fasting reminder to just before quiet hours', () => {
  const date = '2027-06-20';
  const now = localToMs(date, 720, timeZone);
  expect(civil(day(date, state.calendar).times.isha, timeZone).min).toBeGreaterThan(1320);
  const fast = planNotifications(now, state).find(({ id }) => id === '2027-06-21|main');
  expect(fast?.at).toBe(localToMs(date, 1319, timeZone));
});

it('delays an Oslo Eid reminder from before 3 am until 7 am', () => {
  const timeZone = 'Europe/Oslo';
  const calendar = { ...state.calendar, place: { latitude: 59.9139, longitude: 10.7522, timeZone, countryCode: 'NO' } };
  const eid = isoAdd(hijriMonthStart(1448, 12, calendar.hijri), 9);
  const now = localToMs(eid, 0, timeZone);
  const beforeQuietEnds = day(eid, calendar).times.fajr + 20 * MINUTE_MS;
  expect(civil(beforeQuietEnds, timeZone).min).toBeLessThan(180);
  const push = planNotifications(now, { ...state, calendar }).find(({ id }) => id === `eid-adha:${eid}|main`);
  expect(push?.at).toBe(localToMs(eid, 420, timeZone));
});

it('honors pauses and does not schedule forecast pushes locally', () => {
  const now = localToMs('2026-12-13', 720, timeZone);
  const events = [{ id: 'rain', weather: 'rain-start', start: now + MINUTE_MS, end: now + 120 * MINUTE_MS, pushAt: now + MINUTE_MS }] as const;
  const pause = { until: '2026-12-17' } as const;
  const plan = planNotifications(now, { ...state, events, preferences: { ...state.preferences, pause } });
  expect(plan.some(({ id }) => id === '2026-12-14|main' || id === '2026-12-17|main' || id.startsWith('rain:'))).toBe(false);
  expect(plan.some(({ id }) => id === '2026-12-21|main')).toBe(true);
});

it('quiet hours drop local eclipses unless allowed', () => {
  const now = localToMs('2026-08-27', 720, timeZone);
  const eclipse = 'eclipse:2026-08-28|main';
  expect(planNotifications(now, state).some(({ id }) => id === eclipse)).toBe(false);
  const enabled = planNotifications(now, { ...state, preferences: { ...state.preferences, eclipseQuiet: true } });
  expect(enabled.find(({ id }) => id === eclipse)?.channel).toBe('weather');
});

it('snoozes once for an hour while the window is still open', () => {
  const id = 'friday-prep:2026-12-18|main';
  const afterPush = localToMs('2026-12-18', 695, timeZone);
  const later = laterFor(id, afterPush, state);
  expect(later).toMatchObject({ id: `${id}|later`, at: afterPush + 60 * MINUTE_MS, link: '/today', buttons: [] });
  expect(laterFor(`${id}|later`, afterPush + 60 * MINUTE_MS, state)).toBeUndefined();
  expect(laterFor(id, localToMs('2026-12-18', 751, timeZone), state)).toBeUndefined();
});

it('keeps the earliest 150 or 60 notifications within the horizon', () => {
  const date = '2026-12-01';
  const now = localToMs(date, 0, timeZone);
  const template = sunnahs.find(({ id }) => id === 'friday-prep')!;
  const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
  const catalog: GroupedSunnah[] = Array.from({ length: 4 }, (_, index) => ({
    ...template,
    id: `daily-${index}`,
    occurrences: [{ on: { weekday: [...weekdays] }, window: 'daytime', push: { at: { prayer: 'dhuhr', plus: `${index}m` }, title: 'Reminder', body: 'Today' } }],
  }));
  const android = planNotifications(now, { ...state, catalog });
  const ios = planNotifications(now, { ...state, catalog, platform: 'ios' });
  expect(android).toHaveLength(150);
  expect(ios).toEqual(android.slice(0, 60));
  expect(android.map(({ at }) => at)).toEqual(android.map(({ at }) => at).sort((a, b) => a - b));
  expect(android.every(({ at }) => now < at && at < localToMs(isoAdd(date, 60), 0, timeZone))).toBe(true);
});
