import { haversineDistanceKm } from './geo';

export interface PollenRegion {
  id: string;
  name: string;
  lat: number;
  lon: number;
  timezone: string;
}

/** Reference regions for EAACI / GA²LEN-style pollen calendars (B.2). */
export const POLLEN_REGIONS: PollenRegion[] = [
  {
    id: 'moscow',
    name: 'Москва и Московская область',
    lat: 55.75,
    lon: 37.62,
    timezone: 'Europe/Moscow',
  },
  {
    id: 'saint-petersburg',
    name: 'Санкт-Петербург и Ленинградская область',
    lat: 59.93,
    lon: 30.32,
    timezone: 'Europe/Moscow',
  },
  {
    id: 'krasnodar',
    name: 'Краснодарский край (Юг России)',
    lat: 45.04,
    lon: 38.98,
    timezone: 'Europe/Moscow',
  },
  {
    id: 'novosibirsk',
    name: 'Новосибирск и Сибирь',
    lat: 55.03,
    lon: 82.92,
    timezone: 'Asia/Novosibirsk',
  },
  {
    id: 'ekaterinburg',
    name: 'Екатеринбург и Урал',
    lat: 56.84,
    lon: 60.6,
    timezone: 'Asia/Yekaterinburg',
  },
];

const regionById = new Map(POLLEN_REGIONS.map((item) => [item.id, item]));

export const DEFAULT_POLLEN_REGION_ID = 'moscow';

export function getPollenRegion(regionId: string): PollenRegion | undefined {
  return regionById.get(regionId);
}

export function getDefaultPollenRegion(): PollenRegion {
  return regionById.get(DEFAULT_POLLEN_REGION_ID)!;
}

/** Pick the nearest reference pollen region for coordinates (B.2). */
export function resolvePollenRegion(lat: number, lon: number): PollenRegion {
  let best = getDefaultPollenRegion();
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const region of POLLEN_REGIONS) {
    const distance = haversineDistanceKm(
      { latitude: lat, longitude: lon },
      { latitude: region.lat, longitude: region.lon },
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      best = region;
    }
  }

  return best;
}
