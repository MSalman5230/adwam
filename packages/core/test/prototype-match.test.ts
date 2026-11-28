import { expect, it } from 'vitest';

import english from '../../content/messages/en.json';
import { selectContent } from '../../content/scripts/build.ts';
import { checkedContent } from '../../content/scripts/check.ts';
import { calendarSettings, compareDay, places } from '../../../tools/prototype-match/compare.ts';
import { prototype } from '../../../tools/prototype-match/prototype.ts';
import { isoAdd, localToMs, type CivilDate } from '../src/civil';
import { day } from '../src/day';
import { hijriMonthStart } from '../src/hijri';
import type { NotificationState } from '../src/notifications';
import { prayerReminder, reminderPrayers, type PrayerReminderCopy } from '../src/prayer-reminders';
import { reminderOccurrences } from '../src/rules';
import { todayState } from '../src/views';

const { sunnahs } = selectContent(await checkedContent(), true);
const stateFor = (calendar: NotificationState['calendar']): NotificationState => ({
  calendar, catalog: sunnahs, tracking: { makeup: 3 },
  preferences: { notifications: 'granted', udhiyah: { 1447: 'yes', 1448: 'yes', 1449: 'yes', 1450: 'yes' } },
});

// The prototype builds in the prayer-time reminder, so core's side adds the app's built-in entry, at Push on both sides.
const copy = english.reminder.prayers;
const prayers = prayerReminder({
  title: copy.title, short: copy.short, what: [copy.what], when: copy.when, pushNote: copy.pushNote,
  prayers: Object.fromEntries(reminderPrayers.map((prayer) => {
    const title = english.calendar.prayer[prayer];
    return [prayer, { title, pushTitle: copy.pushTitle.replace('{{prayer}}', title), pushBody: copy.pushBody }];
  })) as PrayerReminderCopy['prayers'],
});
const prayerLevel = { choice: { prayers: 'push' } } as const;
const withPrayers = (state: NotificationState): NotificationState => ({
  ...state, catalog: [...state.catalog, prayers], preferences: { ...state.preferences, ...prayerLevel },
});

it('compares two Hijri years in London and samples the other four cities', () => {
  const settings = calendarSettings(places.london);
  const start = hijriMonthStart(1448, 1, settings.hijri);
  const end = hijriMonthStart(1450, 1, settings.hijri);
  const londonDates: CivilDate[] = [];
  for (let date = start; date < end; date = isoAdd(date, 1)) londonDates.push(date);
  const cases = [{ settings, dates: londonDates }];
  const dates = ['2026-12-18', '2027-02-12', '2027-02-27', '2027-03-09', '2027-05-14', '2027-05-16', '2027-05-17', '2027-06-25'] satisfies CivilDate[];
  for (const [place, method] of [[places.oslo, 'mwl'], [places.jakarta, 'mwl'], [places.toronto, 'isna'], [places.capeTown, 'mwl']] as const) {
    cases.push({ settings: calendarSettings(place, method), dates });
  }

  const differences = cases.flatMap(({ settings, dates }) => {
    const engine = prototype(settings, prayerLevel);
    const state = withPrayers(stateFor(settings));
    return dates.flatMap((date) => compareDay(date, engine, state)
      .map((difference) => ({ city: settings.place.timeZone, ...difference })));
  });
  const counts: Record<string, number> = {};
  for (const difference of differences) {
    const key = `${difference.surface}:${difference.explanation ?? 'unexplained'}`;
    counts[key] = (counts[key] ?? 0) + 1;
    if (!difference.explanation || process.env.ADWAM_PROTOTYPE_VERBOSE === '1') console.info(JSON.stringify(difference));
  }
  console.info(JSON.stringify(counts));
  expect(differences.filter(({ explanation }) => !explanation)).toEqual([]);
}, 60_000);

it('keeps prayer anchors ordered and fasting rules intact from 2026 through 2036', () => {
  const problems: string[] = [];
  for (const [name, place] of Object.entries(places)) {
    const method = name === 'toronto' ? 'isna' : name === 'jakarta' ? 'singapore' : 'mwl';
    const calendar = calendarSettings(place, method);
    const state = stateFor(calendar);
    for (let date: CivilDate = '2026-01-01'; date < '2037-01-01'; date = isoAdd(date, 1)) {
      const current = day(date, calendar);
      const { times, hijri: h, weekday } = current;
      const anchors = [times.fajr, times.sunrise, times.dhuhr, times.asr, times.maghrib, times.isha];
      if (anchors.some((at, index) => !Number.isFinite(at) || (index > 0 && at < anchors[index - 1]!))) {
        problems.push(`${name} ${date}: prayer anchors ${anchors.join(',')}`);
      }
      const fasts = reminderOccurrences(date, state).filter(({ definition }) => definition.check === 'fast');
      const forbidden = h.month === 9 || (h.month === 10 && h.day === 1) || (h.month === 12 && h.day >= 10 && h.day <= 13);
      const FridayWithoutReason = weekday === 5 && fasts.some(({ definition }) => !definition.fast?.reason);
      if (fasts.length > 1 || (fasts.length && forbidden) || FridayWithoutReason) {
        problems.push(`${name} ${date}: fasts ${fasts.map(({ entry }) => entry.id).join(',')}`);
      }
    }
  }
  expect(problems).toEqual([]);
}, 60_000);

it('guards daily, monthly, yearly and fast tick contracts', () => {
  const calendar = calendarSettings(places.london);
  const state = stateFor(calendar);
  const rajabEve = isoAdd(hijriMonthStart(1448, 7, calendar.hijri), -1);
  const eidEve = isoAdd(hijriMonthStart(1448, 10, calendar.hijri), -1);
  const daily = reminderOccurrences('2026-12-18', state).find(({ entry }) => entry.id === 'friday-prep');
  const monthly = reminderOccurrences(rajabEve, state).find(({ entry }) => entry.id === 'crescent');
  const yearly = reminderOccurrences(eidEve, state).find(({ entry }) => entry.id === 'zakat');
  const fast = reminderOccurrences('2026-12-17', state).find(({ definition }) => definition.check === 'fast');
  expect([daily?.tickKey, monthly?.tickKey, yearly?.tickKey, fast?.tickKey]).toEqual([
    'friday-prep:2026-12-18', 'crescent:1448-6', 'zakat:1448', '2026-12-17',
  ]);
});

it('holds the White Days and mid-Dhul-Qaʿdah Moments at one and two fasts', () => {
  const calendar = calendarSettings(places.london);
  const state = stateFor(calendar);
  const now = (date: CivilDate) => localToMs(date, 602, calendar.place.timeZone);
  const white = todayState(now('2026-12-22'), { ...state, tracking: { fastLog: { '2026-12-14': true } } });
  expect(white.active.find(({ tracker }) => tracker?.kind === 'white-days')?.tracker).toMatchObject({ count: 1, total: 3 });
  const dq = todayState(now('2027-04-22'), {
    ...state, preferences: { notifications: 'granted' }, tracking: { fastLog: { '2027-04-20': true, '2027-04-21': true } },
  });
  expect(dq.notices.map(({ id }) => id)).toContain('udhiyah');
  expect(dq.active.find(({ tracker }) => tracker?.kind === 'white-days')?.tracker).toMatchObject({ count: 2, total: 3 });
});

it('holds the end-of-Shaban and announced Ramadan date Moments', () => {
  const calendar = calendarSettings(places.london);
  const state = stateFor(calendar);
  const now = localToMs('2027-02-06', 602, calendar.place.timeZone);
  const correction = {
    id: 'gb-ramadan-1448', region: 'the United Kingdom', countryCode: 'GB', year: 1448, month: 9, start: '2027-02-07',
  } as const;
  const endOfShaban = todayState(now, { ...state, preferences: { notifications: 'denied' } }, { correction });
  expect(endOfShaban.active.find(({ tracker }) => tracker?.kind === 'makeup')?.tracker).toMatchObject({ count: 3 });
  expect(endOfShaban.notices.map(({ id }) => id)).toEqual(['notifications', 'correction']);
  expect(todayState(now, state, { correction }).notices.map(({ id }) => id)).toEqual(['correction']);
});
