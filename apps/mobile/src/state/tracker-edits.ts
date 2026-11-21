import { countMonthFasts, msg, type CivilDate, type HijriSettings, type Occurrence } from '@adwam/core';

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

export function editOccurrenceTick(
  trackers: Trackers, occurrence: Occurrence, tick: { type: 'done' | 'fast'; key: string },
  hijri: HijriSettings, checked: boolean,
) {
  if (tick.type === 'done') {
    return {
      edit: editTick(trackers, { kind: 'done', key: tick.key }, checked),
      message: msg(checked ? 'snackbar.done' : 'snackbar.doneRemoved'),
    };
  }
  const edit = editTick(trackers, { kind: 'fastLog', key: occurrence.date }, checked);
  const { day, month, year } = occurrence.hijri;
  if (checked && month === 10 && day >= 2) {
    const count = Math.min(6, countMonthFasts(edit.next.fastLog, hijri, year, month, 2));
    return { edit, message: msg('snackbar.shawwalFastLogged', { count }) };
  }
  if (checked && day >= 13 && day <= 15) {
    const count = Math.min(3, countMonthFasts(edit.next.fastLog, hijri, year, month));
    return { edit, message: msg('snackbar.whiteDayFastLogged', { count }) };
  }
  return { edit, message: msg(checked ? 'snackbar.fastLogged' : 'snackbar.fastRemoved') };
}

export function editMakeup(trackers: Trackers, makeup: number): TrackerEdit {
  return {
    next: { ...trackers, makeup },
    undo: (current) => current.makeup === makeup ? { ...current, makeup: trackers.makeup } : current,
  };
}
