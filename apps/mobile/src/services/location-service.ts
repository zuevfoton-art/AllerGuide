import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { getDefaultPollenRegion, POLLEN_REGIONS, resolvePollenRegion } from '@allerguide/core';
import { getSetting, setSetting } from '@/src/services/settings-service';

const LOCATION_CACHE_KEY = 'wellnessLocationCache';
const MANUAL_REGION_KEY = 'manualPollenRegionId';

export type ResolvedLocation = {
  lat: number;
  lon: number;
  label: string;
  regionId: string;
  source: 'gps' | 'manual' | 'default';
};

type CachedLocation = {
  lat: number;
  lon: number;
  label: string;
  regionId: string;
  cachedAt: string;
};

const CACHE_TTL_MS = 30 * 60 * 1000;

function readCache(): CachedLocation | null {
  const raw = getSetting(LOCATION_CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedLocation;
    const age = Date.now() - Date.parse(parsed.cachedAt);
    if (Number.isNaN(age) || age > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(location: ResolvedLocation): void {
  const payload: CachedLocation = {
    lat: location.lat,
    lon: location.lon,
    label: location.label,
    regionId: location.regionId,
    cachedAt: new Date().toISOString(),
  };
  setSetting(LOCATION_CACHE_KEY, JSON.stringify(payload));
}

export function getManualPollenRegionId(): string | null {
  const raw = getSetting(MANUAL_REGION_KEY);
  if (!raw) return null;
  return POLLEN_REGIONS.some((r) => r.id === raw) ? raw : null;
}

export function setManualPollenRegionId(regionId: string | null): void {
  if (!regionId) {
    setSetting(MANUAL_REGION_KEY, '');
    return;
  }
  setSetting(MANUAL_REGION_KEY, regionId);
}

export function resolveLocationFromManualRegion(): ResolvedLocation | null {
  const manualId = getManualPollenRegionId();
  if (!manualId) return null;
  const region = POLLEN_REGIONS.find((r) => r.id === manualId);
  if (!region) return null;
  return {
    lat: region.lat,
    lon: region.lon,
    label: region.name,
    regionId: region.id,
    source: 'manual',
  };
}

export function getDefaultResolvedLocation(): ResolvedLocation {
  const region = getDefaultPollenRegion();
  return {
    lat: region.lat,
    lon: region.lon,
    label: region.name,
    regionId: region.id,
    source: 'default',
  };
}

export async function getCurrentLocation(options?: {
  forceRefresh?: boolean;
}): Promise<ResolvedLocation> {
  const manual = resolveLocationFromManualRegion();
  if (manual) return manual;

  if (!options?.forceRefresh) {
    const cached = readCache();
    if (cached) {
      return { ...cached, source: 'gps' };
    }
  }

  if (Platform.OS === 'web') {
    return getDefaultResolvedLocation();
  }

  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      return getDefaultResolvedLocation();
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = position.coords;
    const region = resolvePollenRegion(latitude, longitude);
    const resolved: ResolvedLocation = {
      lat: latitude,
      lon: longitude,
      label: region.name,
      regionId: region.id,
      source: 'gps',
    };
    writeCache(resolved);
    return resolved;
  } catch {
    return getDefaultResolvedLocation();
  }
}

export function listPollenRegionOptions(): { id: string; name: string }[] {
  return POLLEN_REGIONS.map((region) => ({ id: region.id, name: region.name }));
}
