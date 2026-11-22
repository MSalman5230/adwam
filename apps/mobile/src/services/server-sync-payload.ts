import type { GroupedSunnah } from '@adwam/content/schema';
import { chosenLevel, weatherArea, type ReminderLevel } from '@adwam/core';

import type { Settings } from '../state/schema';

export function installSyncPayload(
  settings: Settings,
  catalogue: readonly GroupedSunnah[],
  versions: { app: string; content: string },
  platform: 'android' | 'ios',
) {
  if (!settings.setupDone || !settings.location) return;
  const { location, reminders, hijri } = settings;
  const weatherOn = reminders.groupOn.weather !== false;
  const weatherChoices: Record<string, ReminderLevel> = {};
  for (const entry of catalogue) {
    if (entry.group !== 'weather') continue;
    for (const occurrence of entry.occurrences) {
      if (!('weather' in occurrence.on)) continue;
      const level = weatherOn ? chosenLevel(entry, reminders) : 'off';
      weatherChoices[occurrence.on.weather] = level === 'push' && reminders.channels.weather === false ? 'inapp' : level;
    }
  }
  const area = weatherOn ? weatherArea(location) : null;
  return {
    platform, appVersion: versions.app, contentVersion: versions.content,
    countryCode: location.countryCode, timeZone: location.timeZone,
    quietStart: reminders.quietHours.start, quietEnd: reminders.quietHours.end,
    weatherChoices, area, hijriMethod: hijri.method, hijriShift: hijri.shift,
    notificationsAllowed: reminders.notifications === 'granted',
  };
}

export function needsServerUpdate(version: string, minimum: string) {
  const versionParts = /^(\d+)\.(\d+)\.(\d+)(-[^+]+)?/.exec(version);
  const minimumParts = /^(\d+)\.(\d+)\.(\d+)(-[^+]+)?/.exec(minimum);
  if (!versionParts || !minimumParts) return false;
  for (let position = 1; position <= 3; position += 1) {
    const difference = Number(versionParts[position]) - Number(minimumParts[position]);
    if (difference) return difference < 0;
  }
  return Boolean(versionParts[4] && (!minimumParts[4] || versionParts[4].localeCompare(minimumParts[4], 'en', { numeric: true }) < 0));
}
