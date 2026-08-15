import {
  buildPollenPlantDetail,
  googlePlantCodeToTaxon,
  type PollenPlantDetail,
} from './pollen-plant-detail';
import type { PollenMapTaxonId, PollenUpiSnapshot } from './pollen-map';
import {
  clampPollenUpiIndex,
  googleIndexColorToHex,
  pollenUpiFallbackColor,
} from './pollen-upi';

export type GooglePlantCoverageEntry = {
  code: string;
  taxonId: PollenMapTaxonId | null;
  hasIndex: boolean;
};

export interface GooglePollenForecastDay {
  date: string;
  typeIndexes: Partial<Record<'TREE' | 'GRASS' | 'WEED', PollenUpiSnapshot>>;
  plantIndexes: Partial<Record<PollenMapTaxonId, PollenUpiSnapshot>>;
  plants: Partial<Record<PollenMapTaxonId, PollenPlantDetail>>;
  /** Raw plantInfo codes for staging debug (with/without indexInfo). */
  plantCoverage: GooglePlantCoverageEntry[];
}

export interface GooglePollenForecastResult {
  regionCode: string | null;
  days: GooglePollenForecastDay[];
  plants: Partial<Record<PollenMapTaxonId, PollenPlantDetail>>;
}

export interface GoogleForecastIndexInfo {
  value?: number;
  category?: string;
  indexDescription?: string;
  color?: { red?: number; green?: number; blue?: number };
}

export interface GoogleForecastPlantInfo {
  code?: string;
  displayName?: string;
  inSeason?: boolean;
  indexInfo?: GoogleForecastIndexInfo;
  plantDescription?: {
    family?: string;
    season?: string;
    specialColors?: string;
    specialShapes?: string;
    picture?: string;
    crossReaction?: string;
  };
}

export interface GoogleForecastDayInfo {
  date?: { year?: number; month?: number; day?: number };
  pollenTypeInfo?: Array<{
    code?: string;
    indexInfo?: GoogleForecastIndexInfo;
    healthRecommendations?: string[];
  }>;
  plantInfo?: GoogleForecastPlantInfo[];
}

export interface GoogleForecastPayload {
  regionCode?: string;
  dailyInfo?: GoogleForecastDayInfo[];
}

function snapshotFromIndexInfo(indexInfo: GoogleForecastIndexInfo): PollenUpiSnapshot | null {
  if (typeof indexInfo.value !== 'number') return null;
  const index = clampPollenUpiIndex(indexInfo.value);
  return {
    index,
    category: indexInfo.category,
    color: googleIndexColorToHex(indexInfo.color) ?? pollenUpiFallbackColor(index),
    source: 'google',
  };
}

function formatGoogleDate(date: GoogleForecastDayInfo['date']): string | null {
  if (!date?.year || !date?.month || !date?.day) return null;
  const month = String(date.month).padStart(2, '0');
  const day = String(date.day).padStart(2, '0');
  return `${date.year}-${month}-${day}`;
}

/**
 * Normalize a Google Pollen `forecast:lookup` payload into map taxa, UPI, and
 * plant education fields. Tree species never inherit the aggregated TREE index.
 */
export function normalizeGooglePollenForecast(
  payload: GoogleForecastPayload,
): GooglePollenForecastResult {
  const days: GooglePollenForecastDay[] = [];
  const plants: Partial<Record<PollenMapTaxonId, PollenPlantDetail>> = {};

  for (const dayInfo of payload.dailyInfo ?? []) {
    const date = formatGoogleDate(dayInfo.date);
    if (!date) continue;

    const typeIndexes: GooglePollenForecastDay['typeIndexes'] = {};
    const typeRecommendations: Partial<Record<'TREE' | 'GRASS' | 'WEED', string[]>> = {};
    for (const typeInfo of dayInfo.pollenTypeInfo ?? []) {
      const code = typeInfo.code?.toUpperCase();
      if (code !== 'TREE' && code !== 'GRASS' && code !== 'WEED') continue;
      const snapshot = typeInfo.indexInfo ? snapshotFromIndexInfo(typeInfo.indexInfo) : null;
      if (snapshot) typeIndexes[code] = snapshot;
      const recommendations = (typeInfo.healthRecommendations ?? [])
        .map((item) => item.trim())
        .filter(Boolean);
      if (recommendations.length > 0) typeRecommendations[code] = recommendations;
    }

    const plantIndexes: GooglePollenForecastDay['plantIndexes'] = {};
    const dayPlants: GooglePollenForecastDay['plants'] = {};
    const plantCoverage: GooglePlantCoverageEntry[] = [];

    for (const plant of dayInfo.plantInfo ?? []) {
      const code = typeof plant.code === 'string' ? plant.code.trim().toUpperCase() : '';
      if (!code) continue;
      const taxonId = googlePlantCodeToTaxon(code);
      const snapshot = plant.indexInfo ? snapshotFromIndexInfo(plant.indexInfo) : null;
      const hasIndex = snapshot !== null;
      plantCoverage.push({ code, taxonId, hasIndex });

      if (!taxonId) continue;
      if (snapshot) plantIndexes[taxonId] = snapshot;

      const typeKey =
        taxonId.endsWith('_pollen') && typeIndexes.GRASS && taxonId === 'grass_pollen'
          ? 'GRASS'
          : taxonId === 'ragweed_pollen' || taxonId === 'mugwort_pollen'
            ? 'WEED'
            : 'TREE';

      const detail = buildPollenPlantDetail(taxonId, {
        displayName: plant.displayName,
        family: plant.plantDescription?.family,
        season: plant.plantDescription?.season,
        specialColors: plant.plantDescription?.specialColors,
        specialShapes: plant.plantDescription?.specialShapes,
        picture: plant.plantDescription?.picture,
        crossReaction: plant.plantDescription?.crossReaction,
        inSeason: plant.inSeason,
        indexDescription: plant.indexInfo?.indexDescription,
        indexColor: snapshot?.color,
        healthRecommendations: typeRecommendations[typeKey],
      });
      dayPlants[taxonId] = detail;
      if (!plants[taxonId]) plants[taxonId] = detail;
    }

    days.push({ date, typeIndexes, plantIndexes, plants: dayPlants, plantCoverage });
  }

  return {
    regionCode: payload.regionCode ?? null,
    days,
    plants,
  };
}
