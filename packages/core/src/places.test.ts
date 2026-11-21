import { describe, expect, it } from 'vitest';

import { suggestedPrayerMethod, weatherArea } from './places';

describe('weatherArea', () => {
  it('uses one stable area for coordinates on the same grid cell', () => {
    const london = weatherArea({ latitude: 51.5074, longitude: -0.1278 });
    expect(london).toEqual({ id: '515:-1', latitude: 51.5, longitude: -0.1 });
    expect(weatherArea({ latitude: 51.53, longitude: -0.11 })).toEqual(london);
  });

  it('normalizes negative zero and adjoining sides of the date line', () => {
    expect(weatherArea({ latitude: -0.01, longitude: -0.01 })).toEqual({
      id: '0:0',
      latitude: 0,
      longitude: 0,
    });
    expect(weatherArea({ latitude: 65, longitude: 179.98 })).toEqual(
      weatherArea({ latitude: 65, longitude: -179.98 }),
    );
  });

  it('rejects out-of-range and non-finite coordinates', () => {
    expect(() => weatherArea({ latitude: 91, longitude: 0 })).toThrow(
      RangeError,
    );
    expect(() => weatherArea({ latitude: 0, longitude: NaN })).toThrow(
      RangeError,
    );
  });
});

describe('suggestedPrayerMethod', () => {
  it.each([
    ['TR', 'turkey'],
    ['MY', 'singapore'],
    ['ID', 'singapore'],
    ['AE', 'dubai'],
    ['KW', 'kuwait'],
    ['QA', 'qatar'],
    ['ca', 'isna'],
    ['GB', 'mwl'],
  ])('suggests %s as %s', (country, method) => {
    expect(suggestedPrayerMethod(country)).toBe(method);
  });
});
