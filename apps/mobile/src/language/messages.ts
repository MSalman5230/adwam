import '@formatjs/intl-pluralrules/polyfill-force.js';
import '@formatjs/intl-pluralrules/locale-data/en.js';

import english from '@adwam/content/messages/en.json';
import { fmtClock, type MessageKey, type MessageParams, type Msg } from '@adwam/core';
import { createInstance } from 'i18next';

export type MessageFormat = { timeZone: string; uses24HourClock: boolean };

const defaults: MessageFormat = { timeZone: 'UTC', uses24HourClock: false };
const weekdays: Intl.DateTimeFormatOptions = { weekday: 'long', timeZone: 'UTC' };
const dates: Record<string, Intl.DateTimeFormatOptions> = {
  weekday: weekdays,
  shortWeekday: { weekday: 'short', timeZone: 'UTC' },
  shortMonth: { month: 'short', timeZone: 'UTC' },
  shortDayMonth: { day: 'numeric', month: 'short', timeZone: 'UTC' },
  shortDate: { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' },
  longDate: { ...weekdays, day: 'numeric', month: 'long' },
  dayMonth: { day: 'numeric', month: 'long', timeZone: 'UTC' },
  monthYear: { month: 'long', year: 'numeric', timeZone: 'UTC' },
};
const i18n = createInstance();
void i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: english } },
  initAsync: false,
  interpolation: { escapeValue: false },
});

const formatter = i18n.services.formatter;
formatter?.add('time', (value, _language, options) => {
  const zone = typeof options.timeZone === 'string' ? options.timeZone : defaults.timeZone;
  return typeof value === 'number' ? fmtClock(value, zone, options.uses24HourClock === true) : String(value);
});
formatter?.add('hijriMonth', (value) => english.calendar.month[value as keyof typeof english.calendar.month] ?? String(value));
formatter?.add('reminderGroup', (value) => english.reminders.group[value as keyof typeof english.reminders.group] ?? String(value));
formatter?.add('capitalize', (value) => typeof value === 'string' ? value.charAt(0).toUpperCase() + value.slice(1) : String(value));
for (const [name, options] of Object.entries(dates)) {
  formatter?.addCached(name, () => {
    const dateFormatter = new Intl.DateTimeFormat('en-GB', options);
    return (value: unknown) => typeof value === 'string'
      ? dateFormatter.format(new Date(`${value}T12:00:00Z`)).replace(',', '') : String(value);
  });
}

export function t(key: MessageKey, params?: MessageParams, format = defaults): string {
  const values = Object.fromEntries(Object.entries(params ?? {}).map(([key, value]) => [
    key, typeof value === 'object' ? renderMessage(value, format) : value,
  ]));
  return i18n.t(key, { ...values, ...format });
}

export function renderMessage(message: Msg, format = defaults): string {
  return t(message.key, message.params, format);
}
