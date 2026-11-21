import { dayDiff, isoAdd, paused, type CivilDate } from '@adwam/core';

import type { Settings } from '../state/schema';

export const pauseDurations = [3, 7, 14, 0] as const;
export type PauseDays = (typeof pauseDurations)[number];

export function pauseFor(today: CivilDate, days: PauseDays) {
  return days ? { days, until: isoAdd(today, days - 1) } : { until: null };
}

export function activePauseDuration(pause: Settings['reminders']['pause'], today: CivilDate) {
  if (!pause || !paused(pause, today)) return undefined;
  return pause.until ? pause.days ?? dayDiff(pause.until, today) + 1 : 0;
}
