import { describe, expect, it } from 'vitest';

import { MINUTE_MS, localToMs } from '../src/civil';
import { decidePushes, defaultWeatherThresholds, detectEvents, type WeatherEvent, type WeatherInstall } from '../src/weather';
// Open-Meteo forecast for 47.6, -122.3, recorded 2026-11-21.
// https://open-meteo.com/en/docs
import seattle from './fixtures/open-meteo-seattle.json';

const area = { id: '476:-1223' };
const start = Date.UTC(2026, 10, 21, 12);
const quarter = 15 * MINUTE_MS;
const utcSeconds = start / 1000;

describe('detectEvents', () => {
  it('reads the hourly and 15-minute fields of a recorded Open-Meteo forecast', () => {
    const events = detectEvents(seattle, area);
    const last = events.filter(({ weather }) => weather === 'rain-start').at(-1);
    expect(last).toMatchObject({
      id: `${area.id}|rain-start|${Date.UTC(2026, 10, 22, 14)}`,
      start: Date.UTC(2026, 10, 22, 14),
      end: Date.UTC(2026, 10, 22, 15),
      firstRain: false,
    });
    expect(events.filter(({ weather }) => weather === 'rain-start')).toHaveLength(9);
    expect(events.some(({ pushAt }) => pushAt !== undefined)).toBe(false);
  });

  it('bridges a dry blip and uses observed continuous lookback for first rain', () => {
    const forecast = {
      hourly: {
        time: Array.from({ length: 168 }, (_, index) => utcSeconds - (167 - index) * 3600),
        rain: Array<number>(168).fill(0),
      },
      minutely_15: {
        time: Array.from({ length: 8 }, (_, index) => utcSeconds + (index + 1) * 900),
        rain: [0.2, 0, 0.4, 0.1, 0, 0, 0, 0],
      },
    };
    const events = detectEvents(forecast, area);
    expect(events).toMatchObject([
      { weather: 'rain-start', start, end: start + 4 * quarter, firstRain: true, pushAt: start },
      { weather: 'rain-stop', start: start + 4 * quarter, end: start + 8 * quarter },
    ]);
    expect(detectEvents({ minutely_15: forecast.minutely_15 }, area)[0]?.firstRain).toBe(false);
    expect(detectEvents(forecast, area, { ...defaultWeatherThresholds, dryDays: 8 })[0]?.firstRain).toBe(false);
  });

  it('uses strict heavy rain and wind thresholds and reads thunder from instant codes', () => {
    const events = detectEvents({
      minutely_15: {
        time: [1, 2, 3, 4, 5].map((index) => utcSeconds + 900 * index),
        rain: [0, 1.9, 2, 0, 0],
        wind_gusts_10m: [60, 61, 75, 76, 60],
        weather_code: [94, 95, 99, 100, 0],
      },
    }, area);
    expect(events.find(({ weather }) => weather === 'heavy-rain')).toMatchObject({ start: start + 2 * quarter, pushAt: start + 2 * quarter });
    expect(events.find(({ weather }) => weather === 'wind')).toMatchObject({ start: start + quarter, pushAt: start + 3 * quarter });
    expect(events.find(({ weather }) => weather === 'thunder')).toMatchObject({ start: start + 2 * quarter, end: start + 4 * quarter });
  });

  it('distinguishes snow from rain and leaves gaps of missing rain data unknown', () => {
    const forecast = {
      hourly: {
        time: [1, 2, 3, 4].map((index) => utcSeconds + index * 3600),
        precipitation: [1, null, 2, 0],
        weather_code: [73, 0, 63, 0],
      },
    };
    const rain = detectEvents(forecast, area).filter(({ weather }) => weather === 'rain-start');
    expect(rain).toMatchObject([{ start: start + 120 * MINUTE_MS, firstRain: false }]);
  });
});

describe('decidePushes', () => {
  const timeZone = 'Europe/London';
  const date = '2026-10-25';
  const now = localToMs(date, 480, timeZone);
  const early = localToMs(date, 390, timeZone);
  const event: WeatherEvent = { id: 'heavy', areaId: area.id, weather: 'heavy-rain', start: now, end: now + quarter, pushAt: now };
  const second: WeatherEvent = { ...event, id: 'wind', weather: 'wind' };
  const quietEvent: WeatherEvent = { ...event, id: 'early-rain', weather: 'rain-start', start: early, pushAt: early };
  const install: WeatherInstall = {
    id: 'allowed', areaId: area.id, timeZone, notificationsAllowed: true,
    pushKinds: ['rain-start', 'heavy-rain', 'wind'], quietHours: { start: 1320, end: 420 },
  };

  it('allows at most one eligible event per install per local calendar day', () => {
    expect(decidePushes([second, event, quietEvent], [
      install,
      { ...install, id: 'same-day', lastWeatherPushDay: date },
      { ...install, id: 'other-area', areaId: '0:0' },
      { ...install, id: 'denied', notificationsAllowed: false },
      { ...install, id: 'inapp', pushKinds: [] },
      { ...install, id: 'previously-sent', pushKinds: ['heavy-rain'], sentEventIds: ['heavy'] },
    ], now)).toEqual([{ installId: install.id, eventId: event.id, localDay: date }]);
  });

  it('drops pushes that start or would send during quiet hours and ignores the future', () => {
    expect(decidePushes([event, quietEvent], [install], early)).toEqual([]);
    expect(decidePushes([quietEvent], [install], now)).toEqual([]);
  });
});
