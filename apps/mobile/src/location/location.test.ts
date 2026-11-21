import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { nearestCity, searchCities } from './cities';
import { locateCurrentCity } from './current-city';

const location = vi.hoisted(() => ({
  requestForegroundPermissionsAsync: vi.fn(), getLastKnownPositionAsync: vi.fn(), watchPositionAsync: vi.fn(),
}));
vi.mock('expo-location', () => ({ ...location, Accuracy: { Balanced: 3 } }));

beforeEach(() => { vi.resetAllMocks(); });
afterEach(() => { vi.useRealTimers(); });

it('finds London by prefix and ranks partial matches by population', async () => {
  const cities = await searchCities('lon');
  expect(cities[0]).toMatchObject({ name: 'London', countryCode: 'GB', timeZone: 'Europe/London' });
  const populations = cities.map((city) => city.population);
  expect(populations).toEqual(populations.toSorted((a, b) => b - a));
});

it('finds Montréal from accented or ASCII spelling and ignores case', async () => {
  const result = await searchCities('MONTREAL Canada');
  expect(result[0]).toMatchObject({ name: 'Montréal', asciiName: 'Montreal', countryCode: 'CA' });
  expect(await searchCities('Montréal Canada')).toEqual(result);
  expect(await searchCities('no such city123')).toEqual([]);
});

it('finds the closest city from coordinates alone', async () => {
  expect(await nearestCity({ latitude: 45.5088, longitude: -73.5878 })).toMatchObject({
    name: 'Montréal', countryCode: 'CA', timeZone: 'America/Toronto',
  });
  expect(await nearestCity({ latitude: 90.1, longitude: 0 })).toBeUndefined();
});

it('honors denied location permission and allows a city to be chosen instead', async () => {
  location.requestForegroundPermissionsAsync.mockResolvedValue({ granted: false });
  expect(await locateCurrentCity()).toEqual({ status: 'denied' });
  expect(location.getLastKnownPositionAsync).not.toHaveBeenCalled();
  expect(location.watchPositionAsync).not.toHaveBeenCalled();
});

it('resolves one coarse foreground fix and removes the subscription', async () => {
  location.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true });
  location.getLastKnownPositionAsync.mockResolvedValue(null);
  const remove = vi.fn();
  location.watchPositionAsync.mockImplementation(async (_options, receive) => {
    receive({ coords: { latitude: 45.5088, longitude: -73.5878 } });
    return { remove };
  });
  expect(await locateCurrentCity()).toMatchObject({ status: 'located', city: { name: 'Montréal', timeZone: 'America/Toronto' } });
  expect(location.watchPositionAsync.mock.calls[0]?.[0]).toEqual({ accuracy: 3, mayShowUserSettingsDialog: false });
  expect(remove).toHaveBeenCalledOnce();
});

it('falls back to manual selection on timeout and removes the location subscription', async () => {
  vi.useFakeTimers();
  location.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true });
  location.getLastKnownPositionAsync.mockResolvedValue(null);
  const remove = vi.fn();
  location.watchPositionAsync.mockResolvedValue({ remove });
  const result = locateCurrentCity();
  await vi.advanceTimersByTimeAsync(12_000);
  expect(await result).toEqual({ status: 'unavailable' });
  expect(remove).toHaveBeenCalledOnce();
});
