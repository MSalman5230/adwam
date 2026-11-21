export const MINUTE_MS = 60_000;
export const DAY_MS = 86_400_000;

export type CivilDate = `${number}-${number}-${number}`;
export type DateParts = Readonly<{ year: number; month: number; day: number }>;
export type ZonedParts = DateParts &
  Readonly<{ hour: number; minute: number; second: number }>;
export type CivilTime = Readonly<{ iso: CivilDate; min: number }>;

const formatters = new Map<string, Intl.DateTimeFormat>();

export function dateToEpochDay(iso: CivilDate): number {
  const date = new Date(`${iso}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(iso) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== iso
  ) {
    throw new RangeError(`Invalid civil date: ${iso}`);
  }
  return date.getTime() / DAY_MS;
}

export function epochDayToDate(epochDay: number): CivilDate {
  const date = new Date(epochDay * DAY_MS);
  if (!Number.isInteger(epochDay) || !Number.isFinite(date.getTime())) {
    throw new RangeError(`Invalid epoch day: ${epochDay}`);
  }
  const iso = date.toISOString().split('T')[0] as CivilDate;
  if (iso.length !== 10)
    throw new RangeError(`Civil year is outside 0000–9999: ${iso}`);
  return iso;
}

export function isoAdd(iso: CivilDate, days: number): CivilDate {
  return epochDayToDate(dateToEpochDay(iso) + days);
}

export function isoParts(iso: CivilDate): DateParts {
  const date = new Date(dateToEpochDay(iso) * DAY_MS);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

export function wdOf(iso: CivilDate): number {
  return new Date(dateToEpochDay(iso) * DAY_MS).getUTCDay();
}

export function dayDiff(a: CivilDate, b: CivilDate): number {
  return dateToEpochDay(a) - dateToEpochDay(b);
}

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (formatter) return formatter;

  formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    calendar: 'gregory',
    numberingSystem: 'latn',
    era: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  formatters.set(timeZone, formatter);
  return formatter;
}

export function tzParts(instant: number, timeZone: string): ZonedParts {
  const parts = formatterFor(timeZone).formatToParts(new Date(instant));
  const values: Record<string, number> = Object.fromEntries(
    parts.map(({ type, value }) => [type, Number(value)]),
  );
  const { year, month, day, hour, minute, second } = values;
  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    hour === undefined ||
    minute === undefined ||
    second === undefined
  ) {
    throw new RangeError(`Could not read civil time in ${timeZone}`);
  }
  const era = parts.find((part) => part.type === 'era')?.value;
  return {
    year: era === 'BC' ? 1 - year : year,
    month,
    day,
    hour: hour % 24,
    minute,
    second,
  };
}

export function tzOffset(instant: number, timeZone: string): number {
  const { year, month, day, hour, minute, second } = tzParts(instant, timeZone);
  const wallTime = new Date(0);
  wallTime.setUTCFullYear(year, month - 1, day);
  wallTime.setUTCHours(hour, minute, second, 0);
  return (wallTime.getTime() - Math.floor(instant / 1_000) * 1_000) / MINUTE_MS;
}

export function localToMs(
  iso: CivilDate,
  minutes: number,
  timeZone: string,
): number {
  const wallTime = dateToEpochDay(iso) * DAY_MS + minutes * MINUTE_MS;
  const offsets = new Set([
    tzOffset(wallTime - DAY_MS, timeZone),
    tzOffset(wallTime, timeZone),
    tzOffset(wallTime + DAY_MS, timeZone),
  ]);
  let earliest = Infinity;
  let nearestLater = Infinity;
  let gap = Infinity;
  for (const offset of offsets) {
    const candidate = wallTime - offset * MINUTE_MS;
    const difference = tzOffset(candidate, timeZone) - offset;
    if (difference === 0) earliest = Math.min(earliest, candidate);
    if (difference > 0 && difference < gap) {
      gap = difference;
      nearestLater = candidate;
    }
  }
  // Choose the earlier instant in a fold, and move forward by the gap at a spring transition.
  const instant = earliest === Infinity ? nearestLater : earliest;
  if (!Number.isFinite(instant))
    throw new RangeError(`Could not resolve civil time in ${timeZone}`);
  return instant;
}

export function civil(instant: number, timeZone: string): CivilTime {
  const { year, month, day, hour, minute } = tzParts(instant, timeZone);
  const iso: CivilDate =
    `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` as CivilDate;
  return { iso, min: hour * 60 + minute };
}
