import { useMemo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MapPoi, MapPoiCategory } from '@allerguide/core';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

interface MapPoiSheetProps {
  pois: MapPoi[];
  selectedId: string | null;
  categories: readonly MapPoiCategory[];
  onSelect: (id: string) => void;
  onToggleCategory: (category: MapPoiCategory) => void;
}

const CATEGORY_KEYS: Record<MapPoiCategory, string> = {
  restaurant: 'map.poiRestaurants',
  medical: 'map.poiMedical',
  pharmacy: 'map.poiPharmacy',
};

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
}: MapPoiSheetProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('map.poiTitle')}</Text>
      <MapPoiFilters categories={categories} onToggleCategory={onToggleCategory} />
      {pois.length === 0 ? (
        <Text style={styles.empty}>{t('map.emptyPlaces')}</Text>
      ) : (
        pois.slice(0, 8).map((poi) => {
          const selected = poi.id === selectedId;
          return (
            <Pressable
              key={poi.id}
              style={[styles.row, selected && styles.rowSelected]}
              onPress={() => onSelect(poi.id)}>
              <View style={styles.icon}>
                <Ionicons
                  name={poi.icon as 'restaurant'}
                  size={18}
                  color={theme.colors.accent}
                />
              </View>
              <View style={styles.body}>
                <Text style={styles.rowTitle}>{poi.title}</Text>
                <Text style={styles.note}>{poi.note}</Text>
                {poi.phone ? (
                  <Pressable onPress={() => void Linking.openURL(`tel:${poi.phone}`)}>
                    <Text style={styles.phone}>{poi.phone}</Text>
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
    body: { flex: 1, gap: 2 },
    rowTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      color: colors.text,
    },
    note: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
    },
    phone: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.accent,
      textDecorationLine: 'underline',
    },
    empty: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
    },
  });
}
