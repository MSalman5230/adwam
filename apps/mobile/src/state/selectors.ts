import type { GroupedSunnah } from '@adwam/content/schema';
import { detailState, todayState, upcomingRows, weatherArea, type CivilDate, type ReminderState, type UpcomingFilter } from '@adwam/core';

import type { CorrectionOffer, ServerCache, Settings, Trackers } from './schema';

function memoizeLast<Args extends unknown[], Result>(compute: (...args: Args) => Result) {
  let previous: { args: Args; result: Result } | undefined;
  return (...args: Args): Result => {
    if (previous && args.every((arg, index) => Object.is(arg, previous?.args[index]))) return previous.result;
    const result = compute(...args);
    previous = { args, result };
    return result;
  };
}

export const selectReminderState = memoizeLast((
  settings: Settings,
  trackers: Trackers,
  cache: ServerCache,
  catalog: readonly GroupedSunnah[],
): ReminderState | undefined => {
  const { location, prayer, hijri, reminders } = settings;
  if (!location) return;
  return {
    calendar: { place: location, prayer, hijri },
    preferences: reminders,
    tracking: { done: trackers.done, fastLog: trackers.fastLog, makeup: trackers.makeup ?? undefined },
    events: !cache.areaId || cache.areaId === weatherArea(location).id ? cache.events : [],
    catalog,
  };
});

export const selectToday = memoizeLast((now: number, state: ReminderState, settings: Settings, correction?: CorrectionOffer) => todayState(now, state, {
  correction,
  correctionChoices: settings.correctionChoices,
  usagePrompt: settings.usagePrompt,
}));

export const selectUpcoming = memoizeLast((now: number, state: ReminderState, filter: UpcomingFilter) => upcomingRows(now, state, filter));

export const selectDetail = memoizeLast((
  now: number, state: ReminderState, item: string, date?: CivilDate, occurrenceKey?: string,
) => detailState(now, state, { item, date, occurrenceKey }));
