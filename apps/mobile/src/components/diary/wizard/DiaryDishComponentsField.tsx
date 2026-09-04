import { useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import {
  buildDishBreakdown,
  parseDishComponentDefs,
  parseSelectedComponentIds,
} from '@allerguide/core';
import { createFieldStyles } from '@/src/components/diary/wizard/diary-wizard-styles';
import { useTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

export function DiaryDishComponentsField({
  foodText,
  selectedRaw,
  componentsDefRaw,
  dishId,
  dishName,
  conflictsSummary,
  profileAllergiesJson,
  offEnriching,
  offSource,
  offProductName,
  onChangeSelection,
}: {
  foodText: string;
  selectedRaw: string;
  componentsDefRaw: string;
  dishId: string;
  dishName: string;
  conflictsSummary: string;
  profileAllergiesJson: string;
  offEnriching: boolean;
  offSource: string;
  offProductName: string;
  onChangeSelection: (ids: string[]) => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createFieldStyles(theme), [theme]);
  const { t } = useTranslation();

  const selectedIds = parseSelectedComponentIds(selectedRaw);
  const storedDefs = parseDishComponentDefs(componentsDefRaw);
  const breakdown = buildDishBreakdown(
    foodText,
    profileAllergiesJson,
    selectedRaw ? selectedIds : undefined,
    {
      components: storedDefs.length ? storedDefs : undefined,
      dishId: dishId || null,
      dishName: dishName || null,
    },
  );

  if (!foodText.trim()) {
    return <Text style={styles.checklistHint}>{t('diaryWizard.dishEnterFoodFirst')}</Text>;
  }

  if (!breakdown.components.length && !offEnriching) {
    return <Text style={styles.checklistHint}>{t('diaryWizard.dishUnknown')}</Text>;
  }

  if (!breakdown.components.length && offEnriching) {
    return (
      <View style={styles.checklistWrap} testID="diary-dish-off-loading">
        <ActivityIndicator color={theme.colors.accent} />
        <Text style={styles.checklistHint}>{t('diaryWizard.dishOffLoading')}</Text>
      </View>
    );
  }

  const toggle = (id: string) => {
    const current = new Set(
      selectedRaw ? selectedIds : breakdown.components.map((item) => item.id),
    );
    if (current.has(id)) current.delete(id);
    else current.add(id);
    onChangeSelection(Array.from(current));
  };

  const showOffBadge = offSource === 'openfoodfacts' || offSource === 'catalog' || offSource === 'mixed';

  return (
    <View style={styles.checklistWrap} testID="diary-dish-checklist">
      {breakdown.dishName ? (
        <Text style={styles.checklistDish}>
          {t('diaryWizard.dishMatched', { dish: breakdown.dishName })}
        </Text>
      ) : null}
      {showOffBadge ? (
        <Text style={styles.offSource} testID="diary-dish-off-source">
          {t('diaryWizard.dishOffEnriched', {
            product: offProductName || breakdown.dishName || 'Open Food Facts',
          })}
        </Text>
      ) : null}
      {offEnriching ? (
        <View style={styles.offLoadingRow}>
          <ActivityIndicator size="small" color={theme.colors.accent} />
          <Text style={styles.checklistHint}>{t('diaryWizard.dishOffLoading')}</Text>
        </View>
      ) : null}
      <Text style={styles.checklistHint}>{t('diaryWizard.dishHint')}</Text>
      <View style={styles.choiceGrid}>
        {breakdown.components.map((component) => {
          const active = component.selected;
          const conflict = component.conflict;
          return (
            <Pressable
              key={component.id}
              testID={`diary-dish-component-${component.id}`}
              style={[
                styles.choiceChip,
                active && styles.choiceChipActive,
                conflict === 'direct' && styles.conflictDirect,
                conflict === 'cross' && styles.conflictCross,
              ]}
              hitSlop={8}
              onPress={() => toggle(component.id)}>
              <Text
                style={[
                  styles.choiceText,
                  active && styles.choiceTextActive,
                  conflict === 'direct' && styles.conflictText,
                  conflict === 'cross' && styles.conflictCrossText,
                ]}>
                {active ? '✓ ' : ''}
                {component.nameRu}
                {conflict === 'direct' ? ' ⚠' : conflict === 'cross' ? ' ~' : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {conflictsSummary ? (
        <Text style={styles.conflictBanner} testID="diary-dish-conflicts">
          {t('diaryWizard.dishConflicts', { list: conflictsSummary })}
        </Text>
      ) : null}
    </View>
  );
}
