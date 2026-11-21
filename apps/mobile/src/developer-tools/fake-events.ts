import { effectiveHijri, hijriMonthStart, isoAdd, MINUTE_MS, type DaySettings } from '@adwam/core';

import type { CorrectionOffer, ServerCache } from '../state/schema';

const rainId = 'debug-rain';

export function simulateRain(now: number, cache: ServerCache): ServerCache {
  return {
    ...cache,
    events: [
      ...cache.events.filter((event) => event.id !== rainId),
      { id: rainId, weather: 'rain-start', start: now, end: now + 180 * MINUTE_MS },
    ],
  };
}

export function simulatedCorrection(now: number, calendar: DaySettings, region: string): CorrectionOffer {
  const current = effectiveHijri(now, calendar);
  const year = current.year + (current.month === 12 ? 1 : 0);
  const month = current.month % 12 + 1;
  return {
    id: `debug-${Date.now()}`, year, month, region, countryCode: calendar.place.countryCode,
    start: isoAdd(hijriMonthStart(year, month, calendar.hijri), 1),
  };
}
