export type PrayerMethod =
  | 'mwl'
  | 'isna'
  | 'egypt'
  | 'makkah'
  | 'karachi'
  | 'turkey'
  | 'singapore'
  | 'dubai'
  | 'kuwait'
  | 'qatar'
  | 'moonsighting';

export type Coordinates = Readonly<{ latitude: number; longitude: number }>;

export type Place = Coordinates &
  Readonly<{ timeZone: string; countryCode: string }>;

export type City = Place &
  Readonly<{
    id: number;
    name: string;
    asciiName: string;
    population: number;
  }>;

export type WeatherArea = Coordinates & Readonly<{ id: string }>;

const countryMethods = new Map<string, PrayerMethod>([
  ['AE', 'dubai'],
  ['AF', 'karachi'],
  ['BD', 'karachi'],
  ['CA', 'isna'],
  ['EG', 'egypt'],
  ['ID', 'singapore'],
  ['IN', 'karachi'],
  ['KW', 'kuwait'],
  ['MY', 'singapore'],
  ['PK', 'karachi'],
  ['QA', 'qatar'],
  ['SA', 'makkah'],
  ['SG', 'singapore'],
  ['TR', 'turkey'],
  ['US', 'isna'],
]);

export function suggestedPrayerMethod(countryCode: string): PrayerMethod {
  return countryMethods.get(countryCode.trim().toUpperCase()) ?? 'mwl';
}

export function assertCoordinates({ latitude, longitude }: Coordinates): void {
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90) {
    throw new RangeError('Latitude must be between -90 and 90 degrees');
  }
  if (!Number.isFinite(longitude) || Math.abs(longitude) > 180) {
    throw new RangeError('Longitude must be between -180 and 180 degrees');
  }
}

export function weatherArea(coordinates: Coordinates): WeatherArea {
  assertCoordinates(coordinates);
  const { latitude, longitude } = coordinates;
  const roundedLatitude = Math.round(latitude * 10) || 0;
  const roundedLongitude = Math.round(longitude * 10) || 0;
  const gridLongitude = roundedLongitude === 1_800 ? -1_800 : roundedLongitude;
  return {
    id: `${roundedLatitude}:${gridLongitude}`,
    latitude: roundedLatitude / 10,
    longitude: gridLongitude / 10,
  };
}
