import type {
  CalendarSelector,
  ContentRule,
  GroupedSunnah,
  HijriMonth,
  OccurrenceDefinition,
  TimePoint,
  WeatherKind,
} from '@adwam/content/schema';

import { civil, isoAdd, MINUTE_MS, type CivilDate } from './civil';
import { day, type Day, type DaySettings } from './day';
import { hijriOf, type HijriDate, type HijriSettings } from './hijri';

const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export const hijriMonths = [
  'muharram', 'safar', 'rabi-al-awwal', 'rabi-al-thani', 'jumada-al-ula',
  'jumada-al-akhirah', 'rajab', 'shaban', 'ramadan', 'shawwal', 'dhul-qadah',
  'dhul-hijjah',
] as const satisfies readonly HijriMonth[];

export type ReminderLevel = 'off' | 'inapp' | 'push';
export type OccurrenceEvent = Readonly<{
  id: string;
  start: number;
  end: number;
} & ({ weather: WeatherKind; pushAt?: number } | { eclipse: 'solar' | 'lunar' })>;

type PushDefinition = NonNullable<OccurrenceDefinition['push']>;
export type OccurrencePush = Readonly<Omit<PushDefinition, 'at' | 'on'> & {
  at: number;
  /** The reminder whose level and channel control this push. */
  item: string;
  group: GroupedSunnah['group'];
  tickKey: string;
}>;

export type Occurrence = Readonly<{
  key: string;
  tickKey: string;
  entry: GroupedSunnah;
  definition: OccurrenceDefinition;
  rules: readonly ContentRule[];
  date: CivilDate;
  hijri: HijriDate;
  title: string;
  short: string;
  start: number;
  end: number;
  fajr: number;
  push?: OccurrencePush;
  event?: OccurrenceEvent;
  also?: readonly string[];
}>;

export type OccurrenceOptions = Readonly<{
  events?: readonly OccurrenceEvent[];
  level?: (entry: GroupedSunnah, hijriYear: number) => ReminderLevel;
  fastLog?: Readonly<Record<CivilDate, boolean>>;
  makeup?: number;
}>;

type Calendar = {
  today: Day;
  tomorrow: () => Day;
  yesterday: () => Day;
};

function matchesHijri(selector: NonNullable<CalendarSelector['hijri']>, date: HijriDate) {
  const month = hijriMonths[date.month - 1];
  if (!month) return false;
  const included = Array.isArray(selector.month) ? selector.month : [selector.month];
  if (selector.month && !included.includes(month)) return false;
  if (selector.excludeMonths?.includes(month)) return false;

  const on = selector.day;
  if (on === undefined) return true;
  if (typeof on === 'number') return date.day === on;
  if (on === 'last') return date.day === date.monthLength;
  if (on === 'second-last') return date.day === date.monthLength - 1;
  const [first, last] = on.split('-');
  return date.day >= Number(first) && date.day <= (last === 'last' ? date.monthLength : Number(last));
}

function matchesCalendar(on: CalendarSelector, calendar: Calendar) {
  const weekday = weekdays[calendar.today.weekday];
  return (!on.weekday || (weekday !== undefined && on.weekday.includes(weekday))) &&
    (!on.hijri || matchesHijri(on.hijri, calendar.today.hijri)) &&
    (!on.nextHijri || matchesHijri(on.nextHijri, calendar.tomorrow().hijri));
}

function duration(value: string | undefined) {
  if (!value) return 0;
  return Number(value.slice(0, -1)) * (value.endsWith('h') ? 60 : 1) * MINUTE_MS;
}

function timeOf(point: TimePoint, calendar: Calendar, event?: OccurrenceEvent): number {
  if ('if' in point) {
    return timeOf(matchesCalendar(point.if, calendar) ? point.then : point.otherwise, calendar, event);
  }
  if ('latest' in point || 'earliest' in point) {
    const times = ('latest' in point ? point.latest : point.earliest)
      .map((choice) => timeOf(choice, calendar, event));
    return 'latest' in point ? Math.max(...times) : Math.min(...times);
  }
  const offset = duration(point.plus) - duration(point.minus);
  if ('event' in point) return (event?.[point.event] ?? NaN) + offset;
  const date = point.day === -1 ? calendar.yesterday()
    : point.day === 1 ? calendar.tomorrow() : calendar.today;
  return date.times[point.prayer] + offset;
}

function windowOf(window: OccurrenceDefinition['window'], calendar: Calendar, event?: OccurrenceEvent) {
  const { fajr, maghrib } = calendar.today.times;
  switch (window) {
    case 'daytime': return [fajr, maghrib] as const;
    case 'night': return [maghrib, calendar.tomorrow().times.fajr] as const;
    case 'hijri-day':
    case 'fast': return [calendar.yesterday().times.maghrib, maghrib] as const;
    default: return [timeOf(window.from, calendar, event), timeOf(window.to, calendar, event)] as const;
  }
}

export function fastingAllowed(date: HijriDate, weekday: number, reason?: NonNullable<OccurrenceDefinition['fast']>['reason']) {
  const { month, day, monthLength } = date;
  if (month === 9 || (month === 10 && day === 1) || (month === 12 && day >= 10 && day <= 13)) return false;
  if (weekday === 5 && !reason) return false;
  return month !== 8 || day < monthLength - 1 || reason === 'habit' || reason === 'makeup';
}

export function countMonthFasts(
  fastLog: Readonly<Record<CivilDate, boolean>>,
  settings: HijriSettings,
  year: number,
  month: number,
  firstDay = 1,
) {
  return Object.entries(fastLog).filter(([date, logged]) => {
    if (!logged) return false;
    const hijri = hijriOf(date as CivilDate, settings);
    return hijri.year === year && hijri.month === month && hijri.day >= firstDay;
  }).length;
}

function tickScope(definition: OccurrenceDefinition, date: Day) {
  const { year, month } = date.hijri;
  if (definition.tickScope === 'hijri-year') return String(year);
  if (definition.tickScope === 'hijri-month') return `${year}-${month}`;
  return date.iso;
}

function resolveOccurrence(
  entry: GroupedSunnah,
  definition: OccurrenceDefinition,
  rules: readonly ContentRule[],
  calendar: Calendar,
  event?: OccurrenceEvent,
): Occurrence | undefined {
  const today = calendar.today;
  const [start, end] = windowOf(definition.window, calendar, event);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) return;
  const prefix = definition.key ? `${entry.id}.${definition.key}` : entry.id;
  const tickKey = definition.check === 'fast' ? today.iso : `${prefix}:${tickScope(definition, today)}`;
  const key = `${prefix}:${today.iso}${event ? `:${event.id}` : ''}`;

  let push: OccurrencePush | undefined;
  if (definition.push) {
    const { on, at, ...wording } = definition.push;
    if (!on || matchesCalendar(on, calendar)) {
      const instant = event && 'weather' in event ? event.pushAt : timeOf(at, calendar, event);
      if (instant !== undefined && Number.isFinite(instant)) {
        push = { ...wording, at: instant, item: entry.id, group: entry.group, tickKey };
      }
    }
  }
  return {
    key, tickKey, entry, definition, rules, date: today.iso, hijri: today.hijri,
    title: definition.title ?? entry.title,
    short: definition.short ?? entry.short,
    start, end, fajr: today.times.fajr, push, event,
  };
}

function winningFast(fasts: Occurrence[]): Occurrence | undefined {
  const priority = (occurrence: Occurrence) => occurrence.definition.fast?.priority ?? 0;
  fasts.sort((a, b) => priority(b) - priority(a));
  const [winner, ...others] = fasts;
  if (!winner || !others.length) return winner;
  const borrowed = winner.definition.fast?.borrowPush === false
    ? undefined : others.find((occurrence) => occurrence.push)?.push;
  return {
    ...winner,
    push: winner.push ?? borrowed,
    also: others.flatMap(({ definition }) => definition.fast?.also ?? []),
  };
}

export function occurrencesForDay(
  iso: CivilDate,
  settings: DaySettings,
  entries: readonly GroupedSunnah[],
  options: OccurrenceOptions = {},
): Occurrence[] {
  const today = day(iso, settings);
  const calendar = {
    today,
    tomorrow: () => day(isoAdd(iso, 1), settings),
    yesterday: () => day(isoAdd(iso, -1), settings),
  };
  const { hijri, weekday } = today;
  const fastLog = options.fastLog ?? {};
  const events = options.events?.filter(({ start }) => civil(start, settings.place.timeZone).iso === iso) ?? [];
  const occurrences: Occurrence[] = [];
  const fasts: Occurrence[] = [];
  for (const entry of entries) {
    const level = options.level?.(entry, hijri.year) ?? entry.default ?? entry.tier;
    for (const definition of entry.occurrences) {
      const selector = definition.on;
      const matches = 'weather' in selector ? events.filter((event) => 'weather' in event && event.weather === selector.weather)
        : 'eclipse' in selector ? events.filter((event) => 'eclipse' in event && (selector.eclipse === 'any' || event.eclipse === selector.eclipse))
          : matchesCalendar(selector, calendar) ? [undefined] : [];
      if (!matches.length) continue;

      const rules = [...(entry.rules ?? []), ...(definition.rules ?? [])];
      if (rules.includes('tracker-makeup') && options.makeup === 0) continue;
      const fast = definition.check === 'fast' || definition.fast !== undefined;
      if (fast) {
        if (level === 'off' || !fastingAllowed(hijri, weekday, definition.fast?.reason)) continue;
        if (rules.includes('stop-after-six') && !fastLog[iso] &&
            countMonthFasts(fastLog, settings.hijri, hijri.year, 10, 2) >= 6) continue;
      }

      for (const event of matches) {
        const occurrence = resolveOccurrence(entry, definition, rules, calendar, event);
        if (occurrence) (fast ? fasts : occurrences).push(occurrence);
      }
    }
  }
  const fast = winningFast(fasts);
  return fast ? [fast, ...occurrences] : occurrences;
}
