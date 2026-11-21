import type { WeatherKind } from '@adwam/content/schema';

import { civil, DAY_MS, MINUTE_MS, type CivilDate } from './civil';
import type { WeatherArea } from './places';
import { quietInterval, type QuietHours } from './quiet-hours';

type ForecastSeries = Readonly<{
  /** Open-Meteo with timeformat=unixtime, precipitation_unit=mm and wind_speed_unit=kmh. */
  time: readonly number[];
  precipitation?: readonly (number | null)[];
  rain?: readonly (number | null)[];
  showers?: readonly (number | null)[];
  weather_code?: readonly (number | null)[];
  wind_gusts_10m?: readonly (number | null)[];
}>;

export type WeatherForecast = Readonly<{
  hourly?: ForecastSeries;
  minutely_15?: ForecastSeries;
}>;

export type WeatherThresholds = Readonly<{
  dryDays: number;
  heavyRainMmPerHour: number;
  windCardKmh: number;
  windPushKmh: number;
}>;

export const defaultWeatherThresholds: WeatherThresholds = {
  dryDays: 7,
  heavyRainMmPerHour: 7.6,
  windCardKmh: 60,
  windPushKmh: 75,
};

export type WeatherEvent = Readonly<{
  id: string;
  areaId: string;
  weather: WeatherKind;
  start: number;
  end: number;
  firstRain?: boolean;
  pushAt?: number;
}>;

type ForecastInterval = {
  start: number;
  end: number;
  rainRate: number | null;
  gust: number | null;
  code: number | null;
};

const step = 15 * MINUTE_MS;
const dryGap = 30 * MINUTE_MS;
const afterRain = 3 * 60 * MINUTE_MS;
const snowCodes = new Set([71, 73, 75, 77, 85, 86]);

function nonnegative(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function forecastIntervals(forecast: WeatherForecast): ForecastInterval[] {
  const intervals = new Map<number, ForecastInterval>();
  // Rain and gusts describe the interval preceding each timestamp. The WMO
  // code is observed at the timestamp and holds until the next reported code.
  for (const [series, minutes] of [[forecast.hourly, 60], [forecast.minutely_15, 15]] as const) {
    if (!series) continue;
    const intervalMs = minutes * MINUTE_MS;
    series.time.forEach((time, index) => {
      const at = time * 1000;
      if (!Number.isSafeInteger(at) || at % step !== 0) return;
      const code = nonnegative(series.weather_code?.[index]);
      const rain = nonnegative(series.rain?.[index]);
      const showers = nonnegative(series.showers?.[index]);
      // The precipitation total includes snow. Explicit rain and showers take precedence.
      const total = rain === null && showers === null
        ? (code !== null && snowCodes.has(code) ? 0 : nonnegative(series.precipitation?.[index]))
        : (rain ?? 0) + (showers ?? 0);
      const rate = total === null ? null : total * (60 / minutes);
      const gust = nonnegative(series.wind_gusts_10m?.[index]);
      for (let start = at - intervalMs; start < at + intervalMs; start += step) {
        const interval = intervals.get(start) ?? { start, end: start + step, rainRate: null, gust: null, code: null };
        if (start < at) {
          interval.rainRate = rate ?? interval.rainRate;
          interval.gust = gust ?? interval.gust;
        } else {
          interval.code = code ?? interval.code;
        }
        intervals.set(start, interval);
      }
    });
  }
  return [...intervals.values()].sort((a, b) => a.start - b.start);
}

type Run = { start: number; end: number; active: boolean | null };

function runs(intervals: readonly ForecastInterval[], state: (interval: ForecastInterval) => boolean | null) {
  const result: Run[] = [];
  for (const interval of intervals) {
    const active = state(interval);
    const previous = result.at(-1);
    if (previous && previous.end === interval.start && previous.active === active) {
      previous.end = interval.end;
    } else {
      result.push({ start: interval.start, end: interval.end, active });
    }
  }
  return result;
}

function joinBriefDryGaps(segments: readonly Run[]) {
  const result: Run[] = [];
  for (const [index, segment] of segments.entries()) {
    const previous = result.at(-1);
    const next = segments[index + 1];
    if (segment.active === false && segment.end - segment.start <= dryGap &&
        previous?.active && previous.end === segment.start && next?.active && segment.end === next.start) {
      previous.end = segment.end;
    } else if (segment.active && previous?.active && previous.end === segment.start) {
      previous.end = segment.end;
    } else {
      result.push({ ...segment });
    }
  }
  return result;
}

export function detectEvents(
  forecast: WeatherForecast,
  area: Pick<WeatherArea, 'id'>,
  thresholds: WeatherThresholds = defaultWeatherThresholds,
): WeatherEvent[] {
  const intervals = forecastIntervals(forecast);
  const events: WeatherEvent[] = [];
  const add = (weather: WeatherKind, start: number, end: number, extra?: Pick<WeatherEvent, 'firstRain' | 'pushAt'>) => {
    events.push({ id: `${area.id}|${weather}|${start}`, areaId: area.id, weather, start, end, ...extra });
  };

  const rain = joinBriefDryGaps(runs(intervals, ({ rainRate }) => rainRate === null ? null : rainRate > 0));
  for (const [index, segment] of rain.entries()) {
    if (!segment.active) continue;
    const { start, end } = segment;
    const previous = rain[index - 1];
    const next = rain[index + 1];
    const firstRain = previous?.active === false && previous.end === start &&
      start - previous.start >= thresholds.dryDays * DAY_MS;
    add('rain-start', start, end, { firstRain, pushAt: firstRain ? start : undefined });
    if (next?.active === false && next.start === end && next.end - next.start > dryGap) {
      add('rain-stop', end, Math.min(next.end, end + afterRain));
    }
  }

  const heavy = runs(intervals, ({ rainRate }) => rainRate === null ? null : rainRate > thresholds.heavyRainMmPerHour);
  for (const [index, segment] of heavy.entries()) {
    if (!segment.active) continue;
    const previous = heavy[index - 1];
    const begins = previous?.active === false && previous.end === segment.start;
    add('heavy-rain', segment.start, segment.end, { pushAt: begins ? segment.start : undefined });
  }

  for (const segment of runs(intervals, ({ code }) => code === null ? null : code >= 95 && code <= 99)) {
    if (segment.active) add('thunder', segment.start, segment.end);
  }

  const severe = runs(intervals, ({ gust }) => gust === null ? null : gust > thresholds.windPushKmh);
  const severeStarts = severe.flatMap((segment, index) => {
    const previous = severe[index - 1];
    return segment.active && previous?.active === false && previous.end === segment.start ? [segment.start] : [];
  });
  for (const segment of runs(intervals, ({ gust }) => gust === null ? null : gust > thresholds.windCardKmh)) {
    if (!segment.active) continue;
    const pushAt = severeStarts.find((start) => start >= segment.start && start < segment.end);
    add('wind', segment.start, segment.end, { pushAt });
  }

  return events.sort((a, b) => a.start - b.start || a.id.localeCompare(b.id, 'en'));
}

export type WeatherInstall = Readonly<{
  id: string;
  areaId: string;
  timeZone: string;
  notificationsAllowed: boolean;
  pushKinds: readonly WeatherKind[];
  quietHours?: QuietHours;
  lastWeatherPushDay?: CivilDate;
  sentEventIds?: readonly string[];
}>;

export type WeatherPush = Readonly<{
  installId: string;
  eventId: string;
  localDay: CivilDate;
}>;

export function decidePushes(
  events: readonly WeatherEvent[],
  installs: readonly WeatherInstall[],
  now: number,
): WeatherPush[] {
  const candidates = events.flatMap((event) => event.pushAt !== undefined && event.pushAt <= now && now < event.end
    ? [{ event, at: event.pushAt }]
    : []);
  candidates.sort((a, b) => a.at - b.at || a.event.id.localeCompare(b.event.id, 'en'));
  const decisions = new Map<string, WeatherPush>();
  for (const install of installs) {
    if (!install.notificationsAllowed || decisions.has(install.id)) continue;
    const local = civil(now, install.timeZone);
    if (local.iso === install.lastWeatherPushDay || quietInterval(now, install.timeZone, install.quietHours)) continue;
    const match = candidates.find(({ event, at }) => {
      if (event.areaId !== install.areaId || !install.pushKinds.includes(event.weather) ||
          install.sentEventIds?.includes(event.id)) return false;
      const occurred = civil(at, install.timeZone);
      return occurred.iso === local.iso && !quietInterval(at, install.timeZone, install.quietHours);
    });
    if (match) decisions.set(install.id, { installId: install.id, eventId: match.event.id, localDay: local.iso });
  }
  return [...decisions.values()];
}
