import { isoAdd, type CivilDate } from '@adwam/core';

export const pauseDurations = [3, 7, 14, 0] as const;

export function pauseFor(today: CivilDate, days: (typeof pauseDurations)[number]) {
  return days ? { days, until: isoAdd(today, days - 1) } : { until: null };
}
