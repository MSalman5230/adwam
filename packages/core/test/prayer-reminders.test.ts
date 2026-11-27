import { sunnahSchema } from '@adwam/content/schema';
import { expect, it } from 'vitest';

import { checkedContent } from '../../content/scripts/check.ts';
import { civil, isoAdd, localToMs, MINUTE_MS } from '../src/civil';
import { day } from '../src/day';
import { laterFor, planNotifications, type NotificationState } from '../src/notifications';
import { prayerReminder, reminderPrayers, type PrayerReminderCopy } from '../src/prayer-reminders';
import { applyPreset, presetOf, pushEstimate } from '../src/presets';
import { level, reminderOccurrences } from '../src/rules';
import { todayState, upcomingRows } from '../src/views';

const { sunnahs } = await checkedContent();
const names = { fajr: 'Fajr', dhuhr: 'Ẓuhr', asr: 'ʿAṣr', maghrib: 'Maghrib', isha: 'ʿIshāʾ' } as const;
const copy: PrayerReminderCopy = {
  title: 'Prayer times',
  short: 'Mark it done once you have prayed.',
  what: ['A reminder as each prayer begins.'],
  when: 'Every day, from each prayer time.',
  pushNote: 'A push as each prayer begins.',
  prayers: Object.fromEntries(reminderPrayers.map((prayer) => [prayer, {
    title: names[prayer], pushTitle: `Time for ${names[prayer]}`, pushBody: 'Mark it done once you have prayed.',
  }])) as PrayerReminderCopy['prayers'],
};
const prayers = prayerReminder(copy);
const timeZone = 'Europe/London';
const calendar = {
  place: { latitude: 51.5074, longitude: -0.1278, timeZone, countryCode: 'GB' },
  prayer: { method: 'mwl', asr: 'standard', jumuah: { mode: 'dhuhr' } },
  hijri: { method: 'umalqura' },
} as const;
const pushing: NotificationState = {
  calendar,
  catalog: [...sunnahs, prayers],
  preferences: { notifications: 'granted', quietHours: { start: 1320, end: 420 }, choice: { prayers: 'push' } },
};
const date = '2026-12-14';
const times = day(date, calendar).times;
const prayerPushes = (plan: ReturnType<typeof planNotifications>) => plan.filter(({ channel }) => channel === 'daily');

it('describes each prayer with content the schema accepts', () => {
  expect(prayers).toMatchObject({ id: 'prayers', group: 'daily', tier: 'push', default: 'off', evidence: [], duas: [] });
  const { group, ...entry } = prayers;
  expect(group).toBe('daily');
  // Built-in entries skip content review, so check the shape as a draft would be checked.
  expect(sunnahSchema.safeParse({ ...entry, status: 'draft' }).error).toBeUndefined();
  expect(prayers.occurrences.map(({ key }) => key)).toEqual(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);
});

it('keeps each prayer open until the next prayer time, or sunrise for Fajr', () => {
  const found = reminderOccurrences(date, pushing).filter(({ entry }) => entry.id === 'prayers');
  const tomorrow = day(isoAdd(date, 1), calendar).times;
  expect(found.map(({ key, tickKey, start, end }) => [key, tickKey, start, end])).toEqual([
    ['prayers.fajr:2026-12-14', 'prayers.fajr:2026-12-14', times.fajr, times.sunrise],
    ['prayers.dhuhr:2026-12-14', 'prayers.dhuhr:2026-12-14', times.dhuhr, times.asr],
    ['prayers.asr:2026-12-14', 'prayers.asr:2026-12-14', times.asr, times.maghrib],
    ['prayers.maghrib:2026-12-14', 'prayers.maghrib:2026-12-14', times.maghrib, times.isha],
    ['prayers.isha:2026-12-14', 'prayers.isha:2026-12-14', times.isha, tomorrow.fajr],
  ]);
});

it('shows the current prayer on Today with a Done tick, and never in Coming up or Upcoming', () => {
  const now = times.asr + 10 * MINUTE_MS;
  const inapp = { ...pushing, preferences: { ...pushing.preferences, choice: { prayers: 'inapp' } } } as const;
  const active = todayState(now, inapp).active.find(({ occurrence }) => occurrence.entry.id === 'prayers');
  expect(active?.occurrence.title).toBe('ʿAṣr');
  expect(active?.tick).toMatchObject({ type: 'done', key: 'prayers.asr:2026-12-14', done: false });
  expect(active?.meta).toEqual({ key: 'timing.active.untilPrayer', params: { prayer: { key: 'calendar.prayer.maghrib' } } });
  expect(active?.bell).toBe(false);

  const ticked = { ...inapp, tracking: { done: { 'prayers.asr:2026-12-14': true } } };
  expect(todayState(now, ticked).active.find(({ occurrence }) => occurrence.entry.id === 'prayers')?.done).toBe(true);
  expect(todayState(now, inapp).coming.some(({ occurrence }) => occurrence.entry.id === 'prayers')).toBe(false);
  expect(upcomingRows(now, inapp).rows.some((row) => row.kind === 'item' && row.occurrence.entry.id === 'prayers')).toBe(false);

  const isha = todayState(localToMs(isoAdd(date, 1), 60, timeZone), inapp).active
    .find(({ occurrence }) => occurrence.entry.id === 'prayers');
  expect(isha?.tick?.key).toBe('prayers.isha:2026-12-14');
});

it('stays off until the user chooses a level', () => {
  const off = { ...pushing, preferences: { ...pushing.preferences, choice: {} } };
  expect(level(off, 'prayers', 1448)).toBe('off');
  expect(todayState(times.asr + MINUTE_MS, off).active.some(({ occurrence }) => occurrence.entry.id === 'prayers')).toBe(false);
  expect(prayerPushes(planNotifications(times.fajr - MINUTE_MS, off))).toEqual([]);
});

it('pushes as each prayer begins, with Done and Later, on its own channel', () => {
  const now = localToMs(date, 0, timeZone);
  const first = prayerPushes(planNotifications(now, pushing)).slice(0, 5);
  expect(first.map(({ id, at, title }) => [id, at, title])).toEqual([
    ['prayers.fajr:2026-12-14|main', times.fajr, 'Time for Fajr'],
    ['prayers.dhuhr:2026-12-14|main', times.dhuhr, 'Time for Ẓuhr'],
    ['prayers.asr:2026-12-14|main', times.asr, 'Time for ʿAṣr'],
    ['prayers.maghrib:2026-12-14|main', times.maghrib, 'Time for Maghrib'],
    ['prayers.isha:2026-12-14|main', times.isha, 'Time for ʿIshāʾ'],
  ]);
  expect(first[0]).toMatchObject({
    buttons: ['done', 'later'], doneKey: 'prayers.fajr:2026-12-14',
    link: '/item/prayers?date=2026-12-14&occurrenceKey=prayers.fajr%3A2026-12-14',
  });

  const ticked = { ...pushing, tracking: { done: { 'prayers.fajr:2026-12-14': true } } };
  expect(prayerPushes(planNotifications(now, ticked))[0]?.id).toBe('prayers.dhuhr:2026-12-14|main');
  const silenced = { ...pushing, preferences: { ...pushing.preferences, channels: { daily: false } } };
  expect(prayerPushes(planNotifications(now, silenced))).toEqual([]);
});

it('plans two weeks of prayers on Android without crowding out other reminders', () => {
  const now = localToMs(date, 0, timeZone);
  const plan = planNotifications(now, pushing);
  const others = planNotifications(now, { ...pushing, catalog: sunnahs });
  expect(prayerPushes(plan)).toHaveLength(70);
  expect(Math.max(...prayerPushes(plan).map(({ at }) => at))).toBeLessThan(localToMs(isoAdd(date, 14), 0, timeZone));
  expect(plan.filter(({ channel }) => channel !== 'daily')).toEqual(others);

  const ios = planNotifications(now, { ...pushing, platform: 'ios' });
  expect(prayerPushes(ios)).toHaveLength(15);
  expect(ios.length).toBeLessThanOrEqual(60);
});

it('moves every prayer push when the calculation method or ʿAṣr rule changes', () => {
  const now = localToMs(date, 0, timeZone);
  const before = prayerPushes(planNotifications(now, pushing));
  for (const prayer of [{ ...calendar.prayer, method: 'isna' }, { ...calendar.prayer, asr: 'hanafi' }] as const) {
    const changed = { ...pushing, calendar: { ...calendar, prayer } };
    const after = prayerPushes(planNotifications(now, changed));
    const moved = after.filter((push, index) => push.id === before[index]?.id && push.at !== before[index]?.at);
    expect(after.map(({ id }) => id)).toEqual(before.map(({ id }) => id));
    expect(moved.length).toBeGreaterThan(0);
    const newTimes = day(date, changed.calendar).times;
    expect(after.slice(0, 5).map(({ at }) => at)).toEqual(reminderPrayers.map((name) => newTimes[name]));
  }
});

it('notifies at Fajr during quiet hours unless the user holds prayer pushes too', () => {
  const summer = '2027-06-20';
  const summerTimes = day(summer, calendar).times;
  expect(civil(summerTimes.fajr, timeZone).min).toBeLessThan(420);
  const now = localToMs(isoAdd(summer, -1), 720, timeZone);
  const fajr = (state: NotificationState) => planNotifications(now, state).find(({ id }) => id === `prayers.fajr:${summer}|main`);
  expect(fajr(pushing)?.at).toBe(summerTimes.fajr);

  const held = { ...pushing, preferences: { ...pushing.preferences, prayerQuiet: false } };
  expect(civil(summerTimes.sunrise, timeZone).min).toBeLessThan(420);
  expect(fajr(held)).toBeUndefined();
  const shortQuiet = { ...held, preferences: { ...held.preferences, quietHours: { start: 0, end: 240 } } };
  expect(fajr(shortQuiet)?.at).toBe(localToMs(summer, 240, timeZone));
});

it('offers Later for a prayer only while its time lasts', () => {
  const id = `prayers.maghrib:${date}|main`;
  expect(laterFor(id, times.maghrib + MINUTE_MS, pushing)?.at).toBe(times.maghrib + 61 * MINUTE_MS);
  expect(laterFor(id, times.isha - 30 * MINUTE_MS, pushing)).toBeUndefined();
});

it('leaves the prayer reminder out of the presets and the weekly estimate', () => {
  const year = 1448;
  expect(presetOf(pushing)).toBe('recommended');
  expect(pushEstimate(pushing, year)).toMatchObject({ daily: 5, weekly: 4, none: false });
  const inapp = applyPreset(pushing, 'inapp');
  expect(inapp.choice?.prayers).toBe('push');
  expect(presetOf({ ...pushing, preferences: inapp })).toBe('inapp');
  expect(applyPreset({ ...pushing, preferences: { choice: {} } }, 'recommended').choice).toEqual({});
  const onlyPrayers = { ...pushing, preferences: { ...inapp, choice: { ...inapp.choice } } };
  expect(pushEstimate(onlyPrayers, year)).toMatchObject({ daily: 5, weekly: 0, none: false });
});
