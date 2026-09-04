import { Text, View } from 'react-native';
import { useMemo, useState } from 'react';
import {
  buildPlacesMapUrl,
  buildPollenRiskMapUrl,
  buildYandexMapWidgetUrl,
  clampPollenUpiIndex,
  hasGoogleGroupHeatmap,
  resolveOfficialHeatmapMapType,
  getPollenPeaksForMonth,
  OPEN_METEO_POLLEN_MAP_TAXON_IDS,
  POLLEN_MAP_SCALE_ZOOM,
  POLLEN_MAP_TAXON_IDS,
  pollenMapTaxonTypeGroup,
  pollenTaxonToGoogleMapType,
  readingToUpiSnapshot,
  resolvePollenRegion,
  type PollenMapTaxonId,
  type PollenUpiSnapshot,
} from '@allerguide/core';
import { Screen } from '@/src/components/Screen';
import { GlassCard } from '@/src/components/GlassCard';
import { Disclaimer } from '@/src/components/Disclaimer';
import { Button } from '@/src/components/Button';
import { MapPollenAllergenModal } from '@/src/components/MapPollenAllergenModal';
import { PollenPlumeOverlay } from '@/src/components/PollenPlumeOverlay';
import { ProfileHeaderButton } from '@/src/components/ProfileHeaderButton';
import { MapCanvas } from '@/src/components/map/MapCanvas';
import { MapDoctorsSection } from '@/src/components/map/MapDoctorsSection';
import { MapLayerLegend } from '@/src/components/map/MapLayerLegend';
import { MapLayerSwitcher } from '@/src/components/map/MapLayerSwitcher';
import { MapPlacesPanel } from '@/src/components/map/MapPlacesPanel';
import { MapPollenDetails } from '@/src/components/map/MapPollenDetails';
import { MapPollenStatusCard } from '@/src/components/map/MapPollenStatusCard';
import {
  ADAIR_PIN_COLOR,
  LEVEL_LABEL_KEYS,
  SEARCH_AREA_MIN_DELTA_DEG,
  WEEKDAY_KEYS,
  type MapLayerMode,
} from '@/src/components/map/map-constants';
import { createMapScreenStyles } from '@/src/components/map/map-screen-styles';
import { useMapLiveData } from '@/src/hooks/use-map-live-data';
import { usePollenPlume } from '@/src/hooks/use-pollen-plume';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useAppStore } from '@/src/store/app-store';
import { useTheme } from '@/src/hooks/use-theme';
import { useZoneColors, zoneFromPollen } from '@/src/hooks/use-zone-colors';
import { useTranslation } from '@/src/store/locale-store';
import { isGooglePollenHeatmapAvailable } from '@/src/services/pollen-heatmap-service';
import {
  buildAirQualityHeatmapTileUrlTemplate,
  isAirQualityHeatmapAvailable,
} from '@/src/services/air-quality-service';
import { resolveMapBasemap, resolveRuntimeMapBasemap } from '@/src/services/map-basemap';
import { isGoogleMapsApiKey } from '@/src/services/google-maps-api-key';
import { useGoogleBasemapGuard } from '@/src/hooks/use-google-basemap-guard';
import { resolveHourlyUpi } from '@/src/services/pollen-hourly-service';
import { getApiBaseUrl } from '@/src/services/api-client';
import {
  GOOGLE_MAP_PRIMARY_ENABLED,
  GOOGLE_POLLEN_HEATMAP_ENABLED,
  MAP_POLLEN_GOOGLE_PRIMARY,
  MAP_POLLEN_PLUME_ENABLED,
  YANDEX_MAP_INTERACTIVE_ENABLED,
} from '@/src/constants/features';
import { TAXON_LABEL_KEYS } from '@/src/constants/pollen-taxon-labels';

export default function MapScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createMapScreenStyles(theme), [theme]);
  const ui = useUiStyles();
  const { t } = useTranslation();
  const profile = useAppStore((s) => s.activeProfile);

  const [selectedTaxonId, setSelectedTaxonId] = useState<PollenMapTaxonId>('birch_pollen');
  const [layerMode, setLayerMode] = useState<MapLayerMode>('pollen');
  const [selectedForecastDay, setSelectedForecastDay] = useState<number | null>(null);
  const [allergenPickerOpen, setAllergenPickerOpen] = useState(false);

  const {
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
    placeInput,
    setPlaceInput,
    placeSuggestions,
    placeSearchLoading,
    mapCenter,
    searchingArea,
    searchThisArea,
    runPlaceSearch,
    handleSelectSuggestion,
    handleRegionChange,
    clearPlaceSearch,
  } = useMapLiveData({ placesLayerActive: layerMode === 'places' });

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

  const apiBaseUrlPresent = Boolean(getApiBaseUrl().trim());
  const mapBasemap = resolveMapBasemap({
    googleMapsApiKeyPresent: isGoogleMapsApiKey(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY),
    apiBaseUrlPresent,
    googleMapPrimaryEnabled: GOOGLE_MAP_PRIMARY_ENABLED,
    googlePollenHeatmapEnabled: GOOGLE_POLLEN_HEATMAP_ENABLED,
    yandexInteractiveEnabled: YANDEX_MAP_INTERACTIVE_ENABLED,
  });
  const googleGuard = useGoogleBasemapGuard(mapBasemap === 'google');
  const runtimeBasemap = resolveRuntimeMapBasemap(mapBasemap, {
    googleFailed: googleGuard.failed,
    yandexInteractiveEnabled: YANDEX_MAP_INTERACTIVE_ENABLED,
    apiBaseUrlPresent,
  });
  const useGoogleMap = runtimeBasemap === 'google';
  const useYandexInteractive = runtimeBasemap === 'yandex-interactive';
  const showPollenLayer = layerMode === 'pollen';
  const showAirLayer = layerMode === 'air';
  const showPlacesLayer = layerMode === 'places';
  const useHeatmap = isGooglePollenHeatmapAvailable() && showPollenLayer;
  const groupHeatmapActive = hasGoogleGroupHeatmap(
    selectedTaxonId,
    pollenSnapshot?.typeIndexes,
  );
  const googleMapType = useHeatmap
    ? resolveOfficialHeatmapMapType(selectedTaxonId, pollenSnapshot?.typeIndexes)
    : null;
  const hasOfficialTypeIndexes = Object.keys(pollenSnapshot?.typeIndexes ?? {}).length > 0;
  const heatmapEmpty = Boolean(
    showPollenLayer && pollenSnapshot && hasOfficialTypeIndexes && !groupHeatmapActive,
  );
  const airTileUrlTemplate =
    showAirLayer && isAirQualityHeatmapAvailable()
      ? buildAirQualityHeatmapTileUrlTemplate()
      : null;
  const showPlaceMarkers = showPlacesLayer;
  // Geo plume Circles need Google Maps primitives; Yandex path keeps caption only.
  const showPlumeGeo = MAP_POLLEN_PLUME_ENABLED && useGoogleMap && showPollenLayer;
  const showPlumeCaption =
    MAP_POLLEN_PLUME_ENABLED &&
    showPollenLayer &&
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
      kind:
        poi.source === 'adair'
          ? poi.adairKind === 'specialist'
            ? ('adair-specialist' as const)
            : ('adair-clinic' as const)
          : ('poi' as const),
      color:
        poi.source === 'adair'
          ? ADAIR_PIN_COLOR
          : poi.category === 'restaurant'
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

  const taxonLabel = t(TAXON_LABEL_KEYS[selectedTaxonId] as 'map.pollenBirch');
  const selectedTypeGroup = pollenMapTaxonTypeGroup(selectedTaxonId);
  const groupLabel =
    selectedTypeGroup === 'GRASS'
      ? t('map.pollenTypeGrass')
      : selectedTypeGroup === 'WEED'
        ? t('map.pollenTypeWeed')
        : t('map.pollenTypeTree');
  const displayStatusLevel =
    heatmapEmpty && selectedUpi?.source !== 'google' ? null : statusLevel;
  const pollenZone = displayStatusLevel ? zoneFromPollen(displayStatusLevel) : null;
  const pollenColors = useZoneColors(pollenZone);
  const levelLabel = displayStatusLevel
    ? t(LEVEL_LABEL_KEYS[displayStatusLevel])
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

  const levelColor = displayStatusLevel
    ? displayStatusLevel === 'high'
      ? theme.colors.danger
      : displayStatusLevel === 'mid'
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
          {displayStatusLevel
            ? t(LEVEL_LABEL_KEYS[displayStatusLevel])
            : t('map.pollenUnavailable')}
        </Text>
      </View>
    </View>
  );

  const plumeCaptionVisible =
    showPlumeCaption && (hourlyUpi ?? selectedUpi?.index ?? plume.upiIndex) > 0;

  const mapOverlay = showPollenLayer ? (
    <>
      {plumeCaptionVisible ? <PollenPlumeOverlay groupHint={plumeGroupHint} /> : null}
      {mapLevelOverlay}
      {heatmapEmpty ? (
        <View testID="map-heatmap-empty" style={styles.heatmapEmptyOverlay}>
          <Text style={styles.heatmapEmptyText}>
            {t('map.heatmapGroupEmpty', { taxon: taxonLabel, group: groupLabel })}
          </Text>
        </View>
      ) : null}
    </>
  ) : undefined;

  const mapAttributionKey = useYandexInteractive
    ? 'map.pollenYandexInteractiveAttribution'
    : useGoogleMap
      ? pollenSnapshot?.source === 'google' || MAP_POLLEN_GOOGLE_PRIMARY
        ? null
        : 'map.pollenGoogleMapAttribution'
      : 'map.pollenMapAttribution';

  const showActionTip =
    showPollenLayer && (displayStatusLevel === 'mid' || displayStatusLevel === 'high');
  const showPlacesPanel = showPlacesLayer;

  return (
    <Screen brandHeaderRight={<ProfileHeaderButton />}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={ui.docTitle}>{t('map.titleShort')}</Text>
        </View>
      </View>

      <MapPollenStatusCard
        loading={loading}
        hasSnapshot={Boolean(pollenSnapshot)}
        zone={pollenZone}
        headlineColor={pollenColors?.fg}
        levelColor={levelColor}
        statusHeadline={statusHeadline}
        profileName={profile?.name}
        profileRelevant={Boolean(selectedReading?.profileRelevant)}
        locationLabel={coords.label || pollenRegion.name}
        sourceLabel={sourceLabel}
        updatedLabel={updatedLabel}
        isCalendarFallback={isCalendarFallback}
        isCacheSource={isCacheSource}
      />

      <MapLayerSwitcher
        layerMode={layerMode}
        onLayerModeChange={(key) => {
          setLayerMode(key);
          if (key !== 'pollen') setAllergenPickerOpen(false);
        }}
        levelColor={levelColor}
        taxonLabel={taxonLabel}
        onAllergenPickerPress={() => setAllergenPickerOpen(true)}
      />

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

      <MapCanvas
        styles={styles}
        theme={theme}
        latitude={coords.lat}
        longitude={coords.lon}
        useGoogleMap={useGoogleMap}
        useYandexInteractive={useYandexInteractive}
        showPlaceMarkers={showPlaceMarkers}
        showPlacesLayer={showPlacesLayer}
        showSearchAreaButton={showSearchAreaButton}
        searchingArea={searchingArea}
        yandexUrl={
          showPlaceMarkers
            ? yandexPlacesUrl || yandexPollenUrl
            : yandexPollenUrl || yandexPlacesUrl
        }
        googleMapType={googleMapType}
        airTileUrlTemplate={airTileUrlTemplate}
        markers={markers}
        circles={showPlumeGeo ? plume.circles : []}
        polylines={showPlumeGeo ? plume.polylines : []}
        selectedPoiId={selectedPoiId}
        overlay={mapOverlay}
        mapAttributionKey={mapAttributionKey}
        yandexPollenUrl={pollenSnapshot?.yandexPollenUrl}
        onMarkerPress={setSelectedPoiId}
        onRegionChange={handleRegionChange}
        onMapLoaded={googleGuard.onMapLoaded}
        onSearchThisArea={() => void searchThisArea()}
      />

      <MapLayerLegend
        styles={styles}
        theme={theme}
        showPlacesLayer={showPlacesLayer}
        showAirLayer={showAirLayer}
        selectedTaxonId={selectedTaxonId}
      />

      {showActionTip ? (
        <GlassCard style={styles.tipCard}>
          <Text style={styles.tipText}>
            {displayStatusLevel === 'high' ? t('map.actionTipHigh') : t('map.actionTipModerate')}
          </Text>
          <Button
            label={t('map.actionTipClinicsCta')}
            variant="secondary"
            block
            onPress={() => {
              setLayerMode('places');
              setPlaceFilters(['adair', 'medical']);
            }}
          />
        </GlassCard>
      ) : null}

      <MapPollenDetails
        styles={styles}
        theme={theme}
        showPollenLayer={showPollenLayer}
        showAirLayer={showAirLayer}
        taxonLabel={taxonLabel}
        selectedTaxonId={selectedTaxonId}
        selectedUpi={selectedUpi}
        selectedReadingValue={selectedReading?.value ?? null}
        pollenSnapshot={pollenSnapshot}
        pollenZone={pollenZone}
        heatmapEmpty={heatmapEmpty}
        isCalendarFallback={isCalendarFallback}
        pollenPeaks={pollenPeaks}
        selectedForecastDay={selectedForecastDay}
        onSelectForecastDay={setSelectedForecastDay}
        airQuality={airQuality}
        airQualityLoading={airQualityLoading}
      />

      {showPlacesPanel ? (
        <MapPlacesPanel
          placeInput={placeInput}
          placeSuggestions={placeSuggestions}
          placeSearchLoading={placeSearchLoading}
          placeSearchError={placeSearchError}
          placesSource={placesSource}
          pois={pois}
          selectedPoiId={selectedPoiId}
          placeFilters={placeFilters}
          onChangeInput={setPlaceInput}
          onSubmit={(value) => {
            void runPlaceSearch(value);
          }}
          onSelectSuggestion={(suggestion) => {
            void handleSelectSuggestion(suggestion);
          }}
          onClear={clearPlaceSearch}
          onSelectPoi={setSelectedPoiId}
          onToggleFilter={togglePlaceFilter}
        />
      ) : null}

      <MapDoctorsSection
        onSelectClinic={(clinicId) => {
          setLayerMode('places');
          setPlaceFilters((current) =>
            current.includes('adair') ? current : [...current, 'adair'],
          );
          setSelectedPoiId(`adair:${clinicId}`);
        }}
      />

      <Disclaimer>
        {showPlacesLayer ? t('map.disclaimerAdair') : t('map.disclaimerUnified')}
      </Disclaimer>
    </Screen>
  );
}
