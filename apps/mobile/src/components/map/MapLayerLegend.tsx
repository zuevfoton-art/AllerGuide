import { Text, View } from 'react-native';
import { pollenMapTaxonTypeGroup, type PollenMapTaxonId } from '@allerguide/core';
import { AirQualityLegend } from '@/src/components/AirQualityLegend';
import { PollenHeatmapLegend } from '@/src/components/PollenHeatmapLegend';
import { MapLegendDot } from '@/src/components/map/MapLegendDots';
import { ADAIR_PIN_COLOR } from '@/src/components/map/map-constants';
import type { MapScreenStyles } from '@/src/components/map/map-screen-styles';
import type { AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

type Props = {
  styles: MapScreenStyles;
  theme: AppTheme;
  showPlacesLayer: boolean;
  showAirLayer: boolean;
  selectedTaxonId: PollenMapTaxonId;
};

export function MapLayerLegend({
  styles,
  theme,
  showPlacesLayer,
  showAirLayer,
  selectedTaxonId,
}: Props) {
  const { t } = useTranslation();

  if (showPlacesLayer) {
    return (
      <>
        <Text style={styles.legendTitle}>{t('map.legendTitlePlaces')}</Text>
        <View style={styles.legendRow}>
          <MapLegendDot color={ADAIR_PIN_COLOR} label={t('map.legendAdair')} />
          <MapLegendDot color={theme.colors.success} label={t('map.legendRestaurant')} />
          <MapLegendDot color={theme.colors.warningText} label={t('map.legendCafe')} />
          <MapLegendDot color={theme.colors.accent} label={t('map.legendMedical')} />
          <MapLegendDot color={theme.colors.warning} label={t('map.legendPharmacy')} />
        </View>
      </>
    );
  }

  if (showAirLayer) return <AirQualityLegend />;
  return <PollenHeatmapLegend group={pollenMapTaxonTypeGroup(selectedTaxonId)} />;
}
