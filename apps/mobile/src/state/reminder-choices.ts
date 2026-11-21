import type { GroupedSunnah } from '@adwam/content/schema';
import type { ReminderLevel } from '@adwam/core';

import { t } from '../language/messages';
import type { Settings } from './schema';

const levels: readonly ReminderLevel[] = ['push', 'inapp', 'off'];

function supportsPush(entry: GroupedSunnah): boolean {
  return entry.tier === 'push' && entry.group !== 'disputed';
}

export function reminderOptions(entry: GroupedSunnah) {
  return levels.filter((level) => level !== 'push' || supportsPush(entry))
    .map((value) => ({ value, label: t(`reminders.${value}`) }));
}

export function setReminderChoice(settings: Settings, entry: GroupedSunnah, value: ReminderLevel): Settings {
  const { id, group, tier } = entry;
  if (entry.hidden || (value === 'push' && !supportsPush(entry))) return settings;
  const { reminders } = settings;
  const choice = { ...reminders.choice };
  if (value === (entry.default ?? tier)) delete choice[id];
  else choice[id] = value;
  const groupOn = group !== 'disputed' && reminders.groupOn[group] === false
    ? { ...reminders.groupOn, [group]: true }
    : reminders.groupOn;
  return { ...settings, reminders: { ...reminders, choice, groupOn } };
}
