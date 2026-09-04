import type { MapPlaceFilterId } from '@allerguide/core';
import { PlaceSearchBar } from '@/src/components/PlaceSearchBar';
import { MapPoiSheet } from '@/src/components/MapPoiSheet';
import type { PlaceAutocompleteSuggestion } from '@allerguide/core';
import type { MapPoiWithDistance, PlacesResultSource } from '@/src/services/place-service';
import { useTranslation } from '@/src/store/locale-store';

type Props = {
  placeInput: string;
  placeSuggestions: PlaceAutocompleteSuggestion[];
  placeSearchLoading: boolean;
  placeSearchError: string | null;
  placesSource: PlacesResultSource | null;
  pois: MapPoiWithDistance[];
  selectedPoiId: string | null;
  placeFilters: MapPlaceFilterId[];
  onChangeInput: (value: string) => void;
  onSubmit: (value: string) => void;
  onSelectSuggestion: (suggestion: PlaceAutocompleteSuggestion) => void;
  onClear: () => void;
  onSelectPoi: (id: string) => void;
  onToggleFilter: (id: MapPlaceFilterId) => void;
};

export function MapPlacesPanel({
  placeInput,
  placeSuggestions,
  placeSearchLoading,
  placeSearchError,
  placesSource,
  pois,
  selectedPoiId,
  placeFilters,
  onChangeInput,
  onSubmit,
  onSelectSuggestion,
  onClear,
  onSelectPoi,
  onToggleFilter,
}: Props) {
  const { t } = useTranslation();

  return (
    <>
      <PlaceSearchBar
        value={placeInput}
        suggestions={placeSuggestions}
        loading={placeSearchLoading}
        error={placeSearchError === 'empty' ? t('map.placeSearchNothingFound') : null}
        sourceLabel={
          placesSource === 'catalog'
            ? t('map.placeSearchOfflineCatalog')
            : placesSource === 'google-places'
              ? t('map.placeSourceGoogle')
              : placesSource === 'adair'
                ? t('map.placeSourceCatalog')
                : null
        }
        onChange={onChangeInput}
        onSubmit={onSubmit}
        onSelectSuggestion={onSelectSuggestion}
        onClear={onClear}
      />
      <MapPoiSheet
        pois={pois}
        selectedId={selectedPoiId}
        filters={placeFilters}
        onSelect={onSelectPoi}
        onToggleFilter={onToggleFilter}
      />
    </>
  );
}
