import type { ContentGroup, GroupedSunnah } from '@adwam/content/schema';

import type { CivilDate } from './civil';
import type { DaySettings } from './day';
import type { QuietHours } from './quiet-hours';
import {
  occurrencesForDay,
  type Occurrence,
  type OccurrenceEvent,
  type ReminderLevel,
} from './occurrences';

export type FastingPause = Readonly<{ until?: CivilDate | null }>;
export type ReminderPreferences = Readonly<{
  choice?: Readonly<Record<string, ReminderLevel>>;
  groupOn?: Readonly<Partial<Record<ContentGroup, boolean>>>;
  udhiyah?: Readonly<Record<number, 'yes' | 'no' | null>>;
  pause?: FastingPause | null;
  notifications?: 'unset' | 'denied' | 'granted';
  channels?: Readonly<Partial<Record<ContentGroup, boolean>>>;
  quietHours?: QuietHours;
  eclipseQuiet?: boolean;
  /** Whether prayer-time pushes still arrive during quiet hours. On unless the user turns it off. */
  prayerQuiet?: boolean;
}>;
export type ReminderTracking = Readonly<{
  done?: Readonly<Record<string, boolean>>;
  fastLog?: Readonly<Record<CivilDate, boolean>>;
  makeup?: number;
}>;
export type ReminderState = Readonly<{
  calendar: DaySettings;
  catalog: readonly GroupedSunnah[];
  preferences: ReminderPreferences;
  tracking?: ReminderTracking;
  events?: readonly OccurrenceEvent[];
}>;

export function chosenLevel(entry: GroupedSunnah, preferences: ReminderPreferences): ReminderLevel {
  const choice = preferences.choice?.[entry.id] ?? entry.default ?? entry.tier;
  return choice === 'push' && entry.tier !== 'push' ? 'inapp' : choice;
}

function yearlyLevel(entry: GroupedSunnah | undefined, preferences: ReminderPreferences, year: number): ReminderLevel {
  if (!entry) return 'off';
  if (entry.group !== 'disputed' && preferences.groupOn?.[entry.group] === false) return 'off';
  if (entry.rules?.includes('requires-udhiyah') && preferences.udhiyah?.[year] !== 'yes') return 'off';
  return chosenLevel(entry, preferences);
}

export function level(state: ReminderState, id: string, hijriYear: number): ReminderLevel {
  const { catalog, preferences } = state;
  const entry = catalog.find((item) => item.id === id);
  if (entry?.rules?.includes('follow-makeup-season')) {
    const followsSeason = catalog.some((item) =>
      (item.id === 'shaban' || item.id === 'shawwal6') && yearlyLevel(item, preferences, hijriYear) !== 'off');
    return followsSeason ? 'inapp' : 'off';
  }
  return yearlyLevel(entry, preferences, hijriYear);
}

export function paused(pause: FastingPause | null | undefined, date: CivilDate): boolean {
  return Boolean(pause && (!pause.until || date <= pause.until));
}

function fastingOccurrence(occurrence: Occurrence): boolean {
  return occurrence.definition.check === 'fast' || occurrence.definition.fast !== undefined;
}

function requiresUdhiyah(occurrence: Occurrence, preferences: ReminderPreferences): boolean {
  return occurrence.rules.includes('requires-udhiyah') && preferences.udhiyah?.[occurrence.hijri.year] !== 'yes';
}

export function pushAllowed(occurrence: Occurrence, state: ReminderState, date = occurrence.date): boolean {
  const { push } = occurrence;
  const { preferences } = state;
  return Boolean(push && preferences.notifications === 'granted' &&
    preferences.channels?.[push.group] !== false &&
    level(state, push.item, occurrence.hijri.year) === 'push' &&
    !requiresUdhiyah(occurrence, preferences) &&
    !(fastingOccurrence(occurrence) && paused(preferences.pause, date)));
}

export function visible(occurrence: Occurrence, state: ReminderState, date = occurrence.date): boolean {
  return occurrence.definition.card !== false && occurrenceEnabled(occurrence, state) &&
    !(fastingOccurrence(occurrence) && paused(state.preferences.pause, date));
}

export function occurrenceEnabled(occurrence: Occurrence, state: ReminderState): boolean {
  return level(state, occurrence.entry.id, occurrence.hijri.year) !== 'off' &&
    !requiresUdhiyah(occurrence, state.preferences);
}

export function isDone(occurrence: Occurrence, tracking?: ReminderTracking): boolean {
  if (occurrence.definition.check === 'fast') return tracking?.fastLog?.[occurrence.date] === true;
  return occurrence.definition.check === 'done' && tracking?.done?.[occurrence.tickKey] === true;
}

export function reminderOccurrences(date: CivilDate, state: ReminderState): Occurrence[] {
  return occurrencesForDay(date, state.calendar, state.catalog, {
    level: (entry, year) => level(state, entry.id, year),
    events: state.events,
    fastLog: state.tracking?.fastLog,
    makeup: state.tracking?.makeup,
  });
}
