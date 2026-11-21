import { z } from 'zod';

export const id = z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/);
export const wording = z
  .string()
  .min(1)
  .refine((value) => value.trim().length > 0);
export const prayerAnchor = z.enum([
  'fajr',
  'sunrise',
  'dhuhr',
  'jumuah',
  'asr',
  'maghrib',
  'isha',
]);
export const hijriMonth = z.enum([
  'muharram',
  'safar',
  'rabi-al-awwal',
  'rabi-al-thani',
  'jumada-al-ula',
  'jumada-al-akhirah',
  'rajab',
  'shaban',
  'ramadan',
  'shawwal',
  'dhul-qadah',
  'dhul-hijjah',
]);
export const weatherKind = z.enum([
  'rain-start',
  'rain-stop',
  'heavy-rain',
  'thunder',
  'wind',
]);
export const eclipseKind = z.enum(['solar', 'lunar', 'any']);

export const contentRule = z.enum([
  'requires-udhiyah',
  'tracker-white-days',
  'tracker-shawwal',
  'tracker-makeup',
  'stop-after-six',
  'combine-into-friday-push',
  'follow-makeup-season',
]);

const day = z.int().min(1).max(30);
const dayRange = z
  .string()
  .regex(/^(?:[1-9]|[12]\d|30)-(?:[1-9]|[12]\d|30|last)$/)
  .refine((value) => {
    const [from, to] = value.split('-');
    return to === 'last' || Number(from) <= Number(to);
  }, 'The first day in a range must come before its last day');
const hijriMatch = z.strictObject({
  month: z.union([hijriMonth, z.array(hijriMonth).min(1)]).optional(),
  excludeMonths: z.array(hijriMonth).optional(),
  day: z.union([day, z.enum(['last', 'second-last']), dayRange]).optional(),
});
const calendarFields = {
  weekday: z
    .array(z.enum(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']))
    .min(1)
    .optional(),
  hijri: hijriMatch.optional(),
  nextHijri: hijriMatch.optional(),
};
export const calendarSelector = z
  .strictObject(calendarFields)
  .refine(
    ({ weekday, hijri, nextHijri }) => Boolean(weekday || hijri || nextHijri),
    'Select a weekday or Hijri date',
  );
export const timingSelector = z.union([
  calendarSelector,
  z.strictObject({ weather: weatherKind }),
  z.strictObject({ eclipse: eclipseKind }),
]);

const duration = z.string().regex(/^\d{1,4}[mh]$/);
const offsets = {
  plus: duration.optional(),
  minus: duration.optional(),
};
type Offsets = { plus?: string; minus?: string };
type PrayerPoint = Offsets & {
  prayer: z.infer<typeof prayerAnchor>;
  day?: number;
};
type EventPoint = Offsets & { event: 'start' | 'end' };

export type TimePoint =
  | PrayerPoint
  | EventPoint
  | { latest: [TimePoint, TimePoint] }
  | { earliest: [TimePoint, TimePoint] }
  | {
      if: z.infer<typeof calendarSelector>;
      then: TimePoint;
      otherwise: TimePoint;
    };

const oneOffset = ({ plus, minus }: Offsets) => !(plus && minus);
export const timePoint: z.ZodType<TimePoint> = z.lazy(() =>
  z.union([
    z
      .strictObject({
        prayer: prayerAnchor,
        day: z.int().min(-1).max(1).optional(),
        ...offsets,
      })
      .refine(oneOffset, 'Use either plus or minus'),
    z
      .strictObject({ event: z.enum(['start', 'end']), ...offsets })
      .refine(oneOffset, 'Use either plus or minus'),
    z.strictObject({ latest: z.tuple([timePoint, timePoint]) }),
    z.strictObject({ earliest: z.tuple([timePoint, timePoint]) }),
    z.strictObject({
      if: calendarSelector,
      then: timePoint,
      otherwise: timePoint,
    }),
  ]),
);

const window = z.union([
  z.enum(['fast', 'hijri-day', 'night', 'daytime']),
  z.strictObject({ from: timePoint, to: timePoint }),
]);
const startAnchor = z.enum([
  'time',
  'all-day',
  'morning',
  'before-fajr',
  'from-fajr',
  'after-fajr',
  'from-asr',
  'from-maghrib',
  'after-maghrib',
  'at-maghrib',
]);
const endAnchor = z.enum([
  'fajr',
  'sunrise',
  'dhuhr',
  'jumuah',
  'asr',
  'maghrib',
  'isha',
  'eid-prayer',
]);
const pushAnchor = z.enum([
  'after-isha',
  'morning',
  'before-maghrib',
  'at-maghrib',
  'midday',
  'afternoon',
  'after-fajr',
]);
const banner = z.strictObject({
  title: wording,
  body: wording.optional(),
  rank: z.int().min(1),
});

export const occurrenceSchema = z.strictObject({
  key: id.optional(),
  title: wording.optional(),
  short: wording.optional(),
  on: timingSelector,
  window,
  check: z.enum(['done', 'fast']).optional(),
  tickScope: z.enum(['date', 'hijri-month', 'hijri-year']).optional(),
  startAnchor: startAnchor.optional(),
  endAnchor: endAnchor.optional(),
  countdown: z.literal('jumuah').optional(),
  card: z.boolean().optional(),
  upcoming: z.boolean().optional(),
  coming: z.boolean().optional(),
  upcomingGroup: z
    .strictObject({ key: id, title: wording.optional() })
    .optional(),
  marker: z.literal('no-fasting').optional(),
  banner: banner.optional(),
  inlineDua: id.optional(),
  rules: z.array(contentRule).optional(),
  fast: z
    .strictObject({
      priority: z.int().min(1),
      also: wording.optional(),
      borrowPush: z.boolean().optional(),
    })
    .optional(),
  push: z
    .strictObject({
      key: id.optional(),
      on: calendarSelector.optional(),
      at: timePoint,
      title: wording,
      body: wording,
      anchor: pushAnchor.optional(),
      quiet: z.enum(['advance', 'delay', 'drop']).optional(),
      buttons: z
        .array(z.enum(['done', 'later']))
        .max(2)
        .optional(),
    })
    .optional(),
});

export type CalendarSelector = z.infer<typeof calendarSelector>;
export type TimingSelector = z.infer<typeof timingSelector>;
export type OccurrenceDefinition = z.infer<typeof occurrenceSchema>;
export type ContentRule = z.infer<typeof contentRule>;
export type HijriMonth = z.infer<typeof hijriMonth>;
export type WeatherKind = z.infer<typeof weatherKind>;
