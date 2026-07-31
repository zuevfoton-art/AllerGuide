import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PollenMapTaxonId, PollenTierLevel } from '@allerguide/core';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

export interface MapAllergenChipItem {
  taxonId: PollenMapTaxonId;
  level?: PollenTierLevel | null;
  profileRelevant?: boolean;
}

interface MapAllergenChipsProps {
  items: MapAllergenChipItem[];
  selectedTaxonId: PollenMapTaxonId;
  onSelect: (taxonId: PollenMapTaxonId) => void;
  labelForTaxon: (taxonId: PollenMapTaxonId) => string;
}

export function MapAllergenChips({
  items,
  selectedTaxonId,
  onSelect,
  labelForTaxon,
}: MapAllergenChipsProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {items.map((item) => {
        const isSelected = item.taxonId === selectedTaxonId;
        const dotColor = levelColor(item.level, theme);
        return (
          <Pressable
            key={item.taxonId}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onSelect(item.taxonId)}>
            <View style={[styles.dot, { backgroundColor: dotColor }]} />
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {labelForTaxon(item.taxonId)}
            </Text>
            {item.profileRelevant ? (
              <Text style={styles.you}>{t('map.pollenYou')}</Text>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function levelColor(level: PollenTierLevel | null | undefined, theme: AppTheme): string {
  if (level === 'high') return theme.colors.danger;
  if (level === 'mid') return theme.colors.warning;
  if (level === 'low') return theme.colors.success;
  return theme.colors.textMuted;
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    row: { gap: 8, paddingVertical: 2 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 36,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 12,
    },
    chipSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    dot: { width: 8, height: 8, borderRadius: 4 },
    label: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
    labelSelected: { color: colors.accent },
    you: {
      fontFamily: fonts.sans,
      fontSize: 10,
      color: colors.accent,
    },
  });
}
