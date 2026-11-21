import type { CivilDate } from '@adwam/core';

import type { Trackers } from './schema';

type Tick = { kind: 'done'; key: string } | { kind: 'fastLog'; key: CivilDate };
export type TrackerEdit = { next: Trackers; undo: (current: Trackers) => Trackers };

function flagged(trackers: Trackers, tick: Tick): boolean | undefined {
  return tick.kind === 'done' ? trackers.done[tick.key] : trackers.fastLog[tick.key];
}

function withFlag(trackers: Trackers, tick: Tick, value: boolean | undefined): Trackers {
  const flags: Record<string, boolean> = { ...trackers[tick.kind] };
  if (value === undefined) delete flags[tick.key];
  else flags[tick.key] = value;
  return { ...trackers, [tick.kind]: flags };
}

export function editTick(trackers: Trackers, tick: Tick, checked: boolean): TrackerEdit {
  const previous = flagged(trackers, tick);
  const updated = checked ? true : undefined;
  return {
    next: withFlag(trackers, tick, updated),
    undo: (current) => flagged(current, tick) === updated ? withFlag(current, tick, previous) : current,
  };
}

export function editMakeup(trackers: Trackers, makeup: number): TrackerEdit {
  return {
    next: { ...trackers, makeup },
    undo: (current) => current.makeup === makeup ? { ...current, makeup: trackers.makeup } : current,
  };
}
