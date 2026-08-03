import { useMemo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MapPoi, MapPoiCategory } from '@allerguide/core';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

export type MapPoiListItem = MapPoi & { distanceKm?: number };

interface MapPoiSheetProps {
  pois: MapPoiListItem[];
  selectedId: string | null;
  categories: readonly MapPoiCategory[];
  onSelect: (id: string) => void;
  onToggleCategory: (category: MapPoiCategory) => void;
  /** When false, hide category filters (e.g. pollen-only layer). */
  showFilters?: boolean;
}

const CATEGORY_KEYS: Record<MapPoiCategory, string> = {
  restaurant: 'map.poiRestaurants',
  medical: 'map.poiMedical',
  pharmacy: 'map.poiPharmacy',
};

const LEVEL_KEYS = {
  high: 'map.poiLevelHigh',
  medium: 'map.poiLevelMedium',
  low: 'map.poiLevelLow',
} as const;

export function MapPoiFilters({
  categories,
  onToggleCategory,
}: {
  categories: readonly MapPoiCategory[];
  onToggleCategory: (category: MapPoiCategory) => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const all: MapPoiCategory[] = ['restaurant', 'medical', 'pharmacy'];

  return (
    <View style={styles.filterRow}>
      {all.map((category) => {
        const active = categories.includes(category);
        return (
          <Pressable
            key={category}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.filterChip, active && styles.filterChipActive]}
            onPress={() => onToggleCategory(category)}>
            <Text style={[styles.filterText, active && styles.filterTextActive]}>
              {t(CATEGORY_KEYS[category] as 'map.poiRestaurants')}
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
  categories,
  onSelect,
  onToggleCategory,
  showFilters = true,
}: MapPoiSheetProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <View style={styles.wrap} testID="map-poi-sheet">
      <Text style={styles.title}>{t('map.poiTitle')}</Text>
      {showFilters ? (
        <MapPoiFilters categories={categories} onToggleCategory={onToggleCategory} />
      ) : null}
      {pois.length === 0 ? (
        <Text style={styles.empty}>{t('map.emptyPlaces')}</Text>
      ) : (
        pois.slice(0, 8).map((poi) => {
          const selected = poi.id === selectedId;
          const isNkcc = poi.tags.some((tag) => tag.toUpperCase() === 'NKCC');
          const levelColor =
            poi.level === 'high'
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
                  <View style={[styles.levelBadge, { borderColor: levelColor }]}>
                    <Text style={[styles.levelBadgeText, { color: levelColor }]}>
                      {t(LEVEL_KEYS[poi.level])}
                    </Text>
                  </View>
                </View>
                <Text style={styles.note}>{poi.note}</Text>
                <View style={styles.metaRow}>
                  {typeof poi.distanceKm === 'number' ? (
                    <Text style={styles.meta}>
                      {t('map.poiDistance', { km: poi.distanceKm.toFixed(1) })}
                    </Text>
                  ) : null}
                  {isNkcc ? <Text style={styles.badgeNkcc}>{t('map.nkcc')}</Text> : null}
                </View>
                {poi.phone ? (
                  <Pressable onPress={() => void Linking.openURL(`tel:${poi.phone}`)}>
                    <Text style={styles.phone}>{poi.phone}</Text>
                  </Pressable>
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
      borderRadius: 8,
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
    filterText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      color: colors.textSecondary,
    },
    filterTextActive: { color: colors.accent },
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
    phone: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.accent,
      textDecorationLine: 'underline',
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
