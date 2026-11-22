import catalog from '@adwam/content/catalog';
import { expect, test } from 'vitest';

import { defaultSettings, type Settings } from '../state/schema';
import { installSyncPayload, needsServerUpdate } from './server-sync-payload';

const settings: Settings = {
  ...defaultSettings(), setupDone: true,
  location: { source: 'current', name: 'London', latitude: 51.5072, longitude: -0.1276, countryCode: 'GB', timeZone: 'Europe/London' },
};
const versions = { app: '0.1.0', content: catalog.version };

test('install sync sends the 0.1 degree grid and the defined server fields', () => {
  expect(installSyncPayload(settings, catalog.sunnahs, versions, 'android')).toEqual({
    platform: 'android', appVersion: '0.1.0', contentVersion: catalog.version, countryCode: 'GB', timeZone: 'Europe/London',
    quietStart: 1320, quietEnd: 420, hijriMethod: 'umalqura', hijriShift: 0, notificationsAllowed: false,
    area: { id: '515:-1', latitude: 51.5, longitude: -0.1 },
    weatherChoices: { 'rain-start': 'push', 'rain-stop': 'inapp', 'heavy-rain': 'push', thunder: 'inapp', wind: 'push' },
  });
});

test('weather channel blocking keeps cards and disabling the group removes the grid', () => {
  const reminders = { ...settings.reminders, notifications: 'granted' as const, channels: { weather: false } };
  expect(installSyncPayload({ ...settings, reminders }, catalog.sunnahs, versions, 'android')).toMatchObject({
    notificationsAllowed: true, weatherChoices: { 'rain-start': 'inapp' }, area: { id: '515:-1' },
  });
  expect(installSyncPayload({ ...settings, reminders: { ...reminders, groupOn: { weather: false } } },
    catalog.sunnahs, versions, 'android')).toMatchObject({ area: null, weatherChoices: { 'rain-start': 'off', wind: 'off' } });
});

test('the minimum compares numeric components and prerelease versions', () => {
  expect(needsServerUpdate('0.9.8', '0.10.0')).toBe(true);
  expect(needsServerUpdate('1.0.0-rc.1', '1.0.0')).toBe(true);
  expect(needsServerUpdate('1.0.0+42', '1.0.0')).toBe(false);
});
