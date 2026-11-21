import { dateToEpochDay, epochDayToDate, type CivilDate } from './civil';
import {
  UMM_AL_QURA_FIRST_DATE,
  UMM_AL_QURA_FIRST_YEAR,
  UMM_AL_QURA_MONTHS,
} from './umalqura-data';

export type HijriMethod = 'umalqura' | 'civil';
export type HijriCorrection = Readonly<{
  year: number;
  month: number;
  start: CivilDate;
  withdrawn?: boolean;
}>;
export type HijriSettings = Readonly<{
  method: HijriMethod;
  shift?: -1 | 0 | 1;
  corrections?: readonly HijriCorrection[];
}>;
export type HijriDate = Readonly<{
  year: number;
  month: number;
  day: number;
  monthLength: number;
}>;

const civilEpoch = dateToEpochDay('0622-07-19');
const firstTableMonth = (UMM_AL_QURA_FIRST_YEAR - 1) * 12;
const ummAlQuraStarts = [dateToEpochDay(UMM_AL_QURA_FIRST_DATE)];
for (const digit of UMM_AL_QURA_MONTHS) {
  ummAlQuraStarts.push((ummAlQuraStarts.at(-1) ?? 0) + 29 + Number(digit));
}
const lastTableBoundary = firstTableMonth + UMM_AL_QURA_MONTHS.length;

function civilMonthStart(index: number): number {
  const years = Math.floor(index / 12);
  const month = index - years * 12;
  const daysBeforeYear = years * 354 + Math.floor((14 + 11 * years) / 30);
  return civilEpoch + daysBeforeYear + Math.ceil(month * 29.5);
}

const beforeTableOffset =
  dateToEpochDay(UMM_AL_QURA_FIRST_DATE) - civilMonthStart(firstTableMonth);
const afterTableOffset =
  (ummAlQuraStarts.at(-1) ?? 0) - civilMonthStart(lastTableBoundary);

function baseMonthStart(
  index: number,
  method: HijriMethod,
  shift: number,
): number {
  if (method === 'civil') return civilMonthStart(index) - shift;
  const table = ummAlQuraStarts[index - firstTableMonth];
  if (table !== undefined) return table - shift;
  // Continue arithmetically outside the table, keeping the boundary month 29 or 30 days.
  const offset = index < firstTableMonth ? beforeTableOffset : afterTableOffset;
  return civilMonthStart(index) + offset - shift;
}

function monthIndex(year: number, month: number): number {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new RangeError('Invalid Hijri year or month');
  }
  return (year - 1) * 12 + month - 1;
}

type Pin = { index: number; day: number };
const cache = new Map<string, ReadonlyMap<number, number>>();
const clamp = (value: number, low: number, high: number) =>
  Math.max(low, Math.min(high, value));

function derivePins(
  settings: HijriSettings,
): ReadonlyMap<number, number> | undefined {
  const pins = (settings.corrections ?? [])
    .filter(({ withdrawn }) => !withdrawn)
    .map(({ year, month, start }) => ({
      index: monthIndex(year, month),
      day: dateToEpochDay(start),
    }))
    .sort((a, b) => a.index - b.index);
  const first = pins[0];
  const last = pins.at(-1);
  if (!first || !last) return undefined;
  const shift = settings.shift ?? 0;
  const key = [
    settings.method,
    shift,
    ...pins.flatMap(({ index, day }) => [index, day]),
  ].join(':');
  const saved = cache.get(key);
  if (saved) return saved;

  const corrected = new Map(pins.map(({ index, day }) => [index, day]));
  const base = (index: number) => baseMonthStart(index, settings.method, shift);
  let previous: Pin = first;
  for (const next of pins.slice(1)) {
    const months = next.index - previous.index;
    const days = next.day - previous.day;
    if (months === 0 || days < months * 29 || days > months * 30) {
      throw new RangeError(
        'Hijri corrections cannot preserve 29- or 30-day months',
      );
    }
    let priorStart = previous.day;
    for (let index = previous.index + 1; index < next.index; index++) {
      const remaining = next.index - index;
      const min = Math.max(priorStart + 29, next.day - 30 * remaining);
      const max = Math.min(priorStart + 30, next.day - 29 * remaining);
      priorStart = clamp(base(index), min, max);
      corrected.set(index, priorStart);
    }
    previous = next;
  }

  for (const [pin, direction] of [
    [first, -1],
    [last, 1],
  ] as const) {
    let neighbor = pin.day;
    for (let index = pin.index + direction; ; index += direction) {
      const original = base(index);
      const adjusted =
        direction === -1
          ? clamp(original, neighbor - 30, neighbor - 29)
          : clamp(original, neighbor + 29, neighbor + 30);
      if (adjusted === original) break;
      corrected.set(index, adjusted);
      neighbor = adjusted;
    }
  }

  if (cache.size >= 32) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, corrected);
  return corrected;
}

function startReader(settings: HijriSettings): (index: number) => number {
  const pins = settings.corrections?.length ? derivePins(settings) : undefined;
  const shift = settings.shift ?? 0;
  return (index) =>
    pins?.get(index) ?? baseMonthStart(index, settings.method, shift);
}

export function hijriMonthStart(
  year: number,
  month: number,
  settings: HijriSettings,
): CivilDate {
  return epochDayToDate(startReader(settings)(monthIndex(year, month)));
}

export function hijriOf(date: CivilDate, settings: HijriSettings): HijriDate {
  const day = dateToEpochDay(date);
  const start = startReader(settings);
  let index = Math.floor((day - civilEpoch) / 29.530556);
  while (start(index) > day) index--;
  while (start(index + 1) <= day) index++;
  const year = Math.floor(index / 12) + 1;
  const month = index - (year - 1) * 12 + 1;
  const beginning = start(index);
  return {
    year,
    month,
    day: day - beginning + 1,
    monthLength: start(index + 1) - beginning,
  };
}
