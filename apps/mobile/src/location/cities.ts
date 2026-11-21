import type { City, Coordinates } from '@adwam/core';

export type NamedCity = City & { country: string };

type CityData = {
  countries: Readonly<Record<string, string>>;
  timeZones: readonly string[];
  cities: readonly [number, string, string | null, number, number, string, number, number][];
};
type CityIndex = readonly { city: NamedCity; terms: string }[];

function normalize(text: string): string {
  return text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
}

let index: CityIndex | undefined;

async function loadCities(): Promise<CityIndex> {
  if (index) return index;
  const { default: data } = await import('./geonames.generated.json');
  // TypeScript widens imported JSON rows to arrays. The generator writes fixed tuples.
  const { countries, timeZones, cities } = data as unknown as CityData;
  return index ??= cities.map(([id, name, ascii, latitude, longitude, countryCode, zone, population]) => {
    const country = countries[countryCode]!;
    const asciiName = ascii ?? name;
    return {
      city: { id, name, asciiName, latitude, longitude, countryCode, country, timeZone: timeZones[zone]!, population },
      terms: normalize(`${name} ${asciiName} ${country} ${countryCode}`),
    };
  });
}

export async function searchCities(query: string, limit = 12): Promise<NamedCity[]> {
  const words = normalize(query.trim()).split(/\s+/).filter(Boolean);
  const results: NamedCity[] = [];
  if (limit <= 0) return results;
  // The bundled index is already sorted by population, so searches can stop at the result limit.
  for (const { city, terms } of await loadCities()) {
    if (words.every((word) => terms.includes(word))) results.push(city);
    if (results.length >= limit) break;
  }
  return results;
}

const radians = Math.PI / 180;

export async function nearestCity({ latitude, longitude }: Coordinates): Promise<NamedCity | undefined> {
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) return;
  const latitudeWeight = Math.cos(latitude * radians);
  let closest: NamedCity | undefined;
  let shortest = Infinity;
  for (const { city } of await loadCities()) {
    const dLatitude = (city.latitude - latitude) * radians;
    const dLongitude = (city.longitude - longitude) * radians;
    const distance = Math.sin(dLatitude / 2) ** 2 + latitudeWeight * Math.cos(city.latitude * radians) * Math.sin(dLongitude / 2) ** 2;
    if (distance >= shortest) continue;
    shortest = distance;
    closest = city;
  }
  return closest;
}
