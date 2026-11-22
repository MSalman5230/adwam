import { expect, it } from 'vitest';

import fixture from './fixtures/settings-v1.json';
import { createClockStore, createSavedStores } from './stores';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  };
}

it('loads and migrates a version-one backup before the first read', () => {
  const storage = memoryStorage();
  storage.setItem('settings', JSON.stringify(fixture));

  const { settings } = createSavedStores(storage);
  expect(settings.persist.hasHydrated()).toBe(true);
  expect(settings.getState().value).toMatchObject({
    setupDone: true, appearance: 'dark', location: { name: 'London' }, crashReports: false,
    prayer: { jumuah: { mode: 'dhuhr' } },
    reminders: { choice: { kahf: 'inapp' }, udhiyah: { 1448: 'yes' }, notifications: 'unset' },
  });
  expect(settings.getState().value.reminders.udhiyah[1449]).toBeUndefined();
  expect(JSON.parse(storage.getItem('settings') ?? '').version).toBe(2);
});

it('retains device choices and trackers across a store restart', () => {
  const storage = memoryStorage();
  const { settings, trackers, serverCache } = createSavedStores(storage);
  expect(trackers.getState().value.makeup).toBeNull();
  expect(serverCache.getState().value.events).toEqual([]);

  settings.getState().update((previous) => ({ ...previous, appearance: 'light' }));
  trackers.getState().update((previous) => ({
    ...previous, done: { 'kahf:2026-12-17': true }, fastLog: { '2026-12-17': true }, makeup: 0,
  }));
  const restarted = createSavedStores(storage);
  expect(restarted.settings.getState().value.appearance).toBe('light');
  expect(restarted.trackers.getState().value).toEqual({
    done: { 'kahf:2026-12-17': true }, fastLog: { '2026-12-17': true }, makeup: 0,
  });
});

it('uses fresh defaults for malformed settings without affecting the tracker store', () => {
  const storage = memoryStorage();
  const before = createSavedStores(storage);
  before.trackers.getState().update((previous) => ({ ...previous, makeup: 2 }));
  storage.setItem('settings', JSON.stringify({ state: { value: { appearance: 'invalid' } }, version: 2 }));
  const { settings, trackers } = createSavedStores(storage);
  expect(settings.getState().value).toMatchObject({ appearance: 'system', location: null, usageStats: false });
  expect(trackers.getState().value.makeup).toBe(2);
});

it('recovers valid tracker entries from a partly damaged snapshot', () => {
  const storage = memoryStorage();
  storage.setItem('trackers', JSON.stringify({ state: { value: {
    done: { 'kahf:2026-12-17': true, 'bad-value': 'true' },
    fastLog: { '2026-12-17': true, '2026-12-18': false, invalid: true },
    makeup: -3,
  } }, version: 1 }));
  const { trackers } = createSavedStores(storage);
  expect(trackers.getState().value).toEqual({
    done: { 'kahf:2026-12-17': true },
    fastLog: { '2026-12-17': true, '2026-12-18': false },
    makeup: null,
  });
});

it('retains a valid make-up count when the fast log is damaged', () => {
  const storage = memoryStorage();
  storage.setItem('trackers', JSON.stringify({ state: { value: { fastLog: null, makeup: 3 } }, version: 1 }));
  const { trackers } = createSavedStores(storage);
  expect(trackers.getState().value).toEqual({ done: {}, fastLog: {}, makeup: 3 });
});

it('keeps the clock in memory', () => {
  const clock = createClockStore(0);
  clock.getState().setOverride(120_000);
  clock.getState().setNow(60_000);
  expect(clock.getState().now).toBe(60_000);
  expect(clock.getState().override).toBe(120_000);
  expect(createClockStore(0).getState()).toMatchObject({ now: 0, override: null });
});
