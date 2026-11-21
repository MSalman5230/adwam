import { civil, isoAdd, localToMs } from './civil';

export type QuietHours = Readonly<{ start: number; end: number }>;

export function quietInterval(instant: number, timeZone: string, quiet?: QuietHours) {
  if (!quiet || quiet.start === quiet.end) return;
  const { iso } = civil(instant, timeZone);
  const overnight = quiet.start > quiet.end;
  const days = overnight ? [isoAdd(iso, -1), iso] : [iso];
  for (const date of days) {
    const start = localToMs(date, quiet.start, timeZone);
    const end = localToMs(overnight ? isoAdd(date, 1) : date, quiet.end, timeZone);
    if (start <= instant && instant < end) return { start, end };
  }
}
