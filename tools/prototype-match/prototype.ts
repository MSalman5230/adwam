import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

import type { CivilDate } from '../../packages/core/src/civil';
import type { DaySettings } from '../../packages/core/src/day';

type PrototypeOccurrence = {
  item: string;
  title: string;
  date: CivilDate;
  key: string;
  start: number;
  end: number;
  push?: number;
  pushItem?: string;
  kind?: 'marker' | 'pushOnly';
  check?: 'done' | 'fast';
};
type PrototypeUpcoming = {
  iso: CivilDate;
  range?: [CivilDate, CivilDate];
} & ({ kind: 'month' } | { kind: 'item'; o: PrototypeOccurrence });

export type PrototypeState = {
  choice?: Record<string, 'push' | 'inapp' | 'off'>;
  done?: Record<string, boolean>;
  fastLog?: Record<CivilDate, boolean>;
  notif?: 'unset' | 'denied' | 'granted';
  makeup?: number;
  rain?: boolean;
  rainAt?: number;
  udhiyah?: 'yes' | 'no' | null;
};

export type Prototype = {
  date(date: CivilDate, minutes: number): void;
  now(): number;
  occurrences(date: CivilDate): PrototypeOccurrence[];
  today(): { active: PrototypeOccurrence[]; coming: PrototypeOccurrence[] };
  upcoming(): PrototypeUpcoming[];
  pushes(start: number, end: number): PrototypeOccurrence[];
};

export function prototype(settings: DaySettings, state: PrototypeState = {}): Prototype {
  const source = readFileSync(new URL('../../docs/mobile-app-ui.html', import.meta.url), 'utf8');
  const basics = source.indexOf('   Basics');
  const mainStart = source.indexOf('*/', basics) + 2;
  const mainEnd = source.lastIndexOf('/*', source.indexOf('   Rendering helpers', mainStart));
  const upcomingStart = source.indexOf('function upcomingRows()');
  const upcomingEnd = source.indexOf('function rowSub', upcomingStart);
  const pushesStart = source.indexOf('function pushesBetween(');
  const pushesEnd = source.indexOf('function delivered()', pushesStart);
  if (basics < 0 || mainEnd < mainStart || upcomingStart < 0 || upcomingEnd < upcomingStart ||
      pushesStart < 0 || pushesEnd < pushesStart) throw new Error('Prototype engine markers changed');

  return runInNewContext(`
    ${source.slice(mainStart, mainEnd)}
    ${source.slice(upcomingStart, upcomingEnd)}
    ${source.slice(pushesStart, pushesEnd)}
    CITIES.parity = place;
    S = Object.assign(defaults(), { city: 'parity', method, asr, jumuah, hijriMethod, hijriShift,
      notif: 'granted', udhiyah: 'yes' }, initial);
    ({
      date: (date, minutes) => Object.assign(S, { date, minutes }),
      now: nowMs, occurrences: occsForDay, today: todayState,
      upcoming: upcomingRows, pushes: pushesBetween,
    });
  `, {
    place: { lat: settings.place.latitude, lng: settings.place.longitude, tz: settings.place.timeZone, country: settings.place.countryCode },
    method: settings.prayer.method,
    asr: settings.prayer.asr,
    jumuah: settings.prayer.jumuah?.mode === 'fixed'
      ? { mode: 'fixed', time: `${Math.floor(settings.prayer.jumuah.minutes / 60)}:${settings.prayer.jumuah.minutes % 60}` }
      : { mode: 'dhuhr' },
    hijriMethod: settings.hijri.method,
    hijriShift: settings.hijri.shift ?? 0,
    initial: state,
  }, { filename: 'mobile-app-ui.engine.js', timeout: 1000 }) as Prototype;
}
