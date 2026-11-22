import { hijriMonthStart, serverNotificationKind } from '../_shared/core.mjs';
import catalog from '../_shared/content.json' with { type: 'json' };
import messages from '../_shared/messages/en.json' with { type: 'json' };
import type { PushMessage } from '../_lib/expo-push.ts';

export type QueuedPush = {
  id: string;
  token: string;
  channel: PushMessage['channelId'];
  attempts: number;
  weather: string | null;
  weatherEnd: string | null;
  correctionId: string | null;
  country: string | null;
  year: number | null;
  month: number | null;
  announced: string | null;
  method: 'civil' | 'umalqura';
  shift: number;
};

const region = new Intl.DisplayNames(['en'], { type: 'region' });
const weekdays = new Intl.DateTimeFormat('en', { weekday: 'long', timeZone: 'UTC' });

export function pushMessage(row: QueuedPush): PushMessage | undefined {
  const base = {
    to: row.token, channelId: row.channel, priority: 'high' as const,
    sound: row.channel === 'corrections-silent' ? null : 'default' as const,
  };
  if (row.weather && row.weatherEnd) {
    for (const sunnah of catalog.sunnahs) {
      const rule = sunnah.occurrences.find((item) => 'push' in item && 'weather' in item.on && item.on.weather === row.weather);
      if (rule && 'push' in rule && rule.push) {
        return { ...base, title: rule.push.title, body: rule.push.body, expiration: Math.floor(Date.parse(row.weatherEnd) / 1000),
          data: { kind: serverNotificationKind, link: `/item/${sunnah.id}` } };
      }
    }
    return;
  }
  if (!row.correctionId || !row.country || !row.year || !row.month || !row.announced) return;
  const month = messages.calendar.month[String(row.month) as keyof typeof messages.calendar.month];
  const calculated = hijriMonthStart(row.year, row.month, { method: row.method, shift: row.shift });
  if (!month || calculated === row.announced) return;
  const values = {
    month,
    announced: weekdays.format(new Date(row.announced)),
    calculated: weekdays.format(new Date(calculated)),
    region: region.of(row.country) ?? row.country,
  };
  const wording = messages.today.notice.correction;
  const body = wording.body.replace(/{{(month|announced|calculated|region)(?:, \w+)?}}/g,
    (_, name: keyof typeof values) => values[name]);
  return { ...base, title: wording.title, body, data: { kind: serverNotificationKind, link: '/today' } };
}
