import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import {
  formatPollenMonth,
  type PollenMapTaxonId,
  type PollenUpiSnapshot,
} from '@allerguide/core';
import { AirQualityCard } from '@/src/components/AirQualityCard';
import { GlassCard } from '@/src/components/GlassCard';
import { PollenForecastStrip } from '@/src/components/PollenForecastStrip';
import { PollenIndexCard } from '@/src/components/PollenIndexCard';
import type { MapScreenStyles } from '@/src/components/map/map-screen-styles';
import type { AppTheme } from '@/src/hooks/use-theme';
import type { Zone } from '@/src/hooks/use-zone-colors';
import { isGoogleAirQualityAvailable } from '@/src/services/air-quality-service';
import type { AirQualitySnapshot } from '@allerguide/core';
import type { PollenMapSnapshot } from '@/src/services/pollen-map-service';
import { useTranslation } from '@/src/store/locale-store';

type PollenPeak = { taxonId: string; label: string; peakMonth: number };

type Props = {
  styles: MapScreenStyles;
  theme: AppTheme;
  showPollenLayer: boolean;
  showAirLayer: boolean;
  taxonLabel: string;
  selectedTaxonId: PollenMapTaxonId;
  selectedUpi: PollenUpiSnapshot | null;
  selectedReadingValue: number | null;
  pollenSnapshot: PollenMapSnapshot | null;
  pollenZone: Zone | null;
  heatmapEmpty: boolean;
  isCalendarFallback: boolean;
  pollenPeaks: PollenPeak[];
  selectedForecastDay: number | null;
  onSelectForecastDay: (index: number | null) => void;
  airQuality: AirQualitySnapshot | null;
  airQualityLoading: boolean;
};

export function MapPollenDetails({
  styles,
  theme,
  showPollenLayer,
  showAirLayer,
  taxonLabel,
  selectedTaxonId,
  selectedUpi,
  selectedReadingValue,
  pollenSnapshot,
  pollenZone,
  heatmapEmpty,
  isCalendarFallback,
  pollenPeaks,
  selectedForecastDay,
  onSelectForecastDay,
  airQuality,
  airQualityLoading,
}: Props) {
  const { t } = useTranslation();

  return (
    <>
      {showPollenLayer ? (
        <>
          <PollenIndexCard
            taxonLabel={taxonLabel}
            upi={heatmapEmpty && selectedUpi?.source !== 'google' ? null : selectedUpi}
            grainsPerM3={
              pollenSnapshot?.source === 'google' || selectedUpi?.source === 'google'
                ? null
                : selectedReadingValue
            }
            zone={pollenZone}
          />
          {isGoogleAirQualityAvailable() ? (
            <AirQualityCard snapshot={airQuality} loading={airQualityLoading} />
          ) : null}
          <PollenForecastStrip
            days={pollenSnapshot?.forecastDays ?? []}
            taxonId={selectedTaxonId}
            selectedDayIndex={selectedForecastDay}
            onSelectDay={onSelectForecastDay}
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
        </>
      ) : null}

      {showAirLayer && isGoogleAirQualityAvailable() ? (
        <AirQualityCard snapshot={airQuality} loading={airQualityLoading} />
      ) : null}
    </>
  );
}

