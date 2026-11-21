import type { OccurrenceDefinition } from '@adwam/content/schema';

import { chosenLevel, level, type ReminderPreferences, type ReminderState } from './rules';

const groups = ['weekly', 'monthly', 'yearly', 'weather'] as const;

export type Preset = 'recommended' | 'inapp' | 'custom';
export type PushEstimate = Readonly<{
  weekly: number;
  monthly: number;
  yearly: number;
  weather: boolean;
  none: boolean;
}>;

function annualPushes(definition: OccurrenceDefinition): number {
  const { on, push } = definition;
  if (!push || 'weather' in on || 'eclipse' in on) return 0;
  const selected = push.on?.hijri?.day ?? on.hijri?.day;
  if (typeof selected !== 'string' || !/^\d+-\d+$/.test(selected)) return 1;
  const [first, last] = selected.split('-');
  return Number(last) - Number(first) + 1;
}

export function pushEstimate(state: ReminderState, year: number): PushEstimate {
  const pushes = (id: string) => level(state, id, year) === 'push';
  const weekly = (pushes('monthu') ? 2 : 0) +
    (pushes('kahf') || pushes('friday-prep') ? 1 : 0) +
    (pushes('last-hour') ? 1 : 0);
  const monthly = pushes('white-days') ? 1 : 0;
  const yearly = state.catalog.reduce((sum, item) => {
    if (item.group !== 'yearly' || !pushes(item.id)) return sum;
    return sum + item.occurrences.reduce((count, definition) => count + annualPushes(definition), 0);
  }, 0);
  const weather = state.catalog.some((item) => item.group === 'weather' && pushes(item.id));
  return { weekly, monthly, yearly, weather, none: !weekly && !monthly && !yearly && !weather };
}

export function presetOf(state: ReminderState): Preset {
  const { preferences, catalog } = state;
  if (groups.some((group) => preferences.groupOn?.[group] === false)) return 'custom';
  if (catalog.some((item) => item.group === 'disputed' && chosenLevel(item, preferences) !== 'off')) return 'custom';

  const entries = catalog.filter((item) => !item.hidden && item.group !== 'disputed');
  if (entries.every((entry) => chosenLevel(entry, preferences) === (entry.default ?? entry.tier))) return 'recommended';
  if (entries.every((entry) => {
    const usual = entry.default ?? entry.tier;
    return chosenLevel(entry, preferences) === (usual === 'push' ? 'inapp' : usual);
  })) return 'inapp';
  return 'custom';
}

export function applyPreset(state: ReminderState, preset: Preset): ReminderPreferences {
  const choice: Record<string, 'inapp'> = {};
  if (preset === 'inapp') {
    for (const entry of state.catalog) {
      if (entry.group !== 'disputed' && (entry.default ?? entry.tier) === 'push') choice[entry.id] = 'inapp';
    }
  }
  return {
    ...state.preferences,
    choice,
    groupOn: { weekly: true, monthly: true, yearly: true, weather: true },
  };
}
