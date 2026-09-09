import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  findAllergenById,
  getConditionType,
  getCrossReactionsForSelection,
  type AllergenRecord,
  type AllergyConditionId,
  type CrossReactionMatch,
} from '@allerguide/core';
import { density, radii, space } from '@/src/constants/layout';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { AllergenCatalogModal } from '@/src/components/AllergenCatalogModal';
import {
  getAllergenCatalogSnapshot,
  resolveAllergenCatalog,
} from '@/src/services/allergen-catalog-service';
import { buildAllergenPickerModel } from '@/src/services/allergen-recommendation-display';
import { useTranslation } from '@/src/store/locale-store';
import { formatCrossReactionLabel } from '@/src/i18n/cross-reactions';
import { formatTemplate } from '@/src/i18n/translate';

interface AllergenPickerProps {
  /** Canonical allergen ids (`milk`, `birch-pollen`, …). */
  selected: string[];
  onChange: (selected: string[]) => void;
  suggestedConditionIds?: AllergyConditionId[];
  onAddSuggestedCondition?: (id: AllergyConditionId) => void;
  /**
   * Inline cross-reaction CTA. Disabled in profile-setup (dedicated step);
   * kept on for profile-edit by default.
   */
  showCrossReactions?: boolean;
  /** When set, quick-pick chips follow the selected condition types. */
  conditionIds?: AllergyConditionId[];
}

export function AllergenPicker({
  selected,
  onChange,
  suggestedConditionIds = [],
  onAddSuggestedCondition,
  showCrossReactions = true,
  conditionIds,
}: AllergenPickerProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<AllergenRecord[]>(getAllergenCatalogSnapshot);

  useEffect(() => {
    void resolveAllergenCatalog().then((result) => setCatalog(result.allergens));
  }, []);

  const model = useMemo(
    () => buildAllergenPickerModel({ selected, conditionIds, catalog }),
    [selected, conditionIds, catalog],
  );
  const crossSuggestions = useMemo(
    () => (showCrossReactions ? getCrossReactionsForSelection(selected) : []),
    [selected, showCrossReactions],
  );

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  };

  const addRelated = (matches: CrossReactionMatch[]) => {
    const ids = matches.map((item) => item.allergen.id);
    onChange([...new Set([...selected, ...ids])]);
  };

  const renderChip = (item: { id: string; name: string }) => {
    const active = selected.includes(item.id);
    return (
      <Pressable
        key={item.id}
        testID={`allergen-${item.id}`}
        style={[styles.chip, active && styles.chipActive]}
        onPress={() => toggle(item.id)}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={item.name}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
        {active ? <Ionicons name="checkmark-circle" size={14} color={theme.colors.accent} /> : null}
        <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.name}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.wrap}>
      {model.mode === 'recommended' ? (
        <>
          <Text style={styles.sectionHint}>{t('allergens.recommendedTitle')}</Text>
          <Text style={styles.recommendedHint}>{t('allergens.recommendedHint')}</Text>
          {model.groups.map((group) => {
            const isExpanded = expandedGroups.includes(group.conditionId);
            const chips = isExpanded ? group.allergens : group.visibleAllergens;
            return (
              <View key={group.conditionId} testID={`allergen-recommended-${group.conditionId}`} style={styles.group}>
                <Text style={styles.sectionHint}>
                  {formatTemplate(t('allergens.recommendedGroup'), { label: group.label })}
                </Text>
                <View style={styles.chipGrid}>{chips.map(renderChip)}</View>
                {!isExpanded && group.hiddenCount > 0 ? (
                  <Pressable
                    testID={`allergen-show-more-${group.conditionId}`}
                    style={styles.showMoreBtn}
                    onPress={() => setExpandedGroups((prev) => [...prev, group.conditionId])}
                    accessibilityRole="button"
                    accessibilityLabel={formatTemplate(t('allergens.showMore'), {
                      count: String(group.hiddenCount),
                    })}
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
                    <Text style={styles.showMoreText}>
                      {formatTemplate(t('allergens.showMore'), { count: String(group.hiddenCount) })}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </>
      ) : (
        <>
          <Text style={styles.sectionHint}>{t('allergens.popular')}</Text>
          <View style={styles.chipGrid}>{model.popularAllergens.map(renderChip)}</View>
        </>
      )}

      {model.extraSelectedIds.length > 0 ? (
        <>
          <Text style={styles.sectionHint}>{t('allergens.fromCatalog')}</Text>
          <View style={styles.chipGrid}>
            {model.extraSelectedIds.map((id) => {
              const label = findAllergenById(id)?.name ?? id;
              return renderChip({ id, name: label });
            })}
          </View>
        </>
      ) : null}

      <Pressable
        testID="allergen-open-catalog"
        style={styles.catalogBtn}
        onPress={() => setCatalogOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('allergens.openCatalog')}>
        <Ionicons name="list" size={18} color={theme.colors.accent} />
        <Text style={styles.catalogBtnText}>{t('allergens.openCatalog')}</Text>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
      </Pressable>

      {suggestedConditionIds.length > 0 ? (
        <View style={styles.crossCard}>
          <View style={styles.crossHeader}>
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.accent} />
            <Text style={styles.crossTitle}>{t('profileSetup.conditionHintTitle')}</Text>
          </View>
          <View style={styles.chipGrid}>
            {suggestedConditionIds.map((conditionId) => {
              const label = getConditionType(conditionId)?.label ?? conditionId;
              return (
                <Pressable
                  key={conditionId}
                  style={styles.crossBtn}
                  onPress={() => onAddSuggestedCondition?.(conditionId)}>
                  <Text style={styles.crossBtnText}>
                    {formatTemplate(t('profileSetup.conditionHintAdd'), { label })}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {crossSuggestions.length > 0 ? (
        <View style={styles.crossCard}>
          <View style={styles.crossHeader}>
            <Ionicons name="git-network-outline" size={18} color={theme.colors.accent} />
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
    wrap: { gap: space[3] },
    group: { gap: space[2] },
    sectionHint: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    recommendedHint: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    showMoreBtn: {
      alignSelf: 'flex-start',
      minHeight: density.tapMinHeightSm,
      justifyContent: 'center',
      paddingVertical: space[2],
      paddingHorizontal: space[3],
    },
    showMoreText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      minHeight: density.tapMinHeightSm,
      paddingVertical: space[2],
      paddingHorizontal: space[3],
      borderRadius: radii.sm,
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
      minHeight: density.tapMinHeight,
      padding: density.cardPadding,
      borderRadius: radii.sm,
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
      padding: density.cardPadding,
      borderRadius: radii.sm,
      backgroundColor: colors.tipBg,
      borderWidth: 1,
      borderColor: colors.tipBorder,
    },
    crossHeader: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
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
      paddingHorizontal: space[3],
      paddingVertical: space[2],
      borderRadius: radii.sm,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.tipBorder,
    },
    crossBtnText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
    },
  });
}
