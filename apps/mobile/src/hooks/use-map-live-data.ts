import { AppState } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  DEFAULT_PLACE_FILTERS,
  type AirQualitySnapshot,
  type MapPlaceFilterId,
  type PlaceAutocompleteSuggestion,
  type Profile,
} from '@allerguide/core';
import { useAppStore } from '@/src/store/app-store';
import {
  autocompleteMapPlaces,
  createPlacesSessionToken,
  fetchMapPlaceDetails,
  searchMapPlaces,
  type MapPoiWithDistance,
  type MapPlacesResult,
  type PlacesResultSource,
} from '@/src/services/place-service';
import { getCurrentLocation } from '@/src/services/location-service';
import {
  fetchPollenMapSnapshot,
  type PollenMapSnapshot,
} from '@/src/services/pollen-map-service';
import {
  fetchAirQualitySnapshot,
  isGoogleAirQualityAvailable,
} from '@/src/services/air-quality-service';
import { getLocale } from '@/src/services/settings-service';
import {
  fetchPollenHourlySeries,
  type PollenHourlySeries,
} from '@/src/services/pollen-hourly-service';
import { fetchWindSnapshot, type WindSnapshot } from '@/src/services/wind-service';
import { MAP_POLLEN_PLUME_ENABLED } from '@/src/constants/features';

/** Near-real-time refresh while the Map tab is focused. */
export const MAP_LIVE_REFRESH_MS = 15 * 60 * 1000;

export type MapLiveCoords = { lat: number; lon: number; label: string };
export type MapLatLon = { lat: number; lon: number };

export type MapLiveRefreshResult = {
  coords: MapLiveCoords;
  pollenSnapshot: PollenMapSnapshot;
  placesResult: MapPlacesResult;
  wind: WindSnapshot | null;
  pollenHourly: PollenHourlySeries | null;
  airQuality: AirQualitySnapshot | null;
};

export type RefreshMapLiveDataParams = {
  placeQuery: string;
  placeFilters: readonly MapPlaceFilterId[];
  poiOrigin: MapLatLon | null;
  profile: Profile | null | undefined;
};

export type SearchMapThisAreaParams = {
  mapCenter: MapLatLon | null;
  placeQuery: string;
  placeFilters: readonly MapPlaceFilterId[];
  profile: Profile | null | undefined;
};

/**
 * Fetches location, pollen, places, and optional wind / hourly / air-quality.
 * `refresh` in `useMapLiveData` applies this result to screen state.
 */
export async function refreshMapLiveData(
  params: RefreshMapLiveDataParams,
): Promise<MapLiveRefreshResult> {
  const location = await getCurrentLocation();
  const origin = params.poiOrigin ?? { lat: location.lat, lon: location.lon };
  const [pollenSnapshot, placesResult, wind, pollenHourly, airQuality] = await Promise.all([
    fetchPollenMapSnapshot(location, params.profile?.allergies ?? '[]'),
    searchMapPlaces(
      params.profile,
      { latitude: origin.lat, longitude: origin.lon },
      params.placeFilters,
      params.placeQuery,
    ),
    MAP_POLLEN_PLUME_ENABLED
      ? fetchWindSnapshot(location.lat, location.lon)
      : Promise.resolve(null),
    MAP_POLLEN_PLUME_ENABLED
      ? fetchPollenHourlySeries(location.lat, location.lon)
      : Promise.resolve(null),
    isGoogleAirQualityAvailable()
      ? fetchAirQualitySnapshot(location.lat, location.lon, getLocale() ?? 'ru')
      : Promise.resolve(null),
  ]);
  return {
    coords: { lat: location.lat, lon: location.lon, label: location.label },
    pollenSnapshot,
    placesResult,
    wind,
    pollenHourly,
    airQuality,
  };
}

/** Nearby search anchored at the current map center ("search this area"). */
export async function searchMapThisArea(
  params: SearchMapThisAreaParams,
): Promise<{ origin: MapLatLon; placesResult: MapPlacesResult } | null> {
  if (!params.mapCenter) return null;
  const origin = { lat: params.mapCenter.lat, lon: params.mapCenter.lon };
  const placesResult = await searchMapPlaces(
    params.profile,
    { latitude: origin.lat, longitude: origin.lon },
    params.placeFilters,
    params.placeQuery,
  );
  return { origin, placesResult };
}

type UseMapLiveDataOptions = {
  /** Places-layer autocomplete should only run while the places layer is visible. */
  placesLayerActive: boolean;
};

export function useMapLiveData({ placesLayerActive }: UseMapLiveDataOptions) {
  const profile = useAppStore((s) => s.activeProfile);

  const [coords, setCoords] = useState<MapLiveCoords>({ lat: 55.75, lon: 37.62, label: '' });
  const [pollenSnapshot, setPollenSnapshot] = useState<PollenMapSnapshot | null>(null);
  const [pois, setPois] = useState<MapPoiWithDistance[]>([]);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const [placeFilters, setPlaceFilters] =
    useState<MapPlaceFilterId[]>([...DEFAULT_PLACE_FILTERS]);
  const [loading, setLoading] = useState(true);
  const [wind, setWind] = useState<WindSnapshot | null>(null);
  const [pollenHourly, setPollenHourly] = useState<PollenHourlySeries | null>(null);
  const [mapCenter, setMapCenter] = useState<MapLatLon | null>(null);
  const [poiOrigin, setPoiOrigin] = useState<MapLatLon | null>(null);
  const [searchingArea, setSearchingArea] = useState(false);
  const [airQuality, setAirQuality] = useState<AirQualitySnapshot | null>(null);
  const [airQualityLoading, setAirQualityLoading] = useState(false);
  const [placeInput, setPlaceInput] = useState('');
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceAutocompleteSuggestion[]>([]);
  const [placeSearchLoading, setPlaceSearchLoading] = useState(false);
  const [placeSearchError, setPlaceSearchError] = useState<string | null>(null);
  const [placesSource, setPlacesSource] = useState<PlacesResultSource>('empty');
  const [placeSessionToken, setPlaceSessionToken] = useState(createPlacesSessionToken);

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    try {
      const location = await getCurrentLocation();
      setCoords({ lat: location.lat, lon: location.lon, label: location.label });
      const origin = poiOrigin ?? { lat: location.lat, lon: location.lon };
      setAirQualityLoading(true);
      const [snapshot, placesResult, windSnapshot, hourlySeries, airSnapshot] = await Promise.all([
        fetchPollenMapSnapshot(location, profile?.allergies ?? '[]'),
        searchMapPlaces(
          profile,
          { latitude: origin.lat, longitude: origin.lon },
          placeFilters,
          placeQuery,
        ),
        MAP_POLLEN_PLUME_ENABLED
          ? fetchWindSnapshot(location.lat, location.lon)
          : Promise.resolve(null),
        MAP_POLLEN_PLUME_ENABLED
          ? fetchPollenHourlySeries(location.lat, location.lon)
          : Promise.resolve(null),
        isGoogleAirQualityAvailable()
          ? fetchAirQualitySnapshot(location.lat, location.lon, getLocale() ?? 'ru')
          : Promise.resolve(null),
      ]);
      setPollenSnapshot(snapshot);
      setPois(placesResult.pois);
      setPlacesSource(placesResult.source);
      setPlaceSearchError(
        placesResult.liveEmpty ? 'empty' : placesResult.source === 'empty' ? 'empty' : null,
      );
      setWind(windSnapshot);
      setPollenHourly(hourlySeries);
      setAirQuality(airSnapshot);
      setAirQualityLoading(false);
      setSelectedPoiId((current) =>
        current && placesResult.pois.some((poi) => poi.id === current)
          ? current
          : placesResult.pois[0]?.id ?? null,
      );
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [placeQuery, placeFilters, poiOrigin, profile]);

  const searchThisArea = useCallback(async () => {
    if (!mapCenter) return;
    setSearchingArea(true);
    try {
      const origin = { lat: mapCenter.lat, lon: mapCenter.lon };
      setPoiOrigin(origin);
      const placesResult = await searchMapPlaces(
        profile,
        { latitude: origin.lat, longitude: origin.lon },
        placeFilters,
        placeQuery,
      );
      setPois(placesResult.pois);
      setPlacesSource(placesResult.source);
      setPlaceSearchError(placesResult.liveEmpty ? 'empty' : null);
      setSelectedPoiId(placesResult.pois[0]?.id ?? null);
    } finally {
      setSearchingArea(false);
    }
  }, [mapCenter, placeQuery, placeFilters, profile]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      const timer = setInterval(() => {
        if (AppState.currentState === 'active') {
          void refresh({ silent: true });
        }
      }, MAP_LIVE_REFRESH_MS);
      return () => clearInterval(timer);
    }, [refresh]),
  );

  const handleRegionChange = useCallback((latitude: number, longitude: number) => {
    setMapCenter({ lat: latitude, lon: longitude });
  }, []);

  const autocompleteRequestId = useRef(0);
  useEffect(() => {
    if (!placesLayerActive) {
      setPlaceSuggestions([]);
      return;
    }
    const query = placeInput.trim();
    if (query.length < 2) {
      setPlaceSuggestions([]);
      return;
    }
    const origin = mapCenter ?? { lat: coords.lat, lon: coords.lon };
    const requestId = autocompleteRequestId.current + 1;
    autocompleteRequestId.current = requestId;
    const timer = setTimeout(() => {
      void autocompleteMapPlaces(
        { latitude: origin.lat, longitude: origin.lon },
        query,
        placeFilters,
        placeSessionToken,
      ).then((suggestions) => {
        if (autocompleteRequestId.current !== requestId) return;
        setPlaceSuggestions(suggestions);
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [
    coords.lat,
    coords.lon,
    mapCenter,
    placeInput,
    placeSessionToken,
    placeFilters,
    placesLayerActive,
  ]);

  const runPlaceSearch = useCallback(
    async (query: string) => {
      const origin = mapCenter ?? poiOrigin ?? { lat: coords.lat, lon: coords.lon };
      setPlaceQuery(query);
      setPlaceSearchLoading(true);
      setPlaceSuggestions([]);
      try {
        const placesResult = await searchMapPlaces(
          profile,
          { latitude: origin.lat, longitude: origin.lon },
          placeFilters,
          query,
        );
        setPois(placesResult.pois);
        setPlacesSource(placesResult.source);
        setPlaceSearchError(placesResult.liveEmpty ? 'empty' : null);
        setSelectedPoiId(placesResult.pois[0]?.id ?? null);
      } finally {
        setPlaceSearchLoading(false);
      }
    },
    [coords.lat, coords.lon, mapCenter, placeFilters, poiOrigin, profile],
  );

  const handleSelectSuggestion = useCallback(
    async (suggestion: PlaceAutocompleteSuggestion) => {
      setPlaceInput(suggestion.primaryText);
      setPlaceSuggestions([]);
      const details = await fetchMapPlaceDetails(suggestion.placeId, placeSessionToken);
      setPlaceSessionToken(createPlacesSessionToken());
      if (details) {
        setPois((current) => {
          const next = [details, ...current.filter((poi) => poi.id !== details.id)];
          return next;
        });
        setSelectedPoiId(details.id);
        setMapCenter({ lat: details.lat, lon: details.lng });
        setPlacesSource('google-places');
        return;
      }
      await runPlaceSearch(suggestion.primaryText);
    },
    [placeSessionToken, runPlaceSearch],
  );

  const togglePlaceFilter = useCallback((filter: MapPlaceFilterId) => {
    setPlaceFilters((current) => {
      if (current.includes(filter)) {
        const next = current.filter((item) => item !== filter);
        return next.length > 0 ? next : current;
      }
      return [...current, filter];
    });
  }, []);

  const clearPlaceSearch = useCallback(() => {
    setPlaceInput('');
    setPlaceQuery('');
    setPlaceSuggestions([]);
    setPlaceSessionToken(createPlacesSessionToken());
    void runPlaceSearch('');
  }, [runPlaceSearch]);

  return {
    coords,
    pollenSnapshot,
    pois,
    loading,
    wind,
    pollenHourly,
    airQuality,
    airQualityLoading,
    placesSource,
    placeSearchError,
    selectedPoiId,
    setSelectedPoiId,
    poiOrigin,
    placeFilters,
    setPlaceFilters,
    togglePlaceFilter,
    placeQuery,
    placeInput,
    setPlaceInput,
    placeSuggestions,
    placeSearchLoading,
    mapCenter,
    searchingArea,
    refresh,
    searchThisArea,
    runPlaceSearch,
    handleSelectSuggestion,
    handleRegionChange,
    clearPlaceSearch,
  };
}
