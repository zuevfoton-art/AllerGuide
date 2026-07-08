import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ALLERGY_CONDITION_TYPES,
  listConditionPairs,
  type AllergyConditionId,
  type ComorbidityLink,
} from '@allerguide/core';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

export type ComorbidityDrafts = ComorbidityLink[];

interface ComorbidityEditorProps {
  conditionIds: AllergyConditionId[];
  links: ComorbidityDrafts;
  onChange: (links: ComorbidityDrafts) => void;
}

function conditionLabel(id: AllergyConditionId): string {
  return ALLERGY_CONDITION_TYPES.find((item) => item.id === id)?.label ?? id;
}

function findPairLink(
  links: ComorbidityDrafts,
  left: AllergyConditionId,
  right: AllergyConditionId,
): ComorbidityLink | undefined {
  return links.find(
    (link) =>
      (link.fromConditionId === left && link.toConditionId === right) ||
      (link.fromConditionId === right && link.toConditionId === left),
  );
}

export function ComorbidityEditor({ conditionIds, links, onChange }: ComorbidityEditorProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const pairs = listConditionPairs(conditionIds);

  if (pairs.length === 0) {
    return <Text style={styles.empty}>{t('profileSetup.comorbidity.empty')}</Text>;
  }

  const setPairRelation = (
    left: AllergyConditionId,
    right: AllergyConditionId,
    mode: 'left-first' | 'right-first' | 'concurrent' | 'unknown',
  ) => {
    const rest = links.filter(
      (link) =>
        !(
          (link.fromConditionId === left && link.toConditionId === right) ||
          (link.fromConditionId === right && link.toConditionId === left)
        ),
    );

    if (mode === 'unknown') {
      onChange(rest);
      return;
    }

    if (mode === 'concurrent') {
      onChange([
        ...rest,
        { fromConditionId: left, toConditionId: right, relation: 'concurrent' },
      ]);
      return;
    }

    onChange([
      ...rest,
      {
        fromConditionId: mode === 'left-first' ? left : right,
        toConditionId: mode === 'left-first' ? right : left,
        relation: 'preceded',
      },
    ]);
  };

  const pairMode = (
    left: AllergyConditionId,
    right: AllergyConditionId,
  ): 'left-first' | 'right-first' | 'concurrent' | 'unknown' => {
    const link = findPairLink(links, left, right);
    if (!link) return 'unknown';
    if (link.relation === 'concurrent') return 'concurrent';
    if (link.fromConditionId === left) return 'left-first';
    return 'right-first';
  };

  return (
    <View style={styles.wrap}>
      {pairs.map(([left, right]) => {
        const mode = pairMode(left, right);
        const leftLabel = conditionLabel(left);
        const rightLabel = conditionLabel(right);

        return (
          <View key={`${left}-${right}`} style={styles.card}>
            <Text style={styles.cardTitle}>
              {t('profileSetup.comorbidity.pairQuestion', { a: leftLabel, b: rightLabel })}
            </Text>
            <View style={styles.options}>
              {(
                [
                  ['left-first', t('profileSetup.comorbidity.leftFirst', { name: leftLabel })],
                  ['right-first', t('profileSetup.comorbidity.leftFirst', { name: rightLabel })],
                  ['concurrent', t('profileSetup.comorbidity.concurrent')],
                  ['unknown', t('profileSetup.comorbidity.unknown')],
                ] as const
              ).map(([value, label]) => (
                <Pressable
                  key={value}
                  style={[styles.chip, mode === value && styles.chipActive]}
                  onPress={() => setPairRelation(left, right, value)}
                >
                  <Text style={[styles.chipText, mode === value && styles.chipTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: 12 },
    empty: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.textSecondary,
    },
    card: {
      gap: 8,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.card,
    },
    cardTitle: {
      fontFamily: fonts.sansMedium,
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
    },
    chipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    chipText: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
    },
    chipTextActive: {
      color: colors.accent,
      fontFamily: fonts.sansMedium,
    },
  });
}
