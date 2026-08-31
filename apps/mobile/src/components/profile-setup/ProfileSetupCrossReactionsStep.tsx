import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getCrossReactionsForSelection,
  type CrossReactionMatch,
} from '@allerguide/core';
import { Disclaimer } from '@/src/components/Disclaimer';
import { GlassCard } from '@/src/components/GlassCard';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import {
  crossReactionRiskColor,
  formatCrossReactionLabel,
} from '@/src/i18n/cross-reactions';
import { useTranslation } from '@/src/store/locale-store';

interface ProfileSetupCrossReactionsStepProps {
  selectedAllergenIds: string[];
  /** Related allergen ids the user checked to add. */
  pendingIds: string[];
  onPendingChange: (ids: string[]) => void;
}

export function ProfileSetupCrossReactionsStep({
  selectedAllergenIds,
  pendingIds,
  onPendingChange,
}: ProfileSetupCrossReactionsStepProps) {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const matches = useMemo(
    () => getCrossReactionsForSelection(selectedAllergenIds),
    [selectedAllergenIds],
  );

  const toggle = (match: CrossReactionMatch) => {
    const id = match.allergen.id;
    if (pendingIds.includes(id)) {
      onPendingChange(pendingIds.filter((item) => item !== id));
      return;
    }
    onPendingChange([...pendingIds, id]);
  };

  return (
    <GlassCard style={styles.section}>
      <Text style={ui.sectionLabel}>{t('profileSetup.crossReactions.title')}</Text>
      <Text style={styles.hint}>{t('profileSetup.crossReactions.hint')}</Text>

      <View style={styles.list}>
        {matches.map((match) => {
          const active = pendingIds.includes(match.allergen.id);
          const riskColor = crossReactionRiskColor(match.risk, theme.colors);
          return (
            <Pressable
              key={match.allergen.id}
              testID={`cross-reaction-${match.allergen.id}`}
              style={[styles.row, active && styles.rowActive]}
              onPress={() => toggle(match)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
            >
              <Ionicons
                name={active ? 'checkbox' : 'square-outline'}
                size={22}
                color={active ? theme.colors.accent : theme.colors.textMuted}
              />
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{formatCrossReactionLabel(match, t)}</Text>
                {match.note ? <Text style={styles.rowNote}>{match.note}</Text> : null}
                {match.risk ? (
                  <Text style={[styles.rowRisk, { color: riskColor }]}>
                    {t(
                      match.risk === 'high'
                        ? 'allergens.crossRiskHigh'
                        : match.risk === 'medium'
                          ? 'allergens.crossRiskMedium'
                          : 'allergens.crossRiskLow',
                    )}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Disclaimer>{t('profileSetup.crossReactions.disclaimer')}</Disclaimer>
    </GlassCard>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    section: { gap: 10 },
    hint: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    list: { gap: 8 },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      padding: 12,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.borderInput,
      backgroundColor: colors.card,
    },
    rowActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    rowBody: { flex: 1, gap: 4 },
    rowTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    rowNote: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    rowRisk: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
    },
  });
}
