import type { GroupedSunnah } from '@adwam/content/schema';
import { expect, test } from 'vitest';

import { defaultSettings, type Settings } from '../state/schema';
import { installSyncPayload, needsServerUpdate } from './server-sync-payload';

const settings: Settings = {
  ...defaultSettings(), setupDone: true,
  location: { source: 'current', name: 'London', latitude: 51.5072, longitude: -0.1276, countryCode: 'GB', timeZone: 'Europe/London' },
};
const fixtures: GroupedSunnah[] = [
  {
    id: 'rain', group: 'weather', tier: 'push', status: 'review', title: 'Rain', short: 'Rain', what: ['Rain'], when: 'Rain',
    evidence: [], duas: [], occurrences: [{ on: { weather: 'rain-start' }, window: { from: { event: 'start' }, to: { event: 'end' } } }],
  },
  {
    id: 'thunder', group: 'weather', tier: 'inapp', status: 'review', title: 'Thunder', short: 'Thunder',
    what: ['Thunder'], when: 'Thunder', evidence: [], duas: [],
    occurrences: [{ on: { weather: 'thunder' }, window: { from: { event: 'start' }, to: { event: 'end' } } }],
  },
];
const versions = { app: '0.1.0', content: '2026.11.21' };

test('install sync sends the 0.1 degree grid and the defined server fields', () => {
  expect(installSyncPayload(settings, fixtures, versions, 'android')).toEqual({
    platform: 'android', appVersion: '0.1.0', contentVersion: versions.content, countryCode: 'GB', timeZone: 'Europe/London',
    quietStart: 1320, quietEnd: 420, hijriMethod: 'umalqura', hijriShift: 0, notificationsAllowed: false,
    area: { id: '515:-1', latitude: 51.5, longitude: -0.1 },
    weatherChoices: { 'rain-start': 'push', thunder: 'inapp' },
  });
});

test('weather channel blocking keeps cards and disabling the group removes the grid', () => {
  const reminders = { ...settings.reminders, notifications: 'granted' as const, channels: { weather: false } };
  expect(installSyncPayload({ ...settings, reminders }, fixtures, versions, 'android')).toMatchObject({
    notificationsAllowed: true, weatherChoices: { 'rain-start': 'inapp' }, area: { id: '515:-1' },
  });
  expect(installSyncPayload({ ...settings, reminders: { ...reminders, groupOn: { weather: false } } },
    fixtures, versions, 'android')).toMatchObject({ area: null, weatherChoices: { 'rain-start': 'off', thunder: 'off' } });
});

test('the minimum compares numeric components and prerelease versions', () => {
  expect(needsServerUpdate('0.9.8', '0.10.0')).toBe(true);
  expect(needsServerUpdate('1.0.0-rc.1', '1.0.0')).toBe(true);
  expect(needsServerUpdate('1.0.0+42', '1.0.0')).toBe(false);
});
