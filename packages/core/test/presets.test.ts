import { expect, it } from 'vitest';

import { checkedContent } from '../../content/scripts/check.ts';
import { applyPreset, presetOf, pushEstimate } from '../src/presets';
import type { ReminderState } from '../src/rules';

const { sunnahs } = await checkedContent();
const state: ReminderState = {
  calendar: {
    place: { latitude: 51.5074, longitude: -0.1278, timeZone: 'Europe/London', countryCode: 'GB' },
    prayer: { method: 'mwl', asr: 'standard' },
    hijri: { method: 'umalqura' },
  },
  catalog: sunnahs,
  preferences: { notifications: 'denied' },
};

it('estimates the configured push frequency and counts Friday only once', () => {
  const year = 1448;
  const preferences = { udhiyah: { [year]: 'yes' } } as const;
  const recommended = { ...state, preferences };
  expect(pushEstimate(recommended, year)).toEqual({ weekly: 4, monthly: 1, yearly: 12, weather: true, none: false });
  expect(pushEstimate(recommended, year + 1).yearly).toBe(11);
  expect(pushEstimate({ ...state, preferences: { choice: { 'friday-prep': 'off' } } }, year).weekly).toBe(4);
  expect(pushEstimate({ ...state, preferences: { choice: { 'friday-prep': 'off', kahf: 'inapp' } } }, year).weekly).toBe(3);
});

it('identifies each preset and resets only reminder choices and groups when applied', () => {
  expect(presetOf(state)).toBe('recommended');
  const custom: ReminderState = {
    ...state,
    preferences: { ...state.preferences, choice: { shaban15: 'inapp' }, groupOn: { yearly: false }, pause: {} },
  };
  expect(presetOf(custom)).toBe('custom');
  expect(presetOf({ ...state, preferences: { choice: { shaban15: 'inapp' } } })).toBe('custom');
  const inapp = { ...custom, preferences: applyPreset(custom, 'inapp') };
  expect(presetOf(inapp)).toBe('inapp');
  expect(inapp.preferences).toMatchObject({ notifications: 'denied', pause: {} });
  expect(pushEstimate(inapp, 1448)).toEqual({ weekly: 0, monthly: 0, yearly: 0, weather: false, none: true });
  expect(presetOf({ ...inapp, preferences: applyPreset(inapp, 'recommended') })).toBe('recommended');
});
