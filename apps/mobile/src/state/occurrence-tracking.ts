import { countMonthFasts, msg, type HijriSettings, type Occurrence } from '@adwam/core';

import type { Trackers } from './schema';
import { editTick } from './tracker-edits';

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
