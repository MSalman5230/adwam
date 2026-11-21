import { civil, dayDiff, localToMs, MINUTE_MS, tzParts } from './civil';
import { msg, type Msg } from './message';
import type { Occurrence } from './occurrences';

export function fmtClock(instant: number, timeZone: string, use24HourClock: boolean): string {
  const { hour, minute } = tzParts(instant, timeZone);
  const minutes = String(minute).padStart(2, '0');
  if (use24HourClock) return `${String(hour).padStart(2, '0')}:${minutes}`;
  return `${hour % 12 || 12}:${minutes} ${hour < 12 ? 'am' : 'pm'}`;
}

export function fmtDur(duration: number): Msg {
  const minutes = Math.max(1, Math.round(duration / MINUTE_MS));
  if (minutes < 60) return msg('timing.duration.minutes', { minutes });
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder && hours < 5 ? msg('timing.duration.hoursMinutes', { hours, minutes: remainder })
    : msg('timing.duration.hours', { hours });
}

type RelativeOptions = Readonly<{ evening?: boolean; sentence?: boolean }>;

export function relDay(instant: number, now: number, timeZone: string, options: RelativeOptions = {}): Msg {
  const target = civil(instant, timeZone);
  const offset = dayDiff(target.iso, civil(now, timeZone).iso);
  const evening = options.evening && target.min >= 16 * 60;
  const variant = options.sentence ? 'sentence' : 'standalone';
  if (offset === 0) return msg(`timing.relative.${variant}.${evening ? 'tonight' : 'today'}`);
  if (offset === 1) return msg(`timing.relative.${variant}.${evening ? 'tomorrowEvening' : 'tomorrow'}`);
  if (offset === -1) return msg(`timing.relative.${variant}.yesterday`);
  if (offset > 1 && offset < 7) return msg('timing.relative.weekday', { date: target.iso });
  return msg('timing.relative.shortDate', { date: target.iso });
}

export function activeMeta(occurrence: Occurrence, now: number, timeZone: string): Msg {
  const { definition, event } = occurrence;
  if (event) {
    const kind = 'weather' in event ? event.weather : 'eclipse';
    return msg(`timing.active.event.${kind}`);
  }
  if (definition.check === 'fast' && now < occurrence.fajr) {
    return msg(civil(now, timeZone).iso === occurrence.date ? 'timing.active.fromFajr' : 'timing.relative.sentence.tomorrow');
  }
  const remaining = occurrence.end - now;
  const duration = fmtDur(remaining);
  if (definition.countdown === 'jumuah') return msg('timing.active.toJumuah', { duration });
  if (remaining <= 60 * MINUTE_MS) return msg('timing.active.timeLeft', { duration });
  if (definition.endAnchor) return msg('timing.active.untilPrayer', { prayer: msg(`calendar.prayer.${definition.endAnchor}`) });
  if (definition.startAnchor === 'all-day') return msg('timing.relative.sentence.today');
  return msg('timing.active.untilTime', { time: occurrence.end });
}

function reminderTiming(occurrence: Occurrence, now: number, timeZone: string, reminds: boolean): Msg | undefined {
  const { push } = occurrence;
  if (!reminds || !push || push.at <= now || occurrence.definition.check !== 'fast') return;
  const anchor = push.anchor ?? 'after-isha';
  const sameDay = civil(push.at, timeZone).iso === civil(now, timeZone).iso;
  const relative = anchor === 'after-isha' && sameDay ? msg('timing.relative.sentence.tonight')
    : relDay(push.at, now, timeZone, { sentence: true });
  return msg('timing.coming.dayAndAnchor', { day: relative, anchor: msg(`timing.anchor.${anchor}`) });
}

function startTiming(occurrence: Occurrence, now: number, timeZone: string, sentence: boolean): Msg {
  const { definition, date, start } = occurrence;
  const { startAnchor: anchor } = definition;
  const startsByTime = !anchor || anchor === 'time';
  const evening = anchor === 'from-maghrib' || anchor === 'after-maghrib' || anchor === 'at-maghrib';
  const startDate = startsByTime || evening ? civil(start, timeZone).iso : date;
  const today = civil(now, timeZone).iso;
  const dayReference = startsByTime || evening ? start : localToMs(date, 720, timeZone);
  const when = relDay(dayReference, now, timeZone, { sentence });
  if (anchor === 'all-day' || (definition.check === 'fast' && startDate !== today)) return when;
  if (startsByTime) return startDate === today ? msg('timing.coming.time', { time: start })
    : msg('timing.coming.dayAndTime', { day: when, time: start });
  const anchorLabel = msg(`timing.anchor.${anchor}`);
  if (startDate !== today) return msg('timing.coming.dayAndAnchor', { day: when, anchor: anchorLabel });
  return sentence ? anchorLabel : msg('timing.coming.capitalize', { anchor: anchorLabel });
}

export function comingLabel(occurrence: Occurrence, now: number, timeZone: string, reminds = false): Msg {
  const when = reminderTiming(occurrence, now, timeZone, reminds);
  return when ? msg('timing.coming.reminder', { when }) : startTiming(occurrence, now, timeZone, false);
}

export function nextSentence(occurrence: Occurrence, now: number, timeZone: string, reminds = false): Msg {
  const when = reminderTiming(occurrence, now, timeZone, reminds);
  const { title } = occurrence;
  return when ? msg('timing.next.reminder', { title, when })
    : msg('timing.next.starts', { title, when: startTiming(occurrence, now, timeZone, true) });
}
