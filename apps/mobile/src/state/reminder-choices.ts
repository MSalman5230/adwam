import type { GroupedSunnah } from '@adwam/content/schema';
import type { ReminderLevel } from '@adwam/core';

import type { Settings } from './schema';

export function setReminderChoice(settings: Settings, entry: GroupedSunnah, value: ReminderLevel): Settings {
  const { id, group, tier } = entry;
  if (entry.hidden || (value === 'push' && (tier !== 'push' || group === 'disputed'))) return settings;
  const { reminders } = settings;
  const choice = { ...reminders.choice };
  if (value === (entry.default ?? tier)) delete choice[id];
  else choice[id] = value;
  const groupOn = group !== 'disputed' && reminders.groupOn[group] === false
    ? { ...reminders.groupOn, [group]: true }
    : reminders.groupOn;
  return { ...settings, reminders: { ...reminders, choice, groupOn } };
}
