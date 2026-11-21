import { dayDiff, fmtClock, isoAdd, isoParts, wdOf, type CivilDate, type upcomingRows } from '@adwam/core';

import { t, type MessageFormat } from '../language/messages';

type Row = ReturnType<typeof upcomingRows>['rows'][number];
export type ItemRow = Extract<Row, { kind: 'item' }>;
export type AgendaDay = { kind: 'day'; date: CivilDate; items: ItemRow[] };
export type AgendaWeek = { start: CivilDate; days: Array<AgendaDay | Extract<Row, { kind: 'month' }>> };

function monday(date: CivilDate) {
  return isoAdd(date, -((wdOf(date) + 6) % 7));
}

export function agendaWeeks(rows: readonly Row[]): AgendaWeek[] {
  const weeks: AgendaWeek[] = [];
  for (const row of rows) {
    const start = monday(row.date);
    let week = weeks.at(-1);
    if (!week || week.start !== start) {
      week = { start, days: [] };
      weeks.push(week);
    }
    const previous = week.days.at(-1);
    if (row.kind === 'month') week.days.push(row);
    else if (previous?.kind === 'day' && previous.date === row.date) previous.items.push(row);
    else week.days.push({ kind: 'day', date: row.date, items: [row] });
  }
  return weeks;
}

export function agendaWeekHeading(start: CivilDate, today: CivilDate) {
  const relative = dayDiff(start, monday(today));
  const title = relative === 0 ? t('upcoming.week.this') : relative === 7 ? t('upcoming.week.next') : t('upcoming.week.of', { date: start });
  const end = isoAdd(start, 6);
  const first = isoParts(start);
  const last = isoParts(end);
  const aside = first.month === last.month
    ? t('upcoming.week.range', { first: first.day, last: last.day, end })
    : t('upcoming.week.acrossMonths', { start, end });
  return { title, aside };
}

export function agendaItemSubtitle(row: ItemRow, format: MessageFormat) {
  const { occurrence, until, untilHijri } = row;
  const { day, month } = occurrence.hijri;
  const date = t('calendar.hijriDay', { day, month });
  if (until && untilHijri) {
    return month === untilHijri.month
      ? t('upcoming.range', { start: day, end: untilHijri.day, month, date: until })
      : t('upcoming.rangeAcrossMonths', { start: date, end: t('calendar.hijriDay', untilHijri), date: until });
  }
  const { startAnchor } = occurrence.definition;
  if (occurrence.event && 'eclipse' in occurrence.event) {
    return [date, t('upcoming.eclipseWindow', { start: occurrence.start, end: occurrence.end }, format)].join(' · ');
  }
  if (!startAnchor || startAnchor === 'all-day' || startAnchor === 'from-fajr') return date;
  const time = startAnchor === 'time'
    ? fmtClock(occurrence.start, format.timeZone, format.uses24HourClock) : t(`timing.anchor.${startAnchor}`);
  return [date, time].join(' · ');
}
