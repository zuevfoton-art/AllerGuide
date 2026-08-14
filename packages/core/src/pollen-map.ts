import { classifyPollenConcentration, type PollenTierLevel } from './pollen-thresholds';
import {
  getPollenTaxon,
  profileMatchesPollenTaxon,
  type OpenMeteoPollenTaxonId,
  type PollenTaxonId,
} from './pollen-taxonomy';
import type { ProfileAllergenId } from './profile-allergens';
import {
  pollenUpiFromConcentration,
  type PollenUpiIndex,
} from './pollen-upi';

export const PRIMARY_POLLEN_MAP_TAXON_IDS = [
  'birch_pollen',
  'grass_pollen',
  'ragweed_pollen',
] as const satisfies readonly OpenMeteoPollenTaxonId[];

export const SECONDARY_POLLEN_MAP_TAXON_IDS = [
  'alder_pollen',
  'mugwort_pollen',
  'olive_pollen',
] as const satisfies readonly OpenMeteoPollenTaxonId[];

/** Taxa with Open-Meteo hourly coverage — the only ones we may request from Open-Meteo. */
export const OPEN_METEO_POLLEN_MAP_TAXON_IDS = [
  ...PRIMARY_POLLEN_MAP_TAXON_IDS,
  ...SECONDARY_POLLEN_MAP_TAXON_IDS,
] as const;

/**
 * Taxa observable only through Google Pollen API plant codes (forecast
 * `plantIndexes`); Open-Meteo has no hourly series for them.
 */
export const GOOGLE_PLANT_POLLEN_MAP_TAXON_IDS = [
  'oak_pollen',
  'hazel_pollen',
  'maple_pollen',
  'ash_pollen',
  'poplar_pollen',
  'elm_pollen',
  'juniper_pollen',
  'pine_pollen',
  'cypress_pine_pollen',
  'japanese_cedar_pollen',
  'japanese_cypress_pollen',
] as const satisfies readonly PollenTaxonId[];

export const POLLEN_MAP_TAXON_IDS = [
  ...OPEN_METEO_POLLEN_MAP_TAXON_IDS,
  ...GOOGLE_PLANT_POLLEN_MAP_TAXON_IDS,
] as const;

export type PollenMapTaxonId = (typeof POLLEN_MAP_TAXON_IDS)[number];

export type PollenTypeGroup = 'TREE' | 'GRASS' | 'WEED';

/** Google Pollen type (TREE/GRASS/WEED) each map taxon belongs to. */
export const POLLEN_TYPE_GROUP_BY_TAXON: Record<PollenMapTaxonId, PollenTypeGroup> = {
  birch_pollen: 'TREE',
  alder_pollen: 'TREE',
  olive_pollen: 'TREE',
  oak_pollen: 'TREE',
  hazel_pollen: 'TREE',
  maple_pollen: 'TREE',
  ash_pollen: 'TREE',
  poplar_pollen: 'TREE',
  elm_pollen: 'TREE',
  juniper_pollen: 'TREE',
  pine_pollen: 'TREE',
  cypress_pine_pollen: 'TREE',
  japanese_cedar_pollen: 'TREE',
  japanese_cypress_pollen: 'TREE',
  grass_pollen: 'GRASS',
  ragweed_pollen: 'WEED',
  mugwort_pollen: 'WEED',
};

export function pollenMapTaxonTypeGroup(taxonId: PollenMapTaxonId): PollenTypeGroup {
  return POLLEN_TYPE_GROUP_BY_TAXON[taxonId];
}

export function isPollenMapTaxonId(value: string): value is PollenMapTaxonId {
  return (POLLEN_MAP_TAXON_IDS as readonly string[]).includes(value);
}
export type PollenMapScale = 'place' | 'city' | 'region';
export type PollenMapDirection =
  | 'north'
  | 'northEast'
  | 'east'
  | 'southEast'
  | 'south'
  | 'southWest'
  | 'west'
  | 'northWest';

/** Widget zoom for each pollen map scale control. */
export const POLLEN_MAP_SCALE_ZOOM: Record<PollenMapScale, number> = {
  place: 13,
  city: 11,
  region: 9,
};

export const POLLEN_MAP_SCALES = ['place', 'city', 'region'] as const satisfies readonly PollenMapScale[];

export interface PollenMapReading {
  taxonId: PollenMapTaxonId;
  allergenId: ProfileAllergenId | null;
  value: number;
  level: PollenTierLevel;
  profileRelevant: boolean;
}

export interface OpenMeteoPollenHourly {
  time?: string[];
  birch_pollen?: Array<number | null>;
  grass_pollen?: Array<number | null>;
  ragweed_pollen?: Array<number | null>;
  alder_pollen?: Array<number | null>;
  mugwort_pollen?: Array<number | null>;
  olive_pollen?: Array<number | null>;
}

export type OpenMeteoCurrentPollen = Partial<Record<PollenMapTaxonId, number | null>> & {
  time?: string;
};

export interface NearbyPollenSamplePoint {
  latitude: number;
  longitude: number;
  distanceKm: number;
  direction: PollenMapDirection;
}

export interface NearbyPollenLocation extends NearbyPollenSamplePoint {
  readings: PollenMapReading[];
}

/** One calendar day of pollen levels (daily peak from Open-Meteo hourly). */
export interface PollenForecastDay {
  date: string;
  readings: PollenMapReading[];
}

export interface PollenUpiSnapshot {
  /** Selected taxon UPI 0–5 (Google Forecast or approximated from grains/m³). */
  index: PollenUpiIndex;
  category?: string;
  source: 'google' | 'open-meteo';
}

/** How many calendar days Open-Meteo pollen hourly typically covers. */
export const POLLEN_OPEN_METEO_FORECAST_DAYS = 4;

const SAFE_LOCATION_RADIUS_KM = 20;
const KILOMETERS_PER_LATITUDE_DEGREE = 111.32;
const MIN_LONGITUDE_SCALE = 0.2;

const SAMPLE_DIRECTIONS: Array<{
  direction: PollenMapDirection;
  latitudeFactor: number;
  longitudeFactor: number;
}> = [
  { direction: 'north', latitudeFactor: 1, longitudeFactor: 0 },
  { direction: 'northEast', latitudeFactor: Math.SQRT1_2, longitudeFactor: Math.SQRT1_2 },
  { direction: 'east', latitudeFactor: 0, longitudeFactor: 1 },
  { direction: 'southEast', latitudeFactor: -Math.SQRT1_2, longitudeFactor: Math.SQRT1_2 },
  { direction: 'south', latitudeFactor: -1, longitudeFactor: 0 },
  { direction: 'southWest', latitudeFactor: -Math.SQRT1_2, longitudeFactor: -Math.SQRT1_2 },
  { direction: 'west', latitudeFactor: 0, longitudeFactor: -1 },
  { direction: 'northWest', latitudeFactor: Math.SQRT1_2, longitudeFactor: -Math.SQRT1_2 },
];

const YANDEX_WEATHER_REGION_SLUGS: Record<string, string> = {
  moscow: 'moscow',
  'saint-petersburg': 'saint-petersburg',
  krasnodar: 'krasnodar',
  novosibirsk: 'novosibirsk',
  ekaterinburg: 'yekaterinburg',
};

/**
 * Parse the hour matching Open-Meteo's current timestamp. Missing taxa are
 * omitted so callers can distinguish unavailable CAMS coverage from zero.
 */
export function parseCurrentPollenMapReadings(
  hourly: OpenMeteoPollenHourly,
  currentTime: string | undefined,
  profileAllergenIds: ProfileAllergenId[],
): PollenMapReading[] {
  const timeIndex = resolveCurrentTimeIndex(hourly.time, currentTime);
  if (timeIndex < 0) return [];

  const readings: PollenMapReading[] = [];

  for (const taxonId of OPEN_METEO_POLLEN_MAP_TAXON_IDS) {
    const value = hourly[taxonId]?.[timeIndex];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    readings.push(buildPollenReading(taxonId, value, profileAllergenIds));
  }

  return readings;
}

export function parseOpenMeteoCurrentPollen(
  current: OpenMeteoCurrentPollen,
  profileAllergenIds: ProfileAllergenId[],
): PollenMapReading[] {
  const readings: PollenMapReading[] = [];

  for (const taxonId of OPEN_METEO_POLLEN_MAP_TAXON_IDS) {
    const value = current[taxonId];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    readings.push(buildPollenReading(taxonId, value, profileAllergenIds));
  }

  return readings;
}

/**
 * Collapse Open-Meteo hourly series into daily peak readings per taxon.
 * Used for the multi-day forecast strip when Google Forecast is offline.
 */
export function parseDailyPollenForecast(
  hourly: OpenMeteoPollenHourly,
  profileAllergenIds: ProfileAllergenId[],
): PollenForecastDay[] {
  const times = hourly.time ?? [];
  if (times.length === 0) return [];

  const byDate = new Map<string, Map<PollenMapTaxonId, number>>();

  for (let index = 0; index < times.length; index += 1) {
    const date = times[index]?.slice(0, 10);
    if (!date) continue;

    let dayPeaks = byDate.get(date);
    if (!dayPeaks) {
      dayPeaks = new Map();
      byDate.set(date, dayPeaks);
    }

    for (const taxonId of OPEN_METEO_POLLEN_MAP_TAXON_IDS) {
      const value = hourly[taxonId]?.[index];
      if (typeof value !== 'number' || !Number.isFinite(value)) continue;
      const previous = dayPeaks.get(taxonId);
      if (previous === undefined || value > previous) {
        dayPeaks.set(taxonId, value);
      }
    }
  }

  return [...byDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, peaks]) => ({
      date,
      readings: OPEN_METEO_POLLEN_MAP_TAXON_IDS.flatMap((taxonId) => {
        const value = peaks.get(taxonId);
        return value === undefined
          ? []
          : [buildPollenReading(taxonId, value, profileAllergenIds)];
      }),
    }))
    .filter((day) => day.readings.length > 0);
}

/** Approximate UPI for a reading (Open-Meteo fallback path). */
export function readingToUpiSnapshot(reading: PollenMapReading): PollenUpiSnapshot {
  return {
    index: pollenUpiFromConcentration(reading.value, reading.taxonId),
    source: 'open-meteo',
  };
}

export function buildYandexPollenUrl(regionId: string): string {
  const slug = YANDEX_WEATHER_REGION_SLUGS[regionId] ?? YANDEX_WEATHER_REGION_SLUGS.moscow;
  return `https://yandex.ru/pogoda/ru/${slug}/allergies`;
}

export function buildNearbyPollenSamplePoints(
  latitude: number,
  longitude: number,
): NearbyPollenSamplePoint[] {
  const latitudeDelta = SAFE_LOCATION_RADIUS_KM / KILOMETERS_PER_LATITUDE_DEGREE;
  const longitudeScale = Math.max(
    Math.cos((latitude * Math.PI) / 180),
    MIN_LONGITUDE_SCALE,
  );
  const longitudeDelta =
    SAFE_LOCATION_RADIUS_KM / (KILOMETERS_PER_LATITUDE_DEGREE * longitudeScale);

  return SAMPLE_DIRECTIONS.map(({ direction, latitudeFactor, longitudeFactor }) => ({
    latitude: latitude + latitudeDelta * latitudeFactor,
    longitude: longitude + longitudeDelta * longitudeFactor,
    distanceKm: SAFE_LOCATION_RADIUS_KM,
    direction,
  }));
}

export function selectLowPollenLocations(
  locations: NearbyPollenLocation[],
  taxonId: PollenMapTaxonId,
  limit = 3,
): NearbyPollenLocation[] {
  return locations
    .filter((location) =>
      location.readings.some(
        (reading) => reading.taxonId === taxonId && reading.level === 'low',
      ),
    )
    .sort((left, right) => readingValue(left, taxonId) - readingValue(right, taxonId))
    .slice(0, Math.max(0, limit));
}

/**
 * One on-screen pollen level for the current map scale:
 * place = local point, city = area average, region = area peak.
 */
export function resolveScaledPollenReading(
  centerReadings: PollenMapReading[],
  nearbyLocations: NearbyPollenLocation[],
  taxonId: PollenMapTaxonId,
  scale: PollenMapScale,
): PollenMapReading | null {
  const center = centerReadings.find((reading) => reading.taxonId === taxonId) ?? null;
  const nearbyValues = nearbyLocations
    .map((location) => location.readings.find((reading) => reading.taxonId === taxonId)?.value)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  if (scale === 'place') {
    return center;
  }

  const values = [
    ...(center && Number.isFinite(center.value) ? [center.value] : []),
    ...nearbyValues,
  ];
  if (values.length === 0) return center;

  const value =
    scale === 'region'
      ? Math.max(...values)
      : values.reduce((sum, item) => sum + item, 0) / values.length;

  const reading = buildPollenReading(taxonId, Number(value.toFixed(1)), []);
  return {
    ...reading,
    allergenId: center?.allergenId ?? reading.allergenId,
    profileRelevant: center?.profileRelevant ?? false,
  };
}

function resolveCurrentTimeIndex(times: string[] | undefined, currentTime: string | undefined): number {
  if (!times?.length) return -1;
  if (!currentTime) return 0;

  const exactIndex = times.indexOf(currentTime);
  if (exactIndex >= 0) return exactIndex;

  const currentHour = currentTime.slice(0, 13);
  const sameHourIndex = times.findIndex((time) => time.slice(0, 13) === currentHour);
  return sameHourIndex >= 0 ? sameHourIndex : 0;
}

function readingValue(location: NearbyPollenLocation, taxonId: PollenMapTaxonId): number {
  return (
    location.readings.find((reading) => reading.taxonId === taxonId)?.value ??
    Number.POSITIVE_INFINITY
  );
}

function buildPollenReading(
  taxonId: PollenMapTaxonId,
  value: number,
  profileAllergenIds: ProfileAllergenId[],
): PollenMapReading {
  const taxon = getPollenTaxon(taxonId);
  return {
    taxonId,
    allergenId: taxon?.allergenId ?? null,
    value,
    level: classifyPollenConcentration(value, taxonId),
    profileRelevant: profileMatchesPollenTaxon(profileAllergenIds, taxonId),
  };
}
