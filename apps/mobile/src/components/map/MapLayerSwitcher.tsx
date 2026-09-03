import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MAP_LAYER_CHIPS, type MapLayerMode } from '@/src/components/map/map-constants';
import { radii } from '@/src/constants/layout';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

interface MapLayerSwitcherProps {
  layerMode: MapLayerMode;
  onLayerModeChange: (mode: MapLayerMode) => void;
  levelColor: string;
  taxonLabel: string;
  onAllergenPickerPress: () => void;
}

export function MapLayerSwitcher({
  layerMode,
  onLayerModeChange,
  levelColor,
  taxonLabel,
  onAllergenPickerPress,
}: MapLayerSwitcherProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const showPollenLayer = layerMode === 'pollen';

  return (
    <View style={styles.layerBlock}>
      <View style={styles.layerRow} testID="map-layers">
        {MAP_LAYER_CHIPS.map(([key, labelKey]) => {
          const active = layerMode === key;
          return (
            <Pressable
              key={key}
              testID={`map-layer-${key}`}
              style={[styles.layerChip, active && styles.layerChipActive]}
              hitSlop={8}
              onPress={() => onLayerModeChange(key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}>
              <Text
                style={[styles.layerChipText, active && styles.layerChipTextActive]}
                numberOfLines={2}>
                {t(labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {showPollenLayer ? (
        <Pressable
          testID="map-allergen-picker"
          style={styles.allergenPickerBtn}
          onPress={onAllergenPickerPress}
          accessibilityRole="button"
          accessibilityLabel={t('map.allergenPickerTitle')}>
          <View style={[styles.allergenPickerDot, { backgroundColor: levelColor }]} />
          <Text style={styles.allergenPickerLabel} numberOfLines={1}>
            {t('map.allergenPickerButton', { taxon: taxonLabel })}
          </Text>
          <Ionicons name="chevron-down" size={18} color={theme.colors.accent} />
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    layerBlock: { gap: 8 },
    layerRow: { flexDirection: 'row', gap: 8 },
    layerChip: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 40,
      paddingHorizontal: 4,
      paddingVertical: 8,
      borderRadius: radii.sm,
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
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
      color: colors.textSecondary,
    },
    layerChipTextActive: { color: colors.accent },
    allergenPickerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 44,
      borderRadius: radii.full,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    allergenPickerDot: { width: 8, height: 8, borderRadius: 4 },
    allergenPickerLabel: {
      flex: 1,
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.accent,
    },
  });
}
