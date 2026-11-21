import { afterEach, expect, it, vi } from 'vitest';

import { runMinuteClock } from './minute-clock';

afterEach(() => vi.useRealTimers());

it('publishes immediately and then at wall-clock minute boundaries', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-12-18T11:29:47.000Z'));
  const update = vi.fn();
  const stop = runMinuteClock(update);
  expect(update).toHaveBeenCalledWith(Date.parse('2026-12-18T11:29:47.000Z'));
  vi.advanceTimersByTime(12_999);
  expect(update).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(1);
  expect(update).toHaveBeenLastCalledWith(Date.parse('2026-12-18T11:30:00.000Z'));
  vi.advanceTimersByTime(60_000);
  expect(update).toHaveBeenLastCalledWith(Date.parse('2026-12-18T11:31:00.000Z'));
  stop();
  vi.advanceTimersByTime(120_000);
  expect(update).toHaveBeenCalledTimes(3);
});
