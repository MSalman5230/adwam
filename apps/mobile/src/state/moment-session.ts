import type { CivilDate } from '@adwam/core';

import type { DebugMoment } from './moments';
import type { CorrectionOffer, Settings } from './schema';
import { createSavedStores, type MomentSession } from './stores';

export const momentTimeZone = 'Europe/London';
const london: NonNullable<Settings['location']> = {
  source: 'city', name: 'London', countryCode: 'GB', latitude: 51.5074, longitude: -0.1278, timeZone: momentTimeZone,
};
const correctionOffer: CorrectionOffer = {
  id: 'moment-gb-1448-9', countryCode: 'GB', region: 'the United Kingdom', year: 1448, month: 9, start: '2027-02-07',
};
const fastDates: Partial<Record<DebugMoment['id'], CivilDate[]>> = {
  white: ['2026-12-14'], shawwal: ['2027-03-15', '2027-03-18', '2027-03-22'], dq: ['2027-04-20', '2027-04-21'],
};

export function createMomentSession(id: DebugMoment['id'], now: number): MomentSession {
  const memory = new Map<string, string>();
  const stores = createSavedStores({
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => { memory.set(key, value); },
    removeItem: (key) => { memory.delete(key); },
  });
  stores.settings.getState().update((value) => ({
    ...value,
    setupDone: true,
    location: london,
    prayer: { ...value.prayer, jumuah: { mode: 'fixed', minutes: 13 * 60 + 30 } },
    reminders: { ...value.reminders, notifications: id === 'shaban' ? 'denied' : 'granted' },
  }));
  const rain = id === 'fri-pm';
  const done: Record<string, boolean> = rain ? { 'kahf:2026-12-17': true } : {};
  stores.trackers.getState().update((value) => ({
    ...value,
    makeup: 3,
    done,
    fastLog: Object.fromEntries((fastDates[id] ?? []).map((date) => [date, true])),
  }));
  const start = now - 8 * 60_000;
  stores.serverCache.getState().update((value) => ({
    ...value,
    events: rain ? [{ id: `moment-rain-${start}`, start, end: start + 3 * 60 * 60_000, weather: 'rain-start', pushAt: start }] : [],
    correctionOffer: id === 'correction' || id === 'shaban' ? correctionOffer : null,
  }));
  return { id, stores };
}
