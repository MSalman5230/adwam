import { describe, expect, it } from 'vitest';

import { checkedContent } from '../../content/scripts/check.ts';
import { isoAdd } from '../src/civil';
import { hijriMonthStart } from '../src/hijri';
import {
  isDone,
  level,
  paused,
  pushAllowed,
  reminderOccurrences,
  visible,
  type ReminderPreferences,
  type ReminderState,
} from '../src/rules';

const { sunnahs } = await checkedContent();
const year = 1448;
const withPreferences = (preferences: ReminderPreferences = {}): ReminderState => ({
  calendar: {
    place: { latitude: 51.5074, longitude: -0.1278, timeZone: 'Europe/London', countryCode: 'GB' },
    prayer: { method: 'mwl', asr: 'standard' },
    hijri: { method: 'umalqura' },
  },
  catalog: sunnahs,
  preferences,
});

describe('reminder level', () => {
  it('uses choice, default, tier and group switches, and caps an in-app item', () => {
    const state = withPreferences();
    expect(level(state, 'unknown', year)).toBe('off');
    expect(level(state, 'friday-prep', year)).toBe('push');
    expect(level(state, 'after-jumuah', year)).toBe('inapp');
    expect(level(withPreferences({ choice: { 'after-jumuah': 'push' } }), 'after-jumuah', year)).toBe('inapp');
    expect(level(withPreferences({ choice: { 'friday-prep': 'inapp' } }), 'friday-prep', year)).toBe('inapp');
    expect(level(withPreferences({ groupOn: { weekly: false } }), 'friday-prep', year)).toBe('off');
  });

  it('keeps disputed items off by default and allows opt-in without a group switch', () => {
    expect(level(withPreferences(), 'shaban15', year)).toBe('off');
    const state = withPreferences({ groupOn: { disputed: false }, choice: { shaban15: 'inapp' } });
    expect(level(state, 'shaban15', year)).toBe('inapp');
  });

  it('uses the sacrifice answer for the occurrence year', () => {
    const state = withPreferences({ udhiyah: { [year]: 'yes', [year + 1]: 'no' } });
    expect(level(state, 'hair-nails', year - 1)).toBe('off');
    expect(level(state, 'hair-nails', year)).toBe('push');
    expect(level(state, 'hair-nails', year + 1)).toBe('off');
    expect(level(withPreferences({ udhiyah: { [year]: 'yes' }, groupOn: { yearly: false } }), 'hair-nails', year)).toBe('off');
  });

  it('keeps the make-up tracker in-app when either season is enabled', () => {
    expect(level(withPreferences({ choice: { shawwal6: 'off' } }), 'makeup', year)).toBe('inapp');
    expect(level(withPreferences({ choice: { shaban: 'off' } }), 'makeup', year)).toBe('inapp');
    expect(level(withPreferences({ choice: { shaban: 'off', shawwal6: 'off' } }), 'makeup', year)).toBe('off');
    expect(level(withPreferences({ groupOn: { yearly: false } }), 'makeup', year)).toBe('off');
  });
});

describe('reminder visibility and push eligibility', () => {
  const monday = '2027-03-29';
  const state = withPreferences({ notifications: 'granted' });
  const fast = reminderOccurrences(monday, state).find(({ definition }) => definition.check === 'fast')!;

  it('checks the channel and reminder that supplied a borrowed push', () => {
    expect(fast.entry.id).toBe('shawwal6');
    expect(fast.push?.item).toBe('monthu');
    expect(pushAllowed(fast, state)).toBe(true);
    expect(pushAllowed(fast, withPreferences({ notifications: 'granted', channels: { weekly: false } }))).toBe(false);
    expect(pushAllowed(fast, withPreferences({ notifications: 'granted', choice: { monthu: 'inapp' } }))).toBe(false);
    expect(pushAllowed(fast, withPreferences({ notifications: 'denied' }))).toBe(false);
  });

  it('pauses fasting through the last date and preserves other reminders', () => {
    const pause = { until: monday } as const;
    expect(paused(undefined, monday)).toBe(false);
    expect(paused({}, monday)).toBe(true);
    expect(paused(pause, monday)).toBe(true);
    expect(paused(pause, isoAdd(monday, 1))).toBe(false);

    const onPause = withPreferences({ notifications: 'granted', pause });
    expect(visible(fast, onPause)).toBe(false);
    expect(pushAllowed(fast, onPause)).toBe(false);
    const friday = reminderOccurrences('2027-03-26', onPause).find(({ entry }) => entry.id === 'friday-prep')!;
    expect(visible(friday, onPause)).toBe(true);
    expect(pushAllowed(friday, onPause)).toBe(true);
    expect(isDone(friday, { done: { [friday.tickKey]: true } })).toBe(true);
    expect(isDone(fast, { fastLog: { [monday]: true } })).toBe(true);
  });

  it('keeps marker-only cards in upcoming data and shows the Eid card', () => {
    const eidDate = isoAdd(hijriMonthStart(year, 12, state.calendar.hijri), 9);
    const eid = reminderOccurrences(eidDate, state).find(({ entry }) => entry.id === 'eid-adha')!;
    const marker = reminderOccurrences(isoAdd(eidDate, 1), state).find(({ definition }) => definition.marker)!;
    expect(eid.definition.marker).toBe('no-fasting');
    expect(visible(eid, state)).toBe(true);
    expect(visible(marker, state)).toBe(false);
  });
});
