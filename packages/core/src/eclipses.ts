import {
  Body,
  EclipseKind,
  Equator,
  Horizon,
  KM_PER_AU,
  NextLocalSolarEclipse,
  NextLunarEclipse,
  Observer,
  SearchLocalSolarEclipse,
  SearchLunarEclipse,
  SearchRiseSet,
} from 'astronomy-engine';

import { DAY_MS, MINUTE_MS } from './civil';
import { assertCoordinates, type Coordinates } from './places';

export type VisibleEclipse = Readonly<{
  id: string;
  eclipse: 'solar' | 'lunar';
  kind: 'partial' | 'annular' | 'total';
  start: number;
  end: number;
}>;

type Window = { start: number; end: number };

function upperLimbAboveHorizon(body: Body.Sun | Body.Moon, at: number, observer: Observer) {
  const time = new Date(at);
  const equator = Equator(body, time, observer, true, true);
  const radiusKm = body === Body.Sun ? 695700 : 1737.4;
  const radiusDegrees = Math.asin(radiusKm / (KM_PER_AU * equator.dist)) * 180 / Math.PI;
  const { altitude } = Horizon(time, observer, equator.ra, equator.dec);
  return altitude + radiusDegrees > -34 / 60;
}

function visibleWindows(body: Body.Sun | Body.Moon, window: Window, observer: Observer): Window[] {
  const { start, end } = window;
  const days = (end - start) / DAY_MS;
  const rise = SearchRiseSet(body, observer, +1, new Date(start), days)?.date.getTime();
  const set = SearchRiseSet(body, observer, -1, new Date(start), days)?.date.getTime();
  const crossings = [
    ...(rise === undefined ? [] : [{ time: rise, rising: true }]),
    ...(set === undefined ? [] : [{ time: set, rising: false }]),
  ].filter(({ time }) => time >= start && time <= end).sort((a, b) => a.time - b.time);

  const first = crossings[0];
  if (!first) return upperLimbAboveHorizon(body, (start + end) / 2, observer) ? [window] : [];

  const windows: Window[] = [];
  let open = first.rising ? undefined : start;
  for (const { time, rising } of crossings) {
    if (rising) {
      open = time;
    } else if (open !== undefined) {
      if (time > open) windows.push({ start: open, end: time });
      open = undefined;
    }
  }
  if (open !== undefined && end > open) windows.push({ start: open, end });
  return windows;
}

/** Returns the visible parts of eclipses overlapping [from, to), in time order. */
export function eclipsesBetween(from: number, to: number, place: Coordinates): VisibleEclipse[] {
  assertCoordinates(place);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return [];

  const observer = new Observer(place.latitude, place.longitude, 0);
  const result: VisibleEclipse[] = [];
  // Search by the new or full Moon even when the requested interval starts during an eclipse.
  const searchStart = new Date(from - 2 * DAY_MS);
  const add = (
    eclipse: VisibleEclipse['eclipse'],
    peak: number,
    window: Window,
    central?: Window & { kind: 'annular' | 'total' },
  ) => {
    if (window.end <= from || window.start >= to) return;
    const utcDate = new Date(peak).toISOString().slice(0, 10);
    const body = eclipse === 'solar' ? Body.Sun : Body.Moon;
    const visible = visibleWindows(body, window, observer);
    for (const [index, { start, end }] of visible.entries()) {
      if (end <= from || start >= to) continue;
      const kind = central && central.start < end && central.end > start ? central.kind : 'partial';
      result.push({ id: `${eclipse}:${utcDate}:${index}`, eclipse, kind, start, end });
    }
  };

  let solar = SearchLocalSolarEclipse(searchStart, observer);
  while (solar.partial_begin.time.date.getTime() < to) {
    const start = solar.partial_begin.time.date.getTime();
    const end = solar.partial_end.time.date.getTime();
    const central = solar.total_begin && solar.total_end
      ? { start: solar.total_begin.time.date.getTime(), end: solar.total_end.time.date.getTime(),
          kind: solar.kind === EclipseKind.Annular ? 'annular' as const : 'total' as const }
      : undefined;
    add('solar', solar.peak.time.date.getTime(), { start, end }, central);
    solar = NextLocalSolarEclipse(solar.peak.time, observer);
  }

  let lunar = SearchLunarEclipse(searchStart);
  while (lunar.peak.date.getTime() - lunar.sd_partial * MINUTE_MS < to) {
    if (lunar.kind !== EclipseKind.Penumbral) {
      const peak = lunar.peak.date.getTime();
      const window = { start: peak - lunar.sd_partial * MINUTE_MS, end: peak + lunar.sd_partial * MINUTE_MS };
      const central = lunar.kind === EclipseKind.Total
        ? { start: peak - lunar.sd_total * MINUTE_MS, end: peak + lunar.sd_total * MINUTE_MS, kind: 'total' as const }
        : undefined;
      add('lunar', peak, window, central);
    }
    lunar = NextLunarEclipse(lunar.peak);
  }

  return result.sort((a, b) => a.start - b.start);
}
