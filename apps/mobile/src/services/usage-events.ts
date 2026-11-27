import catalog from '@adwam/content/catalog';
import { z } from 'zod';

import { reminderCatalog } from '../state/reminder-catalog';
import { setupUsageSchema } from '../state/schema';

const itemIds = new Set(reminderCatalog.filter(({ hidden }) => !hidden).map(({ id }) => id));
const item = z.string().refine((id) => itemIds.has(id));
const notificationItem = z.union([item, z.enum(['friday-summary', 'date-correction'])]);

const screens = z.enum(['setup', 'today', 'upcoming', 'settings', 'reminders', 'detail', 'about']);
export type UsageScreen = z.infer<typeof screens>;

const events = z.discriminatedUnion('event', [
  z.object({ event: z.literal('setup_completed'), properties: setupUsageSchema }),
  z.object({ event: z.literal('reminder_level_changed'), properties: z.object({ item, level: z.enum(['off', 'inapp', 'push']) }) }),
  z.object({ event: z.literal('preset_applied'), properties: z.object({}) }),
  z.object({ event: z.literal('notification_opened'), properties: z.object({ item: notificationItem, button: z.literal('open') }) }),
  z.object({ event: z.literal('correction_answered'), properties: z.object({ answer: z.enum(['used', 'kept']) }) }),
  z.object({ event: z.literal('report_opened'), properties: z.object({ item }) }),
  z.object({ event: z.literal('$screen'), properties: z.object({ $screen_name: screens }) }),
]);
export type UsageEvent = z.infer<typeof events>;

const context = z.object({
  app_version: z.string().regex(/^\d+\.\d+\.\d+(?:[-+][\w.+-]+)?$/),
  content_version: z.literal(catalog.version),
  platform: z.enum(['android', 'ios']),
  country: z.string().regex(/^(?:[A-Z]{2}|unknown)$/),
});

export function usageProperties(event: string, properties: unknown) {
  const accepted = events.safeParse({ event, properties });
  const metadata = context.safeParse(properties);
  if (!accepted.success || !metadata.success) return;
  return {
    ...accepted.data.properties, ...metadata.data,
    $geoip_disable: true, $process_person_profile: false,
  };
}
