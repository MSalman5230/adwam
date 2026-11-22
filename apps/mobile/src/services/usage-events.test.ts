import catalog from '@adwam/content/catalog';
import { expect, it, vi } from 'vitest';

import { usageProperties } from './usage-events';

vi.mock('@adwam/content/catalog', () => ({
  default: { version: '2026.11.21', sunnahs: [{ id: 'kahf' }, { id: 'hidden-item', hidden: true }] },
}));

const context = {
  app_version: '0.1.0', content_version: catalog.version, platform: 'android', country: 'GB',
} as const;

it('retains only allowed fields after the SDK decorates an event', () => {
  const unsafe = {
    ...context, item: 'kahf', level: 'off',
    ip: '192.0.2.1', $ip: '192.0.2.1', latitude: 51.5, longitude: -0.12,
    city: 'London', timeZone: 'Europe/London', install_id: 'install', device_id: 'device',
    $device_id: 'sdk-device', $session_id: 'sdk-session', $device_model: 'model',
    tick: 'done', fastLog: ['2026-11-21'], makeup: 3, pause: 7, udhiyah: 'yes',
    $set: { email: 'tester@example.com' }, description: 'Report text',
    $geoip_disable: false, $process_person_profile: true,
  };
  expect(usageProperties('reminder_level_changed', unsafe)).toEqual({
    ...context, item: 'kahf', level: 'off', $geoip_disable: true, $process_person_profile: false,
  });
});

it.each(['tick', 'fast_logged', 'makeup_changed', 'pause_changed', 'udhiyah_answered', '$autocapture', '$exception'])(
  'rejects unlisted event %s',
  (event) => expect(usageProperties(event, context)).toBeUndefined(),
);

it('rejects raw navigation parameters, completion buttons, and unlisted item values', () => {
  expect(usageProperties('$screen', { ...context, $screen_name: 'item/kahf?date=2026-11-22' })).toBeUndefined();
  expect(usageProperties('notification_opened', { ...context, item: 'kahf', button: 'done' })).toBeUndefined();
  expect(usageProperties('report_opened', { ...context, item: 'kahf-2026-11-22' })).toBeUndefined();
  expect(usageProperties('report_opened', { ...context, item: 'hidden-item' })).toBeUndefined();
  expect(usageProperties('report_opened', { item: 'kahf' })).toBeUndefined();
});
