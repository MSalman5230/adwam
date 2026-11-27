import type { GroupedSunnah, OccurrenceDefinition, TimePoint } from '@adwam/content/schema';

/** The reminder's ID, saved in users' choices, tick keys and notification IDs. It can't change. */
export const prayerReminderId = 'prayers';
/** The five prayers, in the order they fall. Each is an occurrence key, so none can change. */
export const reminderPrayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type ReminderPrayer = (typeof reminderPrayers)[number];

export type PrayerReminderCopy = Readonly<{
  title: string;
  short: string;
  what: readonly string[];
  when: string;
  pushNote: string;
  prayers: Readonly<Record<ReminderPrayer, Readonly<{ title: string; pushTitle: string; pushBody: string }>>>;
}>;

/** Each prayer's card stays on Today until the next prayer time, or until sunrise for Fajr. */
const ends = {
  fajr: { at: { prayer: 'sunrise' }, anchor: 'sunrise' },
  dhuhr: { at: { prayer: 'asr' }, anchor: 'asr' },
  asr: { at: { prayer: 'maghrib' }, anchor: 'maghrib' },
  maghrib: { at: { prayer: 'isha' }, anchor: 'isha' },
  isha: { at: { prayer: 'fajr', day: 1 }, anchor: 'fajr' },
} as const satisfies Record<ReminderPrayer, { at: TimePoint; anchor: OccurrenceDefinition['endAnchor'] }>;

/**
 * The prayer-time reminder: a card on Today from each prayer time, with a Done tick,
 * and a push as it begins. Its times follow the place and prayer settings, so changing
 * the calculation method moves every card and push with it. It is off until the user
 * chooses a level, in setup or in Reminders.
 */
export function prayerReminder(copy: PrayerReminderCopy): GroupedSunnah {
  return {
    id: prayerReminderId,
    group: 'daily',
    status: 'published',
    tier: 'push',
    default: 'off',
    title: copy.title,
    short: copy.short,
    what: [...copy.what],
    when: copy.when,
    pushNote: copy.pushNote,
    evidence: [],
    duas: [],
    occurrences: reminderPrayers.map((prayer): OccurrenceDefinition => ({
      key: prayer,
      title: copy.prayers[prayer].title,
      on: { weekday: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] },
      window: { from: { prayer }, to: ends[prayer].at },
      check: 'done',
      startAnchor: 'time',
      endAnchor: ends[prayer].anchor,
      coming: false,
      upcoming: false,
      push: {
        at: { prayer },
        title: copy.prayers[prayer].pushTitle,
        body: copy.prayers[prayer].pushBody,
      },
    })),
  };
}

export function isPrayerReminder(entry: Pick<GroupedSunnah, 'group'>): boolean {
  return entry.group === 'daily';
}
