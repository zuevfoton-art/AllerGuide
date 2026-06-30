import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  findAllergenById,
  getCrossReactionsForSelection,
  getPopularAllergens,
  type CrossReactionMatch,
} from '@allerguide/core';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { AllergenCatalogModal } from '@/src/components/AllergenCatalogModal';
import { useTranslation } from '@/src/store/locale-store';
import { formatCrossReactionLabel } from '@/src/i18n/cross-reactions';

interface AllergenPickerProps {
  /** Canonical allergen ids (`milk`, `birch-pollen`, …). */
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function AllergenPicker({ selected, onChange }: AllergenPickerProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [catalogOpen, setCatalogOpen] = useState(false);

  const popularIds = useMemo(() => new Set(getPopularAllergens().map((item) => item.id)), []);
  const extraSelected = selected.filter((id) => !popularIds.has(id));
  const crossSuggestions = useMemo(() => getCrossReactionsForSelection(selected), [selected]);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  };

  const addRelated = (matches: CrossReactionMatch[]) => {
    const ids = matches.map((item) => item.allergen.id);
    onChange([...new Set([...selected, ...ids])]);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionHint}>{t('allergens.popular')}</Text>
      <View style={styles.chipGrid}>
        {getPopularAllergens().map((item) => {
          const active = selected.includes(item.id);
          return (
            <Pressable
              key={item.id}
              testID={`allergen-${item.id}`}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggle(item.id)}>
              {active ? (
                <Ionicons name="checkmark-circle" size={14} color={theme.colors.accent} />
              ) : null}
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.name}</Text>
            </Pressable>
          );
        })}
      </View>

      {extraSelected.length > 0 ? (
        <>
          <Text style={styles.sectionHint}>{t('allergens.fromCatalog')}</Text>
          <View style={styles.chipGrid}>
            {extraSelected.map((id) => {
              const label = findAllergenById(id)?.name ?? id;
              return (
                <Pressable
                  key={id}
                  style={[styles.chip, styles.chipActive]}
                  onPress={() => toggle(id)}>
                  <Ionicons name="checkmark-circle" size={14} color={theme.colors.accent} />
                  <Text style={[styles.chipText, styles.chipTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      <Pressable style={styles.catalogBtn} onPress={() => setCatalogOpen(true)}>
        <Ionicons name="list" size={18} color={theme.colors.accent} />
        <Text style={styles.catalogBtnText}>{t('allergens.openCatalog')}</Text>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
      </Pressable>

      {crossSuggestions.length > 0 ? (
        <View style={styles.crossCard}>
          <View style={styles.crossHeader}>
            <Ionicons name="git-network-outline" size={18} color={theme.colors.purple} />
            <Text style={styles.crossTitle}>{t('allergens.crossTitle')}</Text>
          </View>
          <Text style={styles.crossText}>
            {t('allergens.crossText')}{' '}
            {crossSuggestions.map((item) => formatCrossReactionLabel(item, t)).join(', ')}.
          </Text>
          <Pressable style={styles.crossBtn} onPress={() => addRelated(crossSuggestions)}>
            <Text style={styles.crossBtnText}>{t('allergens.crossAdd')}</Text>
          </Pressable>
        </View>
      ) : null}

      <AllergenCatalogModal
        visible={catalogOpen}
        selected={selected}
        onClose={() => setCatalogOpen(false)}
        onApply={onChange}
      />
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: 10 },
    sectionHint: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    chipActive: { borderColor: colors.accent, backgroundColor: colors.accentLight },
    chipText: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.textSecondary,
    },
    chipTextActive: {
      fontFamily: fonts.sansSemiBold,
      color: colors.accent,
      fontWeight: '600',
    },
    catalogBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 14,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    catalogBtnText: {
      flex: 1,
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    crossCard: {
      gap: 10,
      padding: 14,
      borderRadius: 6,
      backgroundColor: colors.tipBg,
      borderWidth: 1,
      borderColor: colors.tipBorder,
    },
    crossHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    crossTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.tipText,
    },
    crossText: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.tipText,
      lineHeight: 18,
    },
    crossBtn: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.tipBorder,
    },
    crossBtnText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.purple,
    },
  });
}
