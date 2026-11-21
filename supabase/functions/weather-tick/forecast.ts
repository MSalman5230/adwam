import { detectEvents } from '../_shared/core.mjs';

export type Thresholds = {
  dryDays: number;
  heavyRainMmPerHour: number;
  windCardKmh: number;
  windPushKmh: number;
};

export type Area = { id: string; latitude: number; longitude: number; lease: string };

type Series = {
  time: number[];
  precipitation: (number | null)[];
  rain?: (number | null)[];
  showers?: (number | null)[];
  weather_code: (number | null)[];
  wind_gusts_10m: (number | null)[];
  cloud_cover?: (number | null)[];
};

type Event = { id: string; weather: string; start: number; end: number; firstRain?: boolean; pushAt?: number };

const hour = 60 * 60 * 1000;
const hourly = ['precipitation', 'rain', 'showers', 'weather_code', 'wind_gusts_10m', 'cloud_cover'] as const;
const minutely = ['precipitation', 'weather_code', 'wind_gusts_10m'] as const;

function series(data: unknown, fields: readonly (keyof Series)[]): Series {
  if (typeof data !== 'object' || data === null) throw new Error('Missing forecast series');
  const raw = data as Record<string, unknown>;
  const time = raw.time;
  if (!Array.isArray(time) || time.length === 0 || !time.every(Number.isSafeInteger)) {
    throw new Error('Invalid forecast times');
  }
  const values = Object.fromEntries(fields.map((field) => {
    const column = raw[field];
    if (!Array.isArray(column) || column.length !== time.length ||
      !column.every((value) => value === null || (typeof value === 'number' && Number.isFinite(value)))) {
      throw new Error('Invalid forecast values');
    }
    return [field, column];
  }));
  return { time, ...values } as Series;
}

export async function getForecast(area: Area, thresholds: Thresholds, request = fetch) {
  const query = new URLSearchParams({
    latitude: String(area.latitude),
    longitude: String(area.longitude),
    hourly: hourly.join(','),
    minutely_15: minutely.join(','),
    past_hours: String(Math.min(thresholds.dryDays, 91) * 24 + 4),
    forecast_hours: '7',
    past_minutely_15: '12',
    forecast_minutely_15: '25',
    timeformat: 'unixtime',
    timezone: 'GMT',
    precipitation_unit: 'mm',
    wind_speed_unit: 'kmh',
  });
  const response = await request(`https://api.open-meteo.com/v1/forecast?${query}`, {
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error('Forecast request failed');
  const data = await response.json();
  return { hourly: series(data?.hourly, hourly), minutely_15: series(data?.minutely_15, minutely) };
}

export function planForecast(forecast: Awaited<ReturnType<typeof getForecast>>, area: Area, thresholds: Thresholds, now: number) {
  const events: Event[] = detectEvents(forecast, area, thresholds);
  const active = events.filter((event) => event.end > now);
  const lastRain = events.filter((event) => event.weather === 'rain-start' && event.start < now).at(-1);
  const roughWeather = active.find((event) => (event.weather === 'rain-start' || event.weather === 'wind') &&
    event.start < now + 3 * hour);
  const next = roughWeather ? (roughWeather.start < now + hour ? hour / 2 : hour) : 3 * hour;

  return {
    nextFetch: new Date(now + next).toISOString(),
    lastRain: lastRain ? new Date(Math.min(lastRain.end, now)).toISOString() : null,
    events: active.map((event) => ({
      id: event.id,
      kind: event.weather,
      starts_at: new Date(event.start).toISOString(),
      ends_at: new Date(event.end).toISOString(),
      first_rain: event.firstRain ?? false,
      push_at: event.pushAt === undefined ? null : new Date(event.pushAt).toISOString(),
    })),
  };
}
