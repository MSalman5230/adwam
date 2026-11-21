import { expect, it } from 'vitest';

import { createMomentSession } from './moment-session';
import { createClockStore } from './stores';

it('sets the Friday rain, done tick and fixed prayer time in a fresh session', () => {
  const moment = createMomentSession('fri-pm', 900_000);
  const { settings, trackers, serverCache } = moment.stores;
  expect(settings.getState().value.location).toMatchObject({ name: 'London', timeZone: 'Europe/London' });
  expect(settings.getState().value.prayer.jumuah).toEqual({ mode: 'fixed', minutes: 810 });
  expect(trackers.getState().value.done).toEqual({ 'kahf:2026-12-17': true });
  expect(serverCache.getState().value.events).toMatchObject([{ weather: 'rain-start', start: 420_000 }]);
});

it('keeps tracker edits inside the selected session and clears it with the override', () => {
  const clock = createClockStore(100);
  const moment = createMomentSession('white', 800);
  moment.stores.trackers.getState().update((value) => ({ ...value, fastLog: { ...value.fastLog, '2026-12-22': true } }));
  expect(createMomentSession('white', 800).stores.trackers.getState().value.fastLog).toEqual({ '2026-12-14': true });
  clock.getState().setOverride(800, moment);
  expect(clock.getState()).toMatchObject({ now: 100, override: 800, moment });
  clock.getState().setOverride(null);
  expect(clock.getState()).toMatchObject({ now: 100, override: null, moment: null });
});
