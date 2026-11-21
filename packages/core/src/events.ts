import { isoAdd, localToMs, type CivilDate } from './civil';
import { eclipsesBetween, type VisibleEclipse } from './eclipses';
import type { ReminderState } from './rules';

const cache = new Map<string, VisibleEclipse[]>();

export function withEclipses(state: ReminderState, date: CivilDate, days: number): ReminderState {
  if (!state.catalog.some((entry) => entry.occurrences.some(({ on }) => 'eclipse' in on))) return state;
  const place = state.calendar.place;
  const key = JSON.stringify([date, days, place.latitude, place.longitude, place.timeZone]);
  let eclipses = cache.get(key);
  if (!eclipses) {
    const from = localToMs(isoAdd(date, -1), 0, place.timeZone);
    const to = localToMs(isoAdd(date, days), 0, place.timeZone);
    eclipses = eclipsesBetween(from, to, place);
    if (cache.size >= 8) {
      const first = cache.keys().next().value;
      if (first !== undefined) cache.delete(first);
    }
    cache.set(key, eclipses);
  }
  const events = new Map([...eclipses, ...(state.events ?? [])].map((event) => [event.id, event]));
  return { ...state, events: [...events.values()] };
}
