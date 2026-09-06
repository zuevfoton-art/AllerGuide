import type { MapPlaceFilterId, PlaceAutocompleteSuggestion } from '@allerguide/core';
import { PlaceSearchBar } from '@/src/components/PlaceSearchBar';
import { MapPoiSheet } from '@/src/components/MapPoiSheet';
import type { MapPoiWithDistance } from '@/src/services/place-service';
import { useTranslation } from '@/src/store/locale-store';

type Props = {
  placeInput: string;
  placeSuggestions: PlaceAutocompleteSuggestion[];
  placeSearchLoading: boolean;
  placeSearchError: string | null;
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
