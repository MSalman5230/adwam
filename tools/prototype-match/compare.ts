import { civil, isoAdd, localToMs, MINUTE_MS, type CivilDate } from '../../packages/core/src/civil';
import type { DaySettings } from '../../packages/core/src/day';
import { planNotifications, type NotificationState } from '../../packages/core/src/notifications';
import { reminderOccurrences } from '../../packages/core/src/rules';
import { todayState, upcomingRows } from '../../packages/core/src/views';
import type { Prototype } from './prototype';

type Difference = {
  surface: 'occurrences' | 'active' | 'coming' | 'upcoming' | 'pushes';
  date: CivilDate;
  expected: string;
  actual: string;
  explanation?: 'computed-eclipse';
};

export const calendarSettings = (place: DaySettings['place'], method: DaySettings['prayer']['method'] = 'mwl'): DaySettings => ({
  place,
  prayer: { method, asr: 'standard', jumuah: { mode: 'fixed', minutes: 810 } },
  hijri: { method: 'umalqura' },
});

export const places = {
  london: { latitude: 51.5074, longitude: -0.1278, timeZone: 'Europe/London', countryCode: 'GB' },
  oslo: { latitude: 59.9139, longitude: 10.7522, timeZone: 'Europe/Oslo', countryCode: 'NO' },
  jakarta: { latitude: -6.2088, longitude: 106.8456, timeZone: 'Asia/Jakarta', countryCode: 'ID' },
  toronto: { latitude: 43.6532, longitude: -79.3832, timeZone: 'America/Toronto', countryCode: 'CA' },
  capeTown: { latitude: -33.9249, longitude: 18.4241, timeZone: 'Africa/Johannesburg', countryCode: 'ZA' },
} satisfies Record<string, DaySettings['place']>;

const contentId = (item: string) => item.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

type Timed = { item: string; start: number; end: number };

function compareWindows(date: CivilDate, expected: Timed[], actual: Timed[], tolerance: number): Difference[] {
  const differences: Difference[] = [];
  const describe = ({ item, start, end }: Timed) => `${item}@${new Date(start).toISOString()}–${new Date(end).toISOString()}`;
  const remaining = [...actual];
  for (const target of expected) {
    const index = remaining.findIndex(({ item, start, end }) => item === target.item &&
      Math.abs(start - target.start) <= tolerance && Math.abs(end - target.end) <= tolerance);
    if (index !== -1) {
      remaining.splice(index, 1);
    } else {
      differences.push({ surface: 'occurrences', date, expected: describe(target), actual: '' });
    }
  }
  for (const extra of remaining) differences.push({ surface: 'occurrences', date, expected: '', actual: describe(extra) });
  return differences;
}

function missing(surface: Difference['surface'], date: CivilDate, expected: string[], actual: string[]): Difference[] {
  const left = new Set(expected);
  const right = new Set(actual);
  return [
    ...[...left].filter((key) => !right.has(key)).map((key) => ({ surface, date, expected: key, actual: '' })),
    ...[...right].filter((key) => !left.has(key)).map((key) => ({ surface, date, expected: '', actual: key })),
  ];
}

export function compareDay(
  date: CivilDate,
  prototype: Prototype,
  state: NotificationState,
): Difference[] {
  const { timeZone } = state.calendar.place;
  prototype.date(date, 602);
  const now = prototype.now();
  const tolerance = (timeZone === 'Europe/Oslo' ? 3 : 2) * MINUTE_MS;
  const before = prototype.occurrences(date).map((o) => ({ item: contentId(o.item), start: o.start, end: o.end }));
  const after = reminderOccurrences(date, state).filter(({ definition }) => !definition.banner || definition.marker)
    .map((o) => ({ item: o.entry.id, start: o.start, end: o.end }));
  const result = compareWindows(date, before, after, tolerance);

  const legacy = prototype.today();
  const today = todayState(now, state);
  const prototypeCard = ({ item, date }: { item: string; date: CivilDate }) => `${contentId(item)}:${date}`;
  const coreCard = ({ occurrence }: (typeof today.active)[number] | (typeof today.coming)[number]) =>
    `${occurrence.entry.id}:${occurrence.date}`;
  result.push(...missing('active', date, legacy.active.map(prototypeCard), today.active.map(coreCard)));
  const coming = missing('coming', date, legacy.coming.map(prototypeCard), today.coming.map(coreCard));
  if (coming.some(({ actual }) => actual.startsWith('eclipse:'))) {
    const withoutEclipses = { ...state, catalog: state.catalog.filter(({ id }) => id !== 'eclipse') };
    const calendarOnly = todayState(now, withoutEclipses).coming.map(coreCard);
    for (const difference of coming) {
      if (difference.expected && calendarOnly.includes(difference.expected)) difference.explanation = 'computed-eclipse';
    }
  }
  result.push(...coming);

  const oldRows = prototype.upcoming().map((row) => row.kind === 'month' ? `month:${row.iso}`
    : `${contentId(row.o.item)}:${row.iso}:${row.range?.[1] ?? ''}`);
  const newRows = upcomingRows(now, state).rows.map((row) => row.kind === 'month' ? `month:${row.date}`
    : `${row.occurrence.entry.id}:${row.date}:${row.until ?? ''}`);
  result.push(...missing('upcoming', date, oldRows, newRows));

  const start = localToMs(date, 0, timeZone);
  const end = localToMs(isoAdd(date, 1), 0, timeZone);
  const oldPushes = prototype.pushes(start, end - 1).map((o) => ({ item: contentId(o.pushItem ?? o.item), at: o.push ?? 0 }));
  const newPushes = planNotifications(start, state).filter(({ at }) => civil(at, timeZone).iso === date).map((push) => ({
    item: push.link === '/today' ? 'friday-prep' : (push.link.split('?')[0]?.split('/').at(-1) ?? ''), at: push.at,
  }));
  for (const expected of oldPushes) {
    const index = newPushes.findIndex(({ item, at }) => item === expected.item && Math.abs(at - expected.at) <= tolerance);
    if (index !== -1) newPushes.splice(index, 1);
    else result.push({ surface: 'pushes', date, expected: `${expected.item}:${new Date(expected.at).toISOString()}`, actual: '' });
  }
  for (const extra of newPushes) result.push({ surface: 'pushes', date, expected: '', actual: `${extra.item}:${new Date(extra.at).toISOString()}` });
  return result.map((difference) => difference.actual.startsWith('eclipse:') && difference.surface !== 'occurrences'
    ? { ...difference, explanation: 'computed-eclipse' } : difference);
}
