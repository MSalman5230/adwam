import { z } from 'zod';

const minute = z.int().min(0).max(1439);
const choice = z.enum(['off', 'inapp', 'push']);
const answer = z.enum(['yes', 'no']);
const date = z.iso.date() as z.ZodType<`${number}-${number}-${number}`>;
const channels = z.object({
  weekly: z.boolean().optional(), monthly: z.boolean().optional(),
  yearly: z.boolean().optional(), weather: z.boolean().optional(), disputed: z.boolean().optional(),
});
const corrections = z.array(z.object({
  id: z.string().min(1).optional(), year: z.int().positive(), month: z.int().min(1).max(12),
  start: date, withdrawn: z.boolean().optional(),
}));
const correctionOffer = corrections.element.omit({ withdrawn: true }).extend({
  id: z.string().min(1), countryCode: z.string().regex(/^[A-Z]{2}$/), region: z.string().min(1),
});

export const locationSchema = z.object({
  source: z.enum(['current', 'city']),
  name: z.string().min(1), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180),
  countryCode: z.string().regex(/^[A-Z]{2}$/), timeZone: z.string().min(1),
});

export const prayerMethods = [
  'mwl', 'isna', 'egypt', 'makkah', 'karachi', 'turkey', 'singapore', 'dubai', 'kuwait', 'qatar', 'moonsighting',
] as const;
const prayer = z.object({
  method: z.enum(prayerMethods), asr: z.enum(['standard', 'hanafi']),
  jumuah: z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('dhuhr') }),
    z.object({ mode: z.literal('fixed'), minutes: minute }),
  ]),
});

const reminderPreferences = z.object({
  choice: z.record(z.string(), choice).default({}),
  groupOn: channels.default({ weekly: true, monthly: true, yearly: true, weather: true }),
  udhiyah: z.record(z.string().regex(/^\d{4,}$/), answer.nullable()).default({}),
  pause: z.object({
    until: date.nullable().optional(),
    days: z.union([z.literal(3), z.literal(7), z.literal(14)]).optional(),
  }).nullable().default(null),
  notifications: z.enum(['unset', 'denied', 'granted']).default('unset'),
  channels: channels.default({ weekly: true, monthly: true, yearly: true, weather: true }),
  quietHours: z.object({ start: minute, end: minute }).default({ start: 22 * 60, end: 7 * 60 }),
  eclipseQuiet: z.boolean().default(false),
});

export const settingsSchema = z.object({
  setupDone: z.boolean().default(false),
  appearance: z.enum(['system', 'light', 'dark']).default('system'),
  location: locationSchema.nullable().default(null),
  prayer: prayer.default({ method: 'mwl', asr: 'standard', jumuah: { mode: 'dhuhr' } }),
  hijri: z.object({
    method: z.enum(['umalqura', 'civil']).default('umalqura'),
    shift: z.union([z.literal(-1), z.literal(0), z.literal(1)]).default(0),
    corrections: corrections.default([]),
  }).prefault({}),
  reminders: reminderPreferences.prefault({}),
  correctionChoices: z.record(z.string(), z.enum(['accepted', 'declined'])).default({}),
  usageStats: z.boolean().default(false),
  usagePrompt: z.boolean().default(false),
  crashReports: z.boolean().default(true),
});

export const trackersSchema = z.object({
  done: z.record(z.string(), z.boolean()).default({}),
  fastLog: z.record(date, z.boolean()).default({}),
  makeup: z.int().nonnegative().nullable().default(null),
});

export const serverConfigSchema = z.object({
  minAppVersion: z.string().regex(/^\d+\.\d+\.\d+(?:[-+][\w.+-]+)?$/),
  weatherEnabled: z.boolean(), debugToolsEnabled: z.boolean(),
});

export const weatherEventSchema = z.object({
  id: z.string(), start: z.number().finite(), end: z.number().finite(),
  weather: z.enum(['rain-start', 'rain-stop', 'heavy-rain', 'thunder', 'wind']),
  pushAt: z.number().finite().optional(),
});

export const serverCorrectionSchema = correctionOffer.omit({ region: true }).extend({ withdrawn: z.boolean() });

export const serverCacheSchema = z.object({
  lastSyncedAt: z.number().finite().nullable().default(null),
  config: serverConfigSchema.nullable().default(null),
  areaId: z.string().nullable().default(null),
  events: z.array(weatherEventSchema).default([]),
  corrections: corrections.default([]),
  correctionOffer: correctionOffer.nullable().default(null),
});

export type Settings = z.infer<typeof settingsSchema>;
export type Trackers = z.infer<typeof trackersSchema>;
export type ServerCache = z.infer<typeof serverCacheSchema>;
export type CorrectionOffer = z.infer<typeof correctionOffer>;
export const defaultSettings = () => settingsSchema.parse({});
export const defaultTrackers = () => trackersSchema.parse({});
export const defaultServerCache = () => serverCacheSchema.parse({});
