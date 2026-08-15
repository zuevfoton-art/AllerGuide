import {
  ActivityIndicator,
  AppState,
  Text,
  View,
  StyleSheet,
  Pressable,
  Linking,
} from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ADAIR_DOCTORS,
  ADAIR_SPECIALIZATION_LABELS,
  buildPlacesMapUrl,
  buildPollenRiskMapUrl,
  buildYandexMapWidgetUrl,
  clampPollenUpiIndex,
  getPollenPeaksForMonth,
  formatPollenMonth,
  OPEN_METEO_POLLEN_MAP_TAXON_IDS,
  POLLEN_MAP_SCALE_ZOOM,
  POLLEN_MAP_TAXON_IDS,
  pollenMapTaxonTypeGroup,
  pollenTaxonToGoogleMapType,
  readingToUpiSnapshot,
  resolvePollenRegion,
  type AirQualitySnapshot,
  type MapPoiCategory,
  type PlaceAutocompleteSuggestion,
  type PollenMapDirection,
  type PollenMapTaxonId,
  type PollenTierLevel,
  type PollenUpiSnapshot,
} from '@allerguide/core';
import { Screen } from '@/src/components/Screen';
import { GlassCard } from '@/src/components/GlassCard';
import { Disclaimer } from '@/src/components/Disclaimer';
import { Button } from '@/src/components/Button';
import { YandexMap } from '@/src/components/YandexMap';
import { GooglePollenMap } from '@/src/components/GooglePollenMap';
import { YandexInteractiveMap } from '@/src/components/YandexInteractiveMap';
import { PollenForecastStrip } from '@/src/components/PollenForecastStrip';
import { PollenIndexCard } from '@/src/components/PollenIndexCard';
import { PollenHeatmapLegend } from '@/src/components/PollenHeatmapLegend';
import { AirQualityCard } from '@/src/components/AirQualityCard';
import { AirQualityLegend } from '@/src/components/AirQualityLegend';
import { PlaceSearchBar } from '@/src/components/PlaceSearchBar';
import { MapPollenAllergenModal } from '@/src/components/MapPollenAllergenModal';
import { MapPoiSheet } from '@/src/components/MapPoiSheet';
import { PollenPlumeOverlay } from '@/src/components/PollenPlumeOverlay';
import { ProfileHeaderButton } from '@/src/components/ProfileHeaderButton';
import { ScreenBrandHeader } from '@/src/components/brand/ScreenBrandHeader';
import { usePollenPlume } from '@/src/hooks/use-pollen-plume';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/src/store/app-store';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import {
  autocompleteMapPlaces,
  createPlacesSessionToken,
  fetchMapPlaceDetails,
  searchMapPlaces,
  type MapPoiWithDistance,
  type PlacesResultSource,
} from '@/src/services/place-service';
import { getCurrentLocation } from '@/src/services/location-service';
import {
  fetchPollenMapSnapshot,
  type PollenMapSnapshot,
} from '@/src/services/pollen-map-service';
import { isGooglePollenHeatmapAvailable } from '@/src/services/pollen-heatmap-service';
import {
  buildAirQualityHeatmapTileUrlTemplate,
  fetchAirQualitySnapshot,
  isAirQualityHeatmapAvailable,
  isGoogleAirQualityAvailable,
} from '@/src/services/air-quality-service';
import { getLocale } from '@/src/services/settings-service';
import { resolveMapBasemap } from '@/src/services/map-basemap';
import {
  fetchPollenHourlySeries,
  resolveHourlyUpi,
  type PollenHourlySeries,
} from '@/src/services/pollen-hourly-service';
import { fetchWindSnapshot, type WindSnapshot } from '@/src/services/wind-service';
import { getApiBaseUrl } from '@/src/services/api-client';
import {
  GOOGLE_MAP_PRIMARY_ENABLED,
  GOOGLE_POLLEN_HEATMAP_ENABLED,
  MAP_POLLEN_GOOGLE_PRIMARY,
  MAP_POLLEN_PLUME_ENABLED,
  YANDEX_MAP_INTERACTIVE_ENABLED,
} from '@/src/constants/features';
import { TAXON_LABEL_KEYS } from '@/src/constants/pollen-taxon-labels';

type MapLayerMode = 'pollen' | 'places' | 'both';

/** Near-real-time refresh while the Map tab is focused. */
const MAP_LIVE_REFRESH_MS = 15 * 60 * 1000;

const LEVEL_LABEL_KEYS: Record<PollenTierLevel, string> = {
  low: 'map.pollenLow',
  mid: 'map.pollenModerate',
  high: 'map.pollenHigh',
};

const DIRECTION_KEYS: Record<PollenMapDirection, 'map.pollenNorth' | 'map.pollenNorthEast' | 'map.pollenEast' | 'map.pollenSouthEast' | 'map.pollenSouth' | 'map.pollenSouthWest' | 'map.pollenWest' | 'map.pollenNorthWest'> = {
  north: 'map.pollenNorth',
  northEast: 'map.pollenNorthEast',
  east: 'map.pollenEast',
  southEast: 'map.pollenSouthEast',
  south: 'map.pollenSouth',
  southWest: 'map.pollenSouthWest',
  west: 'map.pollenWest',
  northWest: 'map.pollenNorthWest',
};

const DEFAULT_POI_CATEGORIES: MapPoiCategory[] = [
  'restaurant',
  'cafe',
  'medical',
  'pharmacy',
];
const MAP_HERO_HEIGHT = 380;
/** How far (degrees) the map center must move before "search this area" shows. */
const SEARCH_AREA_MIN_DELTA_DEG = 0.01;

const WEEKDAY_KEYS = [
  'map.weekdaySun',
  'map.weekdayMon',
  'map.weekdayTue',
  'map.weekdayWed',
  'map.weekdayThu',
  'map.weekdayFri',
  'map.weekdaySat',
] as const;

export default function MapScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const profile = useAppStore((s) => s.activeProfile);

  const [coords, setCoords] = useState({ lat: 55.75, lon: 37.62, label: '' });
  const [pollenSnapshot, setPollenSnapshot] = useState<PollenMapSnapshot | null>(null);
  const [pois, setPois] = useState<MapPoiWithDistance[]>([]);
  const [selectedTaxonId, setSelectedTaxonId] = useState<PollenMapTaxonId>('birch_pollen');
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const [poiCategories, setPoiCategories] =
    useState<MapPoiCategory[]>(DEFAULT_POI_CATEGORIES);
  const [layerMode, setLayerMode] = useState<MapLayerMode>('pollen');
  const [selectedForecastDay, setSelectedForecastDay] = useState<number | null>(null);
  const [doctorsOpen, setDoctorsOpen] = useState(false);
  const [allergenPickerOpen, setAllergenPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [wind, setWind] = useState<WindSnapshot | null>(null);
  const [pollenHourly, setPollenHourly] = useState<PollenHourlySeries | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lon: number } | null>(null);
  const [poiOrigin, setPoiOrigin] = useState<{ lat: number; lon: number } | null>(null);
  const [searchingArea, setSearchingArea] = useState(false);
  const [airLayerOn, setAirLayerOn] = useState(false);
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
          poiCategories,
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
  }, [placeQuery, poiCategories, poiOrigin, profile]);

  const searchThisArea = useCallback(async () => {
    if (!mapCenter) return;
    setSearchingArea(true);
    try {
      const origin = { lat: mapCenter.lat, lon: mapCenter.lon };
      setPoiOrigin(origin);
      const placesResult = await searchMapPlaces(
        profile,
        { latitude: origin.lat, longitude: origin.lon },
        poiCategories,
        placeQuery,
      );
      setPois(placesResult.pois);
      setPlacesSource(placesResult.source);
      setPlaceSearchError(placesResult.liveEmpty ? 'empty' : null);
      setSelectedPoiId(placesResult.pois[0]?.id ?? null);
    } finally {
      setSearchingArea(false);
    }
  }, [mapCenter, placeQuery, poiCategories, profile]);

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

  const pollenMonth = new Date().getMonth() + 1;
  const pollenRegion = resolvePollenRegion(coords.lat, coords.lon);
  const pollenPeaks = getPollenPeaksForMonth(pollenMonth, pollenRegion.id).filter((peak) =>
    POLLEN_MAP_TAXON_IDS.some((taxonId) => taxonId === peak.taxonId),
  );

  const selectedReading =
    pollenSnapshot?.readings.find((reading) => reading.taxonId === selectedTaxonId) ?? null;
  const selectedUpi = pollenSnapshot?.upiByTaxon[selectedTaxonId] ?? null;
  const isCalendarFallback = pollenSnapshot?.source === 'calendar';
  const isCacheSource = pollenSnapshot?.source === 'cache';

  const forecastReading =
    selectedForecastDay != null
      ? pollenSnapshot?.forecastDays[selectedForecastDay]?.readings.find(
          (reading) => reading.taxonId === selectedTaxonId,
        ) ?? null
      : null;
  const statusReading = forecastReading ?? selectedReading;
  const statusLevel = statusReading?.level ?? null;

  const mapBasemap = resolveMapBasemap({
    googleMapsApiKeyPresent: Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()),
    apiBaseUrlPresent: Boolean(getApiBaseUrl().trim()),
    googleMapPrimaryEnabled: GOOGLE_MAP_PRIMARY_ENABLED,
    googlePollenHeatmapEnabled: GOOGLE_POLLEN_HEATMAP_ENABLED,
    yandexInteractiveEnabled: YANDEX_MAP_INTERACTIVE_ENABLED,
  });
  const useGoogleMap = mapBasemap === 'google';
  const useYandexInteractive = mapBasemap === 'yandex-interactive';
  const useHeatmap = isGooglePollenHeatmapAvailable() && layerMode !== 'places';
  const airHeatmapAvailable = isAirQualityHeatmapAvailable() && layerMode !== 'places';
  const showAirLayer = airHeatmapAvailable && airLayerOn;
  const googleMapType =
    useHeatmap && !showAirLayer ? pollenTaxonToGoogleMapType(selectedTaxonId) : null;
  const airTileUrlTemplate = showAirLayer ? buildAirQualityHeatmapTileUrlTemplate() : null;
  const showPlaceMarkers = layerMode === 'places' || layerMode === 'both';
  // Geo plume Circles need Google Maps primitives; Yandex path keeps caption only.
  const showPlumeGeo =
    MAP_POLLEN_PLUME_ENABLED && useGoogleMap && layerMode !== 'places';
  const showPlumeCaption =
    MAP_POLLEN_PLUME_ENABLED &&
    layerMode !== 'places' &&
    (useGoogleMap || useYandexInteractive);

  const tomorrowUpi = useMemo((): PollenUpiSnapshot | null => {
    const reading = pollenSnapshot?.forecastDays[1]?.readings.find(
      (item) => item.taxonId === selectedTaxonId,
    );
    if (!reading) return null;
    if (pollenSnapshot?.source === 'google') {
      return {
        index: clampPollenUpiIndex(reading.value),
        source: 'google',
      };
    }
    return readingToUpiSnapshot(reading);
  }, [pollenSnapshot?.forecastDays, pollenSnapshot?.source, selectedTaxonId]);

  const hourlyUpi = useMemo(
    () => resolveHourlyUpi(pollenHourly, selectedTaxonId),
    [pollenHourly, selectedTaxonId],
  );

  const plume = usePollenPlume({
    enabled: showPlumeGeo,
    originLatitude: coords.lat,
    originLongitude: coords.lon,
    todayUpi: selectedUpi,
    tomorrowUpi,
    hourlyUpi,
    wind,
    accentColor: theme.colors.accent,
  });

  const chipItems = useMemo(() => {
    return POLLEN_MAP_TAXON_IDS.map((taxonId) => {
      const reading = pollenSnapshot?.readings.find((item) => item.taxonId === taxonId);
      const upi = pollenSnapshot?.upiByTaxon[taxonId];
      const isOpenMeteo = (OPEN_METEO_POLLEN_MAP_TAXON_IDS as readonly string[]).includes(taxonId);
      const dataStatus: 'live' | 'google-only' | 'none' =
        upi?.source === 'google' || reading
          ? 'live'
          : isOpenMeteo
            ? 'none'
            : 'google-only';
      return {
        taxonId,
        level: reading?.level ?? null,
        profileRelevant: reading?.profileRelevant ?? false,
        dataStatus,
      };
    });
  }, [pollenSnapshot]);

  const markers = useMemo(() => {
    if (!showPlaceMarkers) return [];
    return pois.map((poi) => ({
      id: poi.id,
      latitude: poi.lat,
      longitude: poi.lng,
      title: poi.title,
      color:
        poi.category === 'restaurant'
          ? theme.colors.success
          : poi.category === 'cafe'
            ? theme.colors.warningText
            : poi.category === 'pharmacy'
              ? theme.colors.warning
              : theme.colors.accent,
    }));
  }, [pois, showPlaceMarkers, theme.colors]);

  const showSearchAreaButton = useMemo(() => {
    if (!showPlaceMarkers || !mapCenter) return false;
    const origin = poiOrigin ?? { lat: coords.lat, lon: coords.lon };
    return (
      Math.abs(mapCenter.lat - origin.lat) > SEARCH_AREA_MIN_DELTA_DEG ||
      Math.abs(mapCenter.lon - origin.lon) > SEARCH_AREA_MIN_DELTA_DEG
    );
  }, [coords.lat, coords.lon, mapCenter, poiOrigin, showPlaceMarkers]);

  const handleRegionChange = useCallback((latitude: number, longitude: number) => {
    setMapCenter({ lat: latitude, lon: longitude });
  }, []);

  const autocompleteRequestId = useRef(0);
  useEffect(() => {
    if (!showPlaceMarkers) {
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
        poiCategories,
        placeSessionToken,
      ).then((suggestions) => {
        if (autocompleteRequestId.current !== requestId) return;
        setPlaceSuggestions(suggestions);
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [coords.lat, coords.lon, mapCenter, placeInput, placeSessionToken, poiCategories, showPlaceMarkers]);

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
          poiCategories,
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
    [coords.lat, coords.lon, mapCenter, poiCategories, poiOrigin, profile],
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

  const yandexPlacesUrl = useMemo(() => {
    if (pois.length === 0) {
      return buildYandexMapWidgetUrl({
        center: { latitude: coords.lat, longitude: coords.lon },
      });
    }
    return buildPlacesMapUrl(
      pois.map((poi) => ({
        id: poi.id,
        title: poi.title,
        note: poi.note,
        level: poi.level,
        icon: poi.icon,
        lat: poi.lat,
        lng: poi.lng,
        tags: poi.tags,
      })),
      selectedPoiId,
    );
  }, [coords.lat, coords.lon, pois, selectedPoiId]);

  const yandexPollenUrl = useMemo(
    () =>
      buildPollenRiskMapUrl({
        center: { latitude: coords.lat, longitude: coords.lon },
        zoom: POLLEN_MAP_SCALE_ZOOM.city,
      }),
    [coords.lat, coords.lon],
  );

  const toggleCategory = useCallback((category: MapPoiCategory) => {
    setPoiCategories((current) => {
      if (current.includes(category)) {
        const next = current.filter((item) => item !== category);
        return next.length > 0 ? next : current;
      }
      return [...current, category];
    });
  }, []);

  const taxonLabel = t(TAXON_LABEL_KEYS[selectedTaxonId] as 'map.pollenBirch');
  const levelLabel = statusLevel
    ? t(LEVEL_LABEL_KEYS[statusLevel])
    : loading && !pollenSnapshot
      ? t('map.pollenLoading')
      : t('map.pollenUnavailable');

  const statusHeadline = useMemo(() => {
    if (loading && !pollenSnapshot) return t('map.pollenLoading');
    if (selectedForecastDay != null && pollenSnapshot?.forecastDays[selectedForecastDay]) {
      const day = pollenSnapshot.forecastDays[selectedForecastDay]!;
      const parsed = new Date(`${day.date}T12:00:00`);
      const dayLabel = Number.isNaN(parsed.getTime())
        ? day.date.slice(5)
        : t(WEEKDAY_KEYS[parsed.getDay()]!);
      return t('map.statusForecastDay', {
        day: dayLabel,
        level: levelLabel,
        taxon: taxonLabel,
      });
    }
    return t('map.statusToday', { level: levelLabel, taxon: taxonLabel });
  }, [levelLabel, loading, pollenSnapshot, selectedForecastDay, t, taxonLabel]);

  const sourceLabel = useMemo(() => {
    if (!pollenSnapshot) return '';
    if (pollenSnapshot.source === 'calendar') return t('map.pollenSourceCalendar');
    if (pollenSnapshot.source === 'cache') return t('map.pollenSourceCache');
    if (pollenSnapshot.source === 'google' || selectedUpi?.source === 'google') {
      return t('map.pollenSourceGoogle');
    }
    return t('map.pollenSourceOpenMeteo');
  }, [pollenSnapshot, selectedUpi?.source, t]);

  const plumeGroupHint = useMemo(() => {
    const mapType = pollenTaxonToGoogleMapType(selectedTaxonId);
    if (mapType === 'GRASS_UPI') return t('map.plumeGroupGrass');
    if (mapType === 'WEED_UPI') return t('map.plumeGroupWeed');
    return t('map.plumeGroupTree');
  }, [selectedTaxonId, t]);

  const updatedLabel = useMemo(() => {
    if (!pollenSnapshot?.updatedAt) return null;
    const parsed = new Date(pollenSnapshot.updatedAt);
    if (Number.isNaN(parsed.getTime())) return null;
    const time = parsed.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return t('map.statusUpdated', { time });
  }, [pollenSnapshot?.updatedAt, t]);

  const levelColor = statusLevel
    ? statusLevel === 'high'
      ? theme.colors.danger
      : statusLevel === 'mid'
        ? theme.colors.warning
        : theme.colors.success
    : theme.colors.textMuted;

  const mapLevelOverlay = (
    <View
      style={[styles.mapLevelOverlay, { borderColor: levelColor }]}
      accessibilityRole="summary">
      <View style={[styles.mapLevelDot, { backgroundColor: levelColor }]} />
      <View style={styles.mapLevelCopy}>
        <Text style={styles.mapLevelTaxon}>
          {taxonLabel}
          {selectedReading?.profileRelevant ? ` · ${t('map.pollenYou')}` : ''}
        </Text>
        <Text style={[styles.mapLevelText, { color: levelColor }]}>
          {statusLevel ? t(LEVEL_LABEL_KEYS[statusLevel]) : t('map.pollenUnavailable')}
        </Text>
      </View>
    </View>
  );

  const plumeCaptionVisible =
    showPlumeCaption && (hourlyUpi ?? selectedUpi?.index ?? plume.upiIndex) > 0;

  const mapOverlay =
    layerMode === 'places' ? undefined : (
      <>
        {plumeCaptionVisible ? <PollenPlumeOverlay groupHint={plumeGroupHint} /> : null}
        {mapLevelOverlay}
      </>
    );

  const mapAttributionKey = useYandexInteractive
    ? 'map.pollenYandexInteractiveAttribution'
    : useGoogleMap
      ? pollenSnapshot?.source === 'google' || MAP_POLLEN_GOOGLE_PRIMARY
        ? null
        : 'map.pollenGoogleMapAttribution'
      : 'map.pollenMapAttribution';

  const safeNearby = useMemo(() => {
    const locations = pollenSnapshot?.nearbyLocations ?? [];
    return locations.filter((location) => {
      const reading = location.readings.find((item) => item.taxonId === selectedTaxonId);
      return reading?.level === 'low';
    });
  }, [pollenSnapshot?.nearbyLocations, selectedTaxonId]);

  const showActionTip = statusLevel === 'mid' || statusLevel === 'high';
  const showPlacesPanel = layerMode === 'places' || layerMode === 'both';

  const statusMetaLine = [
    selectedReading?.profileRelevant && profile?.name
      ? `${t('map.statusForProfile', { name: profile.name })} · ${t('map.pollenYou')}`
      : null,
    [coords.label || pollenRegion.name, sourceLabel, updatedLabel].filter(Boolean).join(' · '),
    isCalendarFallback ? t('map.pollenCalendarFallback') : null,
    isCacheSource ? t('map.pollenSourceCache') : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Screen>
      <ScreenBrandHeader right={<ProfileHeaderButton />} />

      <View
        testID="map-status"
        style={[
          styles.statusCard,
          statusLevel === 'high' && styles.statusHigh,
          statusLevel === 'mid' && styles.statusMid,
          statusLevel === 'low' && styles.statusLow,
        ]}>
        <View style={styles.statusTop}>
          {loading && !pollenSnapshot ? (
            <ActivityIndicator color={theme.colors.accent} />
          ) : (
            <View style={[styles.statusDot, { backgroundColor: levelColor }]} />
          )}
          <Text style={styles.statusHeadline} numberOfLines={1}>
            {statusHeadline}
          </Text>
        </View>
        {statusMetaLine ? (
          <Text style={styles.statusMeta} numberOfLines={1}>
            {statusMetaLine}
          </Text>
        ) : null}
      </View>

      <MapPollenAllergenModal
        visible={allergenPickerOpen}
        items={chipItems}
        selectedTaxonId={selectedTaxonId}
        plants={pollenSnapshot?.plants ?? {}}
        upiByTaxon={pollenSnapshot?.upiByTaxon ?? {}}
        labelForTaxon={(taxonId) => t(TAXON_LABEL_KEYS[taxonId] as 'map.pollenBirch')}
        onSelect={(taxonId) => {
          setSelectedTaxonId(taxonId);
          setSelectedForecastDay(null);
        }}
        onClose={() => setAllergenPickerOpen(false)}
      />

      {useYandexInteractive ? (
        <YandexInteractiveMap
          latitude={coords.lat}
          longitude={coords.lon}
          zoom={POLLEN_MAP_SCALE_ZOOM.city}
          height={MAP_HERO_HEIGHT}
          markers={showPlaceMarkers ? markers : []}
          selectedMarkerId={selectedPoiId}
          onMarkerPress={setSelectedPoiId}
          onRegionChange={handleRegionChange}
          overlay={mapOverlay}
        />
      ) : useGoogleMap ? (
        <GooglePollenMap
          latitude={coords.lat}
          longitude={coords.lon}
          zoom={POLLEN_MAP_SCALE_ZOOM.city}
          mapType={googleMapType}
          tileUrlTemplate={airTileUrlTemplate}
          height={MAP_HERO_HEIGHT}
          interactive
          markers={markers}
          circles={showPlumeGeo ? plume.circles : []}
          polylines={showPlumeGeo ? plume.polylines : []}
          selectedMarkerId={selectedPoiId}
          onMarkerPress={setSelectedPoiId}
          onRegionChange={handleRegionChange}
          overlay={mapOverlay}
        />
      ) : (
        <YandexMap
          url={
            showPlaceMarkers
              ? yandexPlacesUrl || yandexPollenUrl
              : yandexPollenUrl || yandexPlacesUrl
          }
          height={MAP_HERO_HEIGHT}
          interactive={false}
          overlay={mapOverlay}
        />
      )}

      <View style={styles.layerBlock}>
        <View style={styles.layerRow} testID="map-layers">
          {(
            [
              ['pollen', 'map.layerPollen'],
              ['places', 'map.layerPlaces'],
              ['both', 'map.layerBoth'],
            ] as const
          ).map(([key, labelKey]) => {
            const active = layerMode === key;
            return (
              <Pressable
                key={key}
                testID={`map-layer-${key}`}
                style={[styles.layerChip, active && styles.layerChipActive]}
                onPress={() => setLayerMode(key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                hitSlop={8}>
                <Text style={[styles.layerChipText, active && styles.layerChipTextActive]}>
                  {t(labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {layerMode !== 'places' ? (
          <Pressable
            testID="map-allergen-picker"
            style={styles.allergenPickerBtn}
            onPress={() => setAllergenPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('map.allergenPickerTitle')}
            hitSlop={8}>
            <View style={[styles.allergenPickerDot, { backgroundColor: levelColor }]} />
            <Text style={styles.allergenPickerLabel} numberOfLines={1}>
              {t('map.allergenPickerButton', { taxon: taxonLabel })}
            </Text>
            <Ionicons name="chevron-down" size={18} color={theme.colors.accent} />
          </Pressable>
        ) : null}

        {airHeatmapAvailable ? (
          <Pressable
            testID="map-air-layer-toggle"
            style={[styles.airLayerBtn, showAirLayer && styles.airLayerBtnActive]}
            onPress={() => setAirLayerOn((value) => !value)}
            accessibilityRole="button"
            accessibilityState={{ selected: showAirLayer }}
            hitSlop={8}>
            <Ionicons
              name="cloud-outline"
              size={16}
              color={showAirLayer ? theme.colors.accent : theme.colors.textSecondary}
            />
            <Text
              style={[styles.airLayerText, showAirLayer && styles.airLayerTextActive]}>
              {t('map.airLayerToggle')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {showSearchAreaButton ? (
        <Pressable
          testID="map-search-area"
          style={styles.searchAreaBtn}
          onPress={() => void searchThisArea()}
          disabled={searchingArea}
          accessibilityRole="button"
          accessibilityLabel={t('map.searchThisArea')}
          hitSlop={8}>
          {searchingArea ? (
            <ActivityIndicator size="small" color={theme.colors.accent} />
          ) : (
            <Ionicons name="search" size={16} color={theme.colors.accent} />
          )}
          <Text style={styles.searchAreaText}>{t('map.searchThisArea')}</Text>
        </Pressable>
      ) : null}

      {mapAttributionKey ? (
        <Text style={styles.mapAttribution} testID="map-attribution">
          {t(mapAttributionKey)}
        </Text>
      ) : null}

      {!useGoogleMap && !useYandexInteractive ? (
        <Pressable
          style={styles.yandexBanner}
          onPress={() => {
            if (pollenSnapshot) void Linking.openURL(pollenSnapshot.yandexPollenUrl);
          }}
          accessibilityRole="link">
          <Ionicons name="information-circle-outline" size={18} color={theme.colors.warning} />
          <Text style={styles.yandexBannerText}>{t('map.yandexOverviewBanner')}</Text>
          <Ionicons name="open-outline" size={16} color={theme.colors.accent} />
        </Pressable>
      ) : null}

      {!useGoogleMap && showPlacesPanel ? (
        <Text style={styles.listFirstHint}>{t('map.listFirstHint')}</Text>
      ) : null}

      {layerMode === 'places' ? (
        <>
          <Text style={styles.legendTitle}>{t('map.legendTitlePlaces')}</Text>
          <View style={styles.legendRow}>
            <LegendDot color={theme.colors.success} label={t('map.legendRestaurant')} />
            <LegendDot color={theme.colors.warningText} label={t('map.legendCafe')} />
            <LegendDot color={theme.colors.accent} label={t('map.legendMedical')} />
            <LegendDot color={theme.colors.warning} label={t('map.legendPharmacy')} />
          </View>
        </>
      ) : showAirLayer ? (
        <AirQualityLegend />
      ) : (
        <PollenHeatmapLegend group={pollenMapTaxonTypeGroup(selectedTaxonId)} />
      )}

      {showActionTip ? (
        <GlassCard style={styles.tipCard}>
          <Text style={styles.tipText}>
            {statusLevel === 'high' ? t('map.actionTipHigh') : t('map.actionTipModerate')}
          </Text>
          <Button
            label={t('map.actionTipClinicsCta')}
            variant="secondary"
            block
            onPress={() => {
              setLayerMode('places');
              setPoiCategories(['medical']);
            }}
          />
        </GlassCard>
      ) : null}

      {layerMode !== 'places' ? (
        <>
          <PollenIndexCard
            taxonLabel={taxonLabel}
            upi={selectedUpi}
            grainsPerM3={
              pollenSnapshot?.source === 'google' || selectedUpi?.source === 'google'
                ? null
                : selectedReading?.value ?? null
            }
          />
          {isGoogleAirQualityAvailable() ? (
            <AirQualityCard snapshot={airQuality} loading={airQualityLoading} />
          ) : null}

          <PollenForecastStrip
            days={pollenSnapshot?.forecastDays ?? []}
            taxonId={selectedTaxonId}
            selectedDayIndex={selectedForecastDay}
            onSelectDay={setSelectedForecastDay}
          />

          {isCalendarFallback ? (
            <GlassCard style={styles.calendarCard}>
              <Ionicons name="calendar-outline" size={22} color={theme.colors.warning} />
              <View style={styles.calendarBody}>
                <Text style={styles.calendarTitle}>{t('map.pollenCalendarFallback')}</Text>
                {pollenPeaks.length > 0 ? (
                  pollenPeaks.map((peak) => (
                    <Text key={peak.taxonId} style={styles.calendarText}>
                      {peak.label}: {formatPollenMonth(peak.peakMonth)}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.calendarText}>{t('map.pollenNoSeason')}</Text>
                )}
              </View>
            </GlassCard>
          ) : null}

          {safeNearby.length > 0 ? (
            <GlassCard>
              <Text style={styles.calendarTitle}>{t('map.safePollenPlaces')}</Text>
              <Text style={styles.calendarText}>{t('map.safePollenPlacesHint')}</Text>
              {safeNearby.slice(0, 4).map((location) => (
                <Text
                  key={`${location.latitude}-${location.longitude}`}
                  style={styles.safePoint}>
                  {t(DIRECTION_KEYS[location.direction])}
                  {' · '}
                  {t('map.pollenDistance', {
                    distance: String(Math.round(location.distanceKm)),
                  })}
                </Text>
              ))}
            </GlassCard>
          ) : null}
        </>
      ) : null}

      {showPlacesPanel ? (
        <>
          <PlaceSearchBar
            value={placeInput}
            suggestions={placeSuggestions}
            loading={placeSearchLoading}
            error={
              placeSearchError === 'empty'
                ? t('map.placeSearchNothingFound')
                : null
            }
            sourceLabel={
              placesSource === 'catalog'
                ? t('map.placeSearchOfflineCatalog')
                : placesSource === 'google-places'
                  ? t('map.placeSourceGoogle')
                  : placesSource === 'adair'
                    ? t('map.placeSourceCatalog')
                    : null
            }
            onChange={setPlaceInput}
            onSubmit={(value) => {
              void runPlaceSearch(value);
            }}
            onSelectSuggestion={(suggestion) => {
              void handleSelectSuggestion(suggestion);
            }}
            onClear={() => {
              setPlaceInput('');
              setPlaceQuery('');
              setPlaceSuggestions([]);
              setPlaceSessionToken(createPlacesSessionToken());
              void runPlaceSearch('');
            }}
          />
          <MapPoiSheet
            pois={pois}
            selectedId={selectedPoiId}
            categories={poiCategories}
            onSelect={setSelectedPoiId}
            onToggleCategory={toggleCategory}
          />
        </>
      ) : null}

      <Pressable
        testID="map-doctors-toggle"
        style={styles.doctorsToggle}
        onPress={() => setDoctorsOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: doctorsOpen }}>
        <Text style={styles.sectionTitle}>
          {doctorsOpen ? t('map.doctorsHide') : t('map.doctorsShow')}
        </Text>
        <Ionicons
          name={doctorsOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={theme.colors.textMuted}
        />
      </Pressable>
      {doctorsOpen
        ? ADAIR_DOCTORS.map((doctor) => (
            <GlassCard key={doctor.id} style={styles.card}>
              <View style={[styles.cardIcon, { backgroundColor: theme.colors.successLight }]}>
                <Ionicons name="person" size={22} color={theme.colors.success} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{doctor.name}</Text>
                <Text style={styles.cardNote}>{doctor.degree}</Text>
                <Text style={styles.tags}>
                  {ADAIR_SPECIALIZATION_LABELS[doctor.specialization]}
                </Text>
                {doctor.isChiefExpert ? (
                  <Text style={styles.chiefBadge}>{t('map.chiefExpert')}</Text>
                ) : null}
                {doctor.phone ? (
                  <Pressable
                    onPress={() => void Linking.openURL(`tel:${doctor.phone!}`)}
                    accessibilityRole="link"
                    hitSlop={8}>
                    <Text style={[styles.tags, styles.phoneLink]}>{doctor.phone}</Text>
                  </Pressable>
                ) : null}
                {doctor.bookingUrl ? (
                  <Pressable
                    onPress={() => void Linking.openURL(doctor.bookingUrl!)}
                    accessibilityRole="link"
                    hitSlop={8}>
                    <Text style={styles.phoneLink}>{t('map.poiBook')}</Text>
                  </Pressable>
                ) : null}
              </View>
            </GlassCard>
          ))
        : null}

      <Disclaimer>{t('map.disclaimerUnified')}</Disclaimer>
    </Screen>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text
        style={{
          fontFamily: theme.fonts.sans,
          fontSize: 11,
          color: theme.colors.textMuted,
        }}>
        {label}
      </Text>
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    statusCard: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingVertical: 10,
      paddingHorizontal: 12,
      gap: 4,
    },
    statusHigh: {
      backgroundColor: colors.dangerLight,
      borderColor: colors.dangerBorder,
    },
    statusMid: {
      backgroundColor: colors.warningLight,
      borderColor: colors.warningBorder,
    },
    statusLow: {
      backgroundColor: colors.successLight,
      borderColor: colors.successBorder,
    },
    statusTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    statusDot: { width: 12, height: 12, borderRadius: 6 },
    statusHeadline: {
      flex: 1,
      fontFamily: fonts.sansBold,
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    statusMeta: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 16,
    },
    layerBlock: { gap: 8 },
    layerRow: { flexDirection: 'row', gap: 8 },
    layerChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    layerChipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    layerChipText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    layerChipTextActive: { color: colors.accent },
    allergenPickerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 44,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    allergenPickerDot: { width: 8, height: 8, borderRadius: 4 },
    searchAreaBtn: {
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.card,
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginTop: 4,
    },
    searchAreaText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
    },
    airLayerBtn: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 36,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    airLayerBtnActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    airLayerText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    airLayerTextActive: { color: colors.accent },
    allergenPickerLabel: {
      flex: 1,
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.accent,
    },
    legendTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
      marginTop: 2,
    },
    legendRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
    },
    mapAttribution: {
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.textMuted,
      lineHeight: 14,
    },
    mapLevelOverlay: {
      position: 'absolute',
      top: 8,
      right: 8,
      minHeight: 42,
      maxWidth: 200,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 8,
      borderWidth: 1.5,
      backgroundColor: colors.card,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    mapLevelDot: { width: 10, height: 10, borderRadius: 5 },
    mapLevelCopy: { flexShrink: 1, gap: 1 },
    mapLevelTaxon: {
      fontFamily: fonts.sans,
      fontSize: 10,
      color: colors.textMuted,
    },
    mapLevelText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      color: colors.text,
    },
    yandexBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.warningBorder,
      backgroundColor: colors.warningLight,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    yandexBannerText: {
      flex: 1,
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.warningText,
      lineHeight: 16,
    },
    listFirstHint: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 16,
    },
    tipCard: { gap: 10 },
    tipText: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    sectionTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      color: colors.head,
      marginTop: 4,
    },
    calendarCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
    calendarBody: { flex: 1, gap: 4 },
    calendarTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      color: colors.text,
    },
    calendarText: { fontFamily: fonts.sans, fontSize: 12, color: colors.textSecondary },
    safePoint: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 4,
    },
    doctorsToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 0,
    },
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardBody: { flex: 1, gap: 6 },
    cardTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    cardNote: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    tags: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
    },
    chiefBadge: {
      alignSelf: 'flex-start',
      fontFamily: fonts.sansSemiBold,
      fontSize: 10,
      fontWeight: '600',
      color: colors.accent,
      backgroundColor: colors.accentLight,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      overflow: 'hidden',
    },
    phoneLink: {
      color: colors.accent,
      textDecorationLine: 'underline',
    },
  });
}
