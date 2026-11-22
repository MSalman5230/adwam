import { civil, isoAdd, localToMs, MINUTE_MS, type CivilDate } from './civil';
import { withEclipses } from './events';
import type { Occurrence, OccurrencePush } from './occurrences';
import { quietInterval } from './quiet-hours';
import { isDone, pushAllowed, reminderOccurrences, type ReminderState } from './rules';

export const serverNotificationKind = 'adwam-server-v1';

export type NotificationState = ReminderState & { platform?: 'android' | 'ios' };
type Channel = 'weekly' | 'monthly' | 'yearly' | 'weather';
type Button = 'done' | 'later';

export type PlannedNotification = Readonly<{
  id: string;
  /** Milliseconds since the Unix epoch. */
  at: number;
  channel: Channel;
  title: string;
  body: string;
  buttons: readonly Button[];
  link: string;
  doneKey?: string;
  hash: string;
}>;

const months = [
  'Muḥarram', 'Ṣafar', 'Rabīʿ al-Awwal', 'Rabīʿ al-Ākhir', 'Jumādā al-Ūlā',
  'Jumādā al-Ākhirah', 'Rajab', 'Shaʿbān', 'Ramadan', 'Shawwāl', 'Dhul-Qaʿdah',
  'Dhul-Ḥijjah',
] as const;

type Candidate = { occurrence: Occurrence; push: OccurrencePush; combined?: boolean };

function collect(date: CivilDate, fromOffset: number, toOffset: number, state: ReminderState): Candidate[] {
  const found: Candidate[] = [];
  for (let offset = fromOffset; offset <= toOffset; offset++) {
    for (const occurrence of reminderOccurrences(isoAdd(date, offset), state)) {
      if (occurrence.event && 'weather' in occurrence.event) continue;
      if (!occurrence.push || !pushAllowed(occurrence, state) || isDone(occurrence, state.tracking)) continue;
      found.push({ occurrence, push: occurrence.push });
    }
  }
  return found;
}

function combineFridays(candidates: Candidate[]): Candidate[] {
  const preparation = new Map<number, Candidate>();
  for (const candidate of candidates) {
    if (candidate.push.combined) preparation.set(candidate.push.at, candidate);
  }
  return candidates.filter((candidate) => {
    if (!candidate.occurrence.rules.includes('combine-into-friday-push')) return true;
    const partner = preparation.get(candidate.push.at);
    if (!partner) return true;
    partner.combined = true;
    return false;
  });
}

function baseId(push: OccurrencePush): string {
  return `${push.tickKey}|${push.key ?? 'main'}`;
}

function scheduledAt(candidate: Candidate, state: ReminderState): number | undefined {
  const { occurrence, push } = candidate;
  const { preferences, calendar } = state;
  const quiet = quietInterval(push.at, calendar.place.timeZone, preferences.quietHours);
  if (!quiet) return push.at;
  if (occurrence.event && 'eclipse' in occurrence.event) return preferences.eclipseQuiet ? push.at : undefined;
  if (push.quiet === 'drop') return;
  if (push.quiet === 'advance') return quiet.start - MINUTE_MS;
  return quiet.end < occurrence.end ? quiet.end : undefined;
}

function contentHash(content: Omit<PlannedNotification, 'hash' | 'at'>): string {
  const serialized = JSON.stringify(content);
  let hash = 0x811c9dc5;
  for (let i = 0; i < serialized.length; i++) hash = Math.imul(hash ^ serialized.charCodeAt(i), 0x01000193);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function notification(candidate: Candidate, at: number, later = false): PlannedNotification {
  const { occurrence, push, combined } = candidate;
  const copy = combined && push.combined ? push.combined : push;
  const done = !combined && occurrence.definition.check === 'done' && (!push.buttons || push.buttons.includes('done'));
  const buttons: Button[] = [];
  if (done) buttons.push('done');
  if (!later && (!push.buttons || push.buttons.includes('later'))) buttons.push('later');
  const month = months[occurrence.hijri.month - 1] ?? String(occurrence.hijri.month);
  const content = {
    id: `${baseId(push)}${later ? '|later' : ''}`,
    channel: push.group === 'disputed' ? 'yearly' as const : push.group,
    title: copy.title.replaceAll('{{month}}', month),
    body: copy.body.replaceAll('{{month}}', month),
    buttons,
    link: combined ? '/today' : `/item/${push.item}?date=${occurrence.date}&occurrenceKey=${encodeURIComponent(occurrence.key)}`,
    doneKey: done ? occurrence.tickKey : undefined,
  };
  return { ...content, at, hash: contentHash(content) };
}

export function planNotifications(now: number, state: NotificationState): PlannedNotification[] {
  if (state.preferences.notifications !== 'granted') return [];
  const { timeZone } = state.calendar.place;
  const { iso: date, min } = civil(now, timeZone);
  const through = localToMs(isoAdd(date, 60), min, timeZone);
  const local = withEclipses(state, date, 61);
  const plan = combineFridays(collect(date, -1, 61, local)).flatMap((candidate) => {
    const at = scheduledAt(candidate, state);
    if (at === undefined || at <= now || at >= through || at >= candidate.occurrence.end) return [];
    return [notification(candidate, at)];
  }).sort((a, b) => a.at - b.at || a.id.localeCompare(b.id, 'en'));

  const cap = state.platform === 'ios' ? 60 : 150;
  const seen = new Set<string>();
  const result: PlannedNotification[] = [];
  for (const push of plan) {
    if (seen.has(push.id)) continue;
    result.push(push);
    if (result.length === cap) break;
    seen.add(push.id);
  }
  return result;
}

export function laterFor(id: string, now: number, state: NotificationState): PlannedNotification | undefined {
  if (state.preferences.notifications !== 'granted' || id.endsWith('|later')) return;
  const { timeZone } = state.calendar.place;
  const { iso: date } = civil(now, timeZone);
  const local = withEclipses(state, date, 2);
  const found = combineFridays(collect(date, -1, 2, local)).find(({ push }) => baseId(push) === id);
  if (!found || (found.push.buttons && !found.push.buttons.includes('later'))) return;
  const originallyScheduled = scheduledAt(found, state);
  if (originallyScheduled === undefined || originallyScheduled > now) return;
  const at = now + 60 * MINUTE_MS;
  if (at < found.occurrence.start || at >= found.occurrence.end) return;
  if (quietInterval(at, timeZone, state.preferences.quietHours) &&
      !(found.occurrence.event && 'eclipse' in found.occurrence.event && state.preferences.eclipseQuiet)) return;
  return notification(found, at, true);
}
