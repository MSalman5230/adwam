import type { GroupedSunnah } from '@adwam/content/schema';

import { civil, isoAdd, type CivilDate } from './civil';
import { day, type Day } from './day';
import { withEclipses } from './events';
import { hijriMonthStart, type HijriDate } from './hijri';
import { activeMeta, comingLabel, fmtDur, nextSentence, relDay } from './labels';
import { msg, type Msg } from './message';
import { countMonthFasts, type Occurrence } from './occurrences';
import {
  isDone, level, occurrenceEnabled, paused, pushAllowed, reminderOccurrences, visible,
  type ReminderState,
} from './rules';

type CorrectionOffer = Readonly<{
  id: string;
  countryCode: string;
  region: string;
  year: number;
  month: number;
  start: CivilDate;
}>;
export type TodayOptions = Readonly<{
  correction?: CorrectionOffer;
  correctionChoices?: Readonly<Record<string, 'accepted' | 'declined'>>;
  usagePrompt?: boolean;
}>;

type Notice = Readonly<{
  id: string;
  title: Msg;
  body: Msg;
  actions: readonly { id: string; label: Msg }[];
}>;

function notice(id: string, body: Msg, actions: readonly string[], params?: Record<string, string>): Notice {
  return {
    id,
    title: msg(`today.notice.${id}.title`),
    body,
    actions: actions.map((action) => ({ id: action, label: msg(`today.notice.${id}.${action}`, params) })),
  };
}

function notices(current: Day, date: CivilDate, state: ReminderState, options: TodayOptions): Notice[] {
  const result: Notice[] = [];
  const { hijri } = current;
  const { preferences } = state;
  const wantsPush = state.catalog.some((item) => level(state, item.id, hijri.year) === 'push');
  if (preferences.notifications !== 'granted' && wantsPush) {
    result.push(notice('notifications', msg('today.notice.notifications.body'), ['openSettings']));
  }
  const { correction } = options;
  if (correction && correction.countryCode === state.calendar.place.countryCode && !options.correctionChoices?.[correction.id]) {
    const { year, month, start: announced, region } = correction;
    const calculated = hijriMonthStart(year, month, state.calendar.hijri);
    if (calculated !== announced) {
      const body = msg('today.notice.correction.body', { month, announced, calculated, region });
      result.push(notice('correction', body, ['accept', 'decline'], { announced }));
    }
  }
  if (options.usagePrompt) result.push(notice('usage', msg('today.notice.usage.body'), ['share', 'decline']));
  if (hijri.month === 11 && hijri.day >= 10 && hijri.day <= 28 && preferences.udhiyah?.[hijri.year] == null) {
    result.push(notice('udhiyah', msg('today.notice.udhiyah.body'), ['yes', 'no']));
  }
  if (paused(preferences.pause, date)) {
    const until = preferences.pause?.until;
    const body = until ? msg('today.notice.pause.until', { date: until }) : msg('today.notice.pause.body');
    result.push(notice('pause', body, ['resume']));
  }
  return result;
}

export function dayLine(now: number, current: Day) {
  const { times, weekday } = current;
  const names = ['fajr', weekday === 5 ? 'jumuah' : 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
  const marks = names.map((name, index) => ({
    name, at: times[name], label: msg(`calendar.prayer.${name}`),
    position: index / (names.length - 1), past: now >= times[name],
  }));
  let position = now >= times.isha ? 1 : 0;
  for (const [index, mark] of marks.entries()) {
    const next = marks[index + 1];
    if (next && now >= mark.at && now < next.at) {
      position = (index + (now - mark.at) / (next.at - mark.at)) / (marks.length - 1);
      break;
    }
  }
  const caption = now < times.fajr ? msg('today.dayLine.beforeFajr', { time: times.fajr })
    : now < times.maghrib ? msg('today.dayLine.untilMaghrib', { duration: fmtDur(times.maghrib - now) })
      : msg('today.dayLine.afterMaghrib', { time: times.maghrib });
  return { marks, position, caption };
}

function bannerFor(date: CivilDate, state: ReminderState) {
  const ranked = reminderOccurrences(date, state).flatMap((occurrence) => {
    const { banner } = occurrence.definition;
    return banner ? [{ occurrence, banner }] : [];
  }).sort((a, b) => a.banner.rank - b.banner.rank);
  const first = ranked[0];
  if (!first || !occurrenceEnabled(first.occurrence, state)) return;
  return { ...first.banner, item: first.occurrence.entry.id, hijri: first.occurrence.hijri };
}

function seriesKey(occurrence: Occurrence): string {
  const { definition, entry, hijri, key } = occurrence;
  return definition.upcomingGroup
    ? `${entry.id}.${definition.upcomingGroup.key}:${hijri.year}-${hijri.month}`
    : definition.tickScope && definition.check === 'done' ? occurrence.tickKey : key;
}

function activeAt(occurrence: Occurrence, now: number): boolean {
  return occurrence.start <= now && now < occurrence.end;
}

function tick(occurrence: Occurrence, now: number, state: ReminderState) {
  const { check } = occurrence.definition;
  if (!check || !activeAt(occurrence, now) || (check === 'fast' && now < occurrence.fajr)) return;
  return {
    type: check, key: occurrence.tickKey, done: isDone(occurrence, state.tracking),
    label: msg(check === 'fast' ? 'reminder.tick.fast' : 'reminder.tick.done'),
  };
}

function makeupTracker(count?: number) {
  const label = count === undefined ? msg('reminder.tracker.makeupUnset')
    : count === 0 ? msg('reminder.tracker.makeupComplete') : msg('reminder.tracker.makeup', { count });
  return { kind: 'makeup' as const, count, label };
}

function tracker(occurrence: Occurrence, state: ReminderState) {
  const { rules, hijri } = occurrence;
  const { tracking, calendar } = state;
  if (rules.includes('tracker-makeup')) {
    return makeupTracker(tracking?.makeup);
  }

  const whiteDays = rules.includes('tracker-white-days');
  if (!whiteDays && !rules.includes('tracker-shawwal')) return;
  const total = whiteDays ? 3 : 6;
  const count = Math.min(total, countMonthFasts(tracking?.fastLog ?? {}, calendar.hijri, hijri.year, hijri.month, whiteDays ? 1 : 2));
  const label = whiteDays ? msg('reminder.tracker.whiteDays', { count, total })
    : count === total ? msg('reminder.tracker.shawwalComplete') : msg('reminder.tracker.shawwal', { count, total });
  return { kind: whiteDays ? 'white-days' as const : 'shawwal' as const, count, total, label };
}

function futurePush(occurrence: Occurrence, now: number, state: ReminderState): boolean {
  return occurrence.push !== undefined && occurrence.push.at > now &&
    pushAllowed(occurrence, state) && !isDone(occurrence, state.tracking);
}

function collect(date: CivilDate, from: number, to: number, state: ReminderState): Occurrence[] {
  const result: Occurrence[] = [];
  for (let offset = from; offset <= to; offset++) result.push(...reminderOccurrences(isoAdd(date, offset), state));
  return result;
}

export function todayState(now: number, state: ReminderState, options: TodayOptions = {}) {
  const { place } = state.calendar;
  const { iso: date } = civil(now, place.timeZone);
  const local = withEclipses(state, date, 60);
  const today = day(date, state.calendar);
  const sinceMaghrib = now >= today.times.maghrib;
  const current = sinceMaghrib ? day(isoAdd(date, 1), state.calendar) : today;
  const seen = new Set<string>();
  const active = collect(date, -1, 1, local).filter((occurrence) => {
    const key = occurrence.definition.check ? occurrence.tickKey : occurrence.key;
    if (!activeAt(occurrence, now) || !visible(occurrence, state, date) || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((occurrence) => ({
    occurrence,
    meta: activeMeta(occurrence, now, place.timeZone),
    done: occurrence.definition.check === 'done' && isDone(occurrence, state.tracking),
    tick: tick(occurrence, now, state),
    tracker: tracker(occurrence, state),
    push: futurePush(occurrence, now, state),
    body: occurrence.definition.check === 'fast' && now < occurrence.fajr
      ? msg('today.planSuhur', { time: occurrence.fajr }) : undefined,
  })).sort((a, b) => Number(a.done) - Number(b.done) || a.occurrence.end - b.occurrence.end);

  const activeSeries = new Set(active.map(({ occurrence }) => seriesKey(occurrence)));
  const coming = [];
  for (const occurrence of collect(date, 0, 16, local).sort((a, b) => a.start - b.start)) {
    const key = seriesKey(occurrence);
    if (occurrence.start <= now || occurrence.definition.coming === false ||
        !occurrenceEnabled(occurrence, state) || activeSeries.has(key) ||
        (occurrence.definition.check === 'fast' && paused(state.preferences.pause, date))) continue;
    activeSeries.add(key);
    const push = futurePush(occurrence, now, state);
    coming.push({ occurrence, push, label: comingLabel(occurrence, now, place.timeZone, push) });
    if (coming.length === 3) break;
  }

  const first = coming[0];
  return {
    now, date, place, hijri: current.hijri, sinceMaghrib, dayLine: dayLine(now, today),
    title: msg('calendar.hijriDate', { day: current.hijri.day, month: current.hijri.month, year: current.hijri.year }),
    sinceMaghribLabel: sinceMaghrib ? msg('today.sinceMaghrib') : undefined,
    notices: notices(current, date, state, options), banner: bannerFor(current.iso, state),
    active, activeCount: msg('today.activeCount', { count: active.filter(({ done }) => !done).length }),
    coming, empty: active.length ? undefined : {
      title: msg('today.empty.title'),
      body: first ? nextSentence(first.occurrence, now, place.timeZone, first.push) : msg('today.empty.none'),
    },
  };
}

export type UpcomingFilter = 'all' | 'fasts' | 'push';
type MonthRow = Readonly<{ kind: 'month'; date: CivilDate; hijri: HijriDate; beginsAt: number; sacred: boolean; title: Msg }>;
type ItemRow = {
  kind: 'item'; date: CivilDate; occurrence: Occurrence; title: string;
  until?: CivilDate; untilHijri?: HijriDate; tags: Msg[]; bell: boolean;
};
const sacredMonths = new Set([1, 7, 11, 12]);

export function upcomingRows(now: number, state: ReminderState, filter: UpcomingFilter = 'all') {
  const { iso: date } = civil(now, state.calendar.place.timeZone);
  const local = withEclipses(state, date, 60);
  const rows: Array<MonthRow | ItemRow> = [];
  const groups = new Map<string, ItemRow>();
  for (let offset = 0; offset < 60; offset++) {
    const iso = isoAdd(date, offset);
    const current = day(iso, state.calendar);
    if (offset > 0 && current.hijri.day === 1) {
      const beginsAt = day(isoAdd(iso, -1), state.calendar).times.maghrib;
      const month = current.hijri.month;
      const sacred = sacredMonths.has(month);
      const title = msg(sacred ? 'upcoming.sacredMonthStarts' : 'upcoming.monthStarts', { month });
      rows.push({ kind: 'month', date: iso, hijri: current.hijri, beginsAt, sacred, title });
    }
    for (const occurrence of reminderOccurrences(iso, local)) {
      const { definition, event } = occurrence;
      const noFasting = definition.marker === 'no-fasting';
      const fast = definition.check === 'fast';
      if (occurrence.end <= now || definition.upcoming === false || (event && 'weather' in event)) continue;
      if (!noFasting && !occurrenceEnabled(occurrence, state)) continue;
      if (filter === 'fasts' && !fast && !noFasting) continue;
      const isPaused = fast && paused(state.preferences.pause, iso);
      const pushItem = occurrence.push?.item ?? occurrence.entry.id;
      if (filter === 'push' && (isPaused || (noFasting && definition.card === false) ||
          level(state, pushItem, current.hijri.year) !== 'push')) continue;
      const key = isPaused ? `${seriesKey(occurrence)}:paused` : seriesKey(occurrence);
      const previous = groups.get(key);
      const bell = !isPaused && futurePush(occurrence, now, state);
      if (previous) {
        previous.until = iso;
        previous.untilHijri = occurrence.hijri;
        previous.bell ||= bell;
      } else {
        const tags = [];
        if (noFasting) tags.push(msg('upcoming.noFasting'));
        if (isPaused) tags.push(msg('upcoming.paused'));
        const row: ItemRow = { kind: 'item', date: iso, occurrence, title: definition.upcomingGroup?.title ?? occurrence.title, tags, bell };
        groups.set(key, row);
        rows.push(row);
      }
    }
  }
  return { rows, count: groups.size, countLabel: msg('upcoming.count', { count: groups.size }) };
}

export type DetailRequest = Readonly<{ item: string; date?: CivilDate; occurrenceKey?: string }>;

function findOccurrence(request: DetailRequest, candidates: readonly Occurrence[]) {
  const matching = candidates.filter(({ entry, push }) => entry.id === request.item || push?.item === request.item);
  return matching.find(({ key }) => key === request.occurrenceKey) ?? matching[0];
}

function reminderCaption(entry: GroupedSunnah, state: ReminderState, year: number) {
  const selected = level(state, entry.id, year);
  const groupOff = entry.group !== 'disputed' && state.preferences.groupOn?.[entry.group] === false;
  if (selected === 'off') return groupOff ? msg('detail.reminder.groupOff', { group: entry.group }) : msg('detail.reminder.off');
  if (selected === 'inapp') return msg(entry.tier === 'inapp' ? 'detail.reminder.noPushTime' : 'detail.reminder.inapp');
  return entry.pushNote ? msg('detail.reminder.custom', { text: entry.pushNote }) : msg('detail.reminder.push');
}

export function detailState(now: number, state: ReminderState, request: DetailRequest) {
  const entry = state.catalog.find(({ id }) => id === request.item);
  if (!entry) return;
  const { timeZone } = state.calendar.place;
  const { iso: date } = civil(now, timeZone);
  const today = day(date, state.calendar);
  const current = now >= today.times.maghrib ? day(isoAdd(date, 1), state.calendar) : today;
  const eclipse = entry.occurrences.some(({ on }) => 'eclipse' in on);
  const maxDays = entry.group === 'weather' && !eclipse ? 1 : 400;
  const local = eclipse ? withEclipses(state, date, maxDays) : state;
  const banner = entry.occurrences.some((definition) => definition.banner);
  let occurrence = request.date ? findOccurrence(request, reminderOccurrences(request.date, local)) : undefined;
  for (let offset = -1; offset < maxDays && (!occurrence || occurrence.end <= now); offset++) {
    occurrence = findOccurrence(request, reminderOccurrences(isoAdd(date, offset), local).filter(({ end }) => end > now)) ?? occurrence;
  }

  const active = occurrence && activeAt(occurrence, now) && visible(occurrence, state, date);
  let status: Msg | undefined;
  if (banner && (!occurrence || occurrence.definition.banner)) {
    status = msg(bannerFor(current.iso, state)?.item === entry.id ? 'detail.status.banner' : 'detail.status.outOfSeason');
  } else if (occurrence) {
    status = active ? msg('detail.status.active', { meta: activeMeta(occurrence, now, timeZone) })
      : occurrence.start > now ? msg('detail.status.next', {
          when: comingLabel(occurrence, now, timeZone), day: occurrence.hijri.day, month: occurrence.hijri.month,
        })
        : occurrence.end <= now ? msg('detail.status.ended', { when: relDay(occurrence.end, now, timeZone, { sentence: true }) })
          : undefined;
  } else if (entry.group === 'weather') {
    status = msg(eclipse ? 'detail.status.eclipse' : 'detail.status.weather');
  }

  return {
    entry, occurrence, status,
    tick: active && occurrence ? tick(occurrence, now, state) : undefined,
    tracker: entry.rules?.includes('tracker-makeup') ? makeupTracker(state.tracking?.makeup)
      : occurrence ? tracker(occurrence, state) : undefined,
    level: level(state, entry.id, current.hijri.year),
    reminder: entry.hidden ? undefined : reminderCaption(entry, state, current.hijri.year),
  };
}
