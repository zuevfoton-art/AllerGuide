import { useMemo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  MAP_PLACE_FILTERS,
  type MapPlaceFilterId,
  type MapPoi,
} from '@allerguide/core';
import { radii } from '@/src/constants/layout';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

export type MapPoiListItem = MapPoi & { distanceKm?: number };

interface MapPoiSheetProps {
  pois: MapPoiListItem[];
  selectedId: string | null;
  filters: readonly MapPlaceFilterId[];
  onSelect: (id: string) => void;
  onToggleFilter: (filter: MapPlaceFilterId) => void;
  /** When false, hide category filters (e.g. pollen-only layer). */
  showFilters?: boolean;
}

const FILTER_KEYS: Record<MapPlaceFilterId, string> = {
  adair: 'map.poiAdair',
  restaurant: 'map.poiRestaurants',
  cafe: 'map.poiCafes',
  medical: 'map.poiMedical',
  pharmacy: 'map.poiPharmacy',
};

const LEVEL_KEYS = {
  high: 'map.poiLevelHigh',
  medium: 'map.poiLevelMedium',
  low: 'map.poiLevelLow',
} as const;

const VERIFICATION_KEYS = {
  confirmed: 'map.adairVerified',
  'address-confirmed': 'map.adairAddressConfirmed',
  'needs-review': 'map.adairNeedsReview',
  unconfirmed: 'map.adairUnconfirmed',
} as const;

function visiblePois(pois: MapPoiListItem[]): MapPoiListItem[] {
  const adair = pois.filter((poi) => poi.source === 'adair');
  const rest = pois.filter((poi) => poi.source !== 'adair').slice(0, 8);
  return [...adair, ...rest];
}

export function MapPoiFilters({
  filters,
  onToggleFilter,
}: {
  filters: readonly MapPlaceFilterId[];
  onToggleFilter: (filter: MapPlaceFilterId) => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <View style={styles.filterRow}>
      {MAP_PLACE_FILTERS.map((filter) => {
        const active = filters.includes(filter);
        const isAdair = filter === 'adair';
        return (
          <Pressable
            key={filter}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              styles.filterChip,
              active && styles.filterChipActive,
              isAdair && styles.filterChipAdair,
              isAdair && active && styles.filterChipAdairActive,
            ]}
            hitSlop={8}
            onPress={() => onToggleFilter(filter)}>
            <Text
              style={[
                styles.filterText,
                active && styles.filterTextActive,
                isAdair && active && styles.filterTextAdair,
              ]}>
              {t(FILTER_KEYS[filter] as 'map.poiRestaurants')}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function MapPoiSheet({
  pois,
  selectedId,
  filters,
  onSelect,
  onToggleFilter,
  showFilters = true,
}: MapPoiSheetProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const rows = visiblePois(pois);

  return (
    <View style={styles.wrap} testID="map-poi-sheet">
      <Text style={styles.title}>{t('map.poiTitle')}</Text>
      {showFilters ? (
        <MapPoiFilters filters={filters} onToggleFilter={onToggleFilter} />
      ) : null}
      {rows.length === 0 ? (
        <Text style={styles.empty}>{t('map.emptyPlaces')}</Text>
      ) : (
        rows.map((poi) => {
          const selected = poi.id === selectedId;
          const isNkcc = poi.tags.some((tag) => tag.toUpperCase() === 'NKCC');
          const isAdair = poi.source === 'adair';
          const extraPhoneCount = Math.max((poi.phones?.length ?? 0) - 1, 0);
          const levelColor = isAdair
            ? '#7C3AED'
            : poi.level === 'high'
              ? theme.colors.success
              : poi.level === 'medium'
                ? theme.colors.warning
                : theme.colors.textMuted;
          return (
            <Pressable
              key={poi.id}
              testID={`map-poi-${poi.id}`}
              style={[styles.row, selected && styles.rowSelected]}
              onPress={() => onSelect(poi.id)}>
              <View style={[styles.icon, { backgroundColor: `${levelColor}22` }]}>
                <Ionicons
                  name={poi.icon as 'restaurant'}
                  size={18}
                  color={levelColor}
                />
              </View>
              <View style={styles.body}>
                <View style={styles.titleRow}>
                  <Text style={styles.rowTitle}>{poi.title}</Text>
                  {isAdair ? <Text style={styles.badgeAdair}>{t('map.adairBadge')}</Text> : null}
                  {poi.source === 'google-places' ? (
                    typeof poi.rating === 'number' ? (
                      <Text style={styles.meta}>
                        {t('map.placeRating', { rating: poi.rating.toFixed(1) })}
                      </Text>
                    ) : (
                      <Text style={styles.meta}>{t('map.placeAllergyUnknown')}</Text>
                    )
                  ) : !isAdair ? (
                    <View style={[styles.levelBadge, { borderColor: levelColor }]}>
                      <Text style={[styles.levelBadgeText, { color: levelColor }]}>
                        {t(LEVEL_KEYS[poi.level])}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.note}>{poi.note}</Text>
                {poi.adairVerification ? (
                  <Text style={styles.verification}>
                    {t(VERIFICATION_KEYS[poi.adairVerification])}
                  </Text>
                ) : null}
                {poi.adairDoctors?.map((doctor) => (
                  <Text key={doctor.name} style={styles.doctorLine}>
                    {doctor.name}
                    {doctor.role ? ` · ${doctor.role}` : ''}
                    {doctor.isChiefExpert ? ` · ${t('map.chiefExpert')}` : ''}
                  </Text>
                ))}
                <View style={styles.metaRow}>
                  {typeof poi.distanceKm === 'number' ? (
                    <Text style={styles.meta}>
                      {t('map.poiDistance', { km: poi.distanceKm.toFixed(1) })}
                    </Text>
                  ) : null}
                  {isNkcc ? <Text style={styles.badgeNkcc}>{t('map.nkcc')}</Text> : null}
                </View>
                {poi.phone && poi.phoneUsable !== false ? (
                  <Pressable onPress={() => void Linking.openURL(`tel:${poi.phone}`)}>
                    <Text style={styles.phone}>
                      {poi.phone}
                      {poi.phonePurpose ? ` · ${poi.phonePurpose}` : ''}
                    </Text>
                  </Pressable>
                ) : poi.phones?.[0] ? (
                  <Text style={styles.archivedPhone}>{poi.phones[0]}</Text>
                ) : null}
                {extraPhoneCount > 0 ? (
                  <Text style={styles.meta}>
                    {t('map.adairMorePhones', { count: extraPhoneCount })}
                  </Text>
                ) : null}
                {poi.bookingUrl ? (
                  <Pressable
                    onPress={() => void Linking.openURL(poi.bookingUrl!)}
                    accessibilityRole="link">
                    <Text style={styles.booking}>{t('map.poiBook')}</Text>
                  </Pressable>
                ) : null}
              </View>
            </Pressable>
          );
        })
      )}
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: 10 },
    title: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      color: colors.head,
    },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    filterChip: {
      minHeight: 32,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      justifyContent: 'center',
    },
    filterChipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    filterChipAdair: {
      borderColor: '#7C3AED55',
    },
    filterChipAdairActive: {
      borderColor: '#7C3AED',
      backgroundColor: '#7C3AED18',
    },
    filterText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      color: colors.textSecondary,
    },
    filterTextActive: { color: colors.accent },
    filterTextAdair: { color: '#7C3AED' },
    row: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 12,
    },
    rowSelected: {
      borderColor: colors.accent,
    },
    icon: {
      width: 34,
      height: 34,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentLight,
    },
    body: { flex: 1, gap: 4 },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    rowTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      color: colors.text,
      flexShrink: 1,
    },
    levelBadge: {
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    levelBadgeText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 10,
      fontWeight: '600',
    },
    note: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
    },
    verification: {
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.warning,
    },
    doctorLine: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.text,
    },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
    meta: {
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.textMuted,
    },
    badgeNkcc: {
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
    badgeAdair: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 10,
      fontWeight: '600',
      color: '#7C3AED',
      backgroundColor: '#7C3AED18',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      overflow: 'hidden',
    },
    phone: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.accent,
      textDecorationLine: 'underline',
    },
    archivedPhone: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
    },
    booking: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.accent,
    },
    empty: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
    },
  });
}
