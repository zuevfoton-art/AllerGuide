import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  SYMPTOM_USUAL_SEVERITIES,
  SYMPTOM_ZONE_IDS,
  suggestSymptomsForProfile,
  type AllergyConditionId,
  type ProfileSymptomBaseline,
  type SymptomUsualSeverity,
  type SymptomZoneId,
} from '@allerguide/core';
import { Disclaimer } from '@/src/components/Disclaimer';
import { GlassCard } from '@/src/components/GlassCard';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

interface ProfileSetupSymptomsStepProps {
  conditions: AllergyConditionId[];
  baseline: ProfileSymptomBaseline;
  onChange: (baseline: ProfileSymptomBaseline) => void;
}

export function ProfileSetupSymptomsStep({
  conditions,
  baseline,
  onChange,
}: ProfileSetupSymptomsStepProps) {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const suggestions = useMemo(
    () => suggestSymptomsForProfile(conditions, baseline.zoneIds),
    [conditions, baseline.zoneIds],
  );

  const touchUpdated = (patch: Partial<ProfileSymptomBaseline>) => {
    onChange({
      ...baseline,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  };

  const toggleZone = (zoneId: SymptomZoneId) => {
    const zoneIds = baseline.zoneIds.includes(zoneId)
      ? baseline.zoneIds.filter((id) => id !== zoneId)
      : [...baseline.zoneIds, zoneId];
    // Drop typical symptoms that no longer match suggested set for new zones.
    const allowed = new Set(suggestSymptomsForProfile(conditions, zoneIds).map((item) => item.id));
    touchUpdated({
      zoneIds,
      typicalSymptomIds: baseline.typicalSymptomIds.filter((id) => allowed.has(id)),
    });
  };

  const setSeverity = (severity: SymptomUsualSeverity) => {
    touchUpdated({
      usualSeverity: baseline.usualSeverity === severity ? null : severity,
    });
  };

  const toggleSymptom = (symptomId: string) => {
    const typicalSymptomIds = baseline.typicalSymptomIds.includes(symptomId)
      ? baseline.typicalSymptomIds.filter((id) => id !== symptomId)
      : baseline.typicalSymptomIds.length >= 8
        ? baseline.typicalSymptomIds
        : [...baseline.typicalSymptomIds, symptomId];
    touchUpdated({ typicalSymptomIds });
  };

  return (
    <GlassCard style={styles.section}>
      <Text style={ui.sectionLabel}>{t('profileSetup.symptoms.title')}</Text>
      <Text style={styles.hint}>{t('profileSetup.symptoms.hint')}</Text>

      <Text style={styles.groupLabel}>{t('profileSetup.symptoms.zonesLabel')}</Text>
      <View style={styles.chipGrid}>
        {SYMPTOM_ZONE_IDS.map((zoneId) => {
          const active = baseline.zoneIds.includes(zoneId);
          return (
            <Pressable
              key={zoneId}
              testID={`symptom-zone-${zoneId}`}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggleZone(zoneId)}>
              {active ? (
                <Ionicons name="checkmark-circle" size={14} color={theme.colors.accent} />
              ) : null}
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {t(`profileSetup.symptoms.zones.${zoneId}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.groupLabel}>{t('profileSetup.symptoms.severityLabel')}</Text>
      <View style={styles.chipGrid}>
        {SYMPTOM_USUAL_SEVERITIES.map((severity) => {
          const active = baseline.usualSeverity === severity;
          return (
            <Pressable
              key={severity}
              testID={`symptom-severity-${severity}`}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setSeverity(severity)}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {t(`profileSetup.symptoms.severity.${severity}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.groupLabel}>{t('profileSetup.symptoms.typicalLabel')}</Text>
      <View style={styles.chipGrid}>
        {suggestions.map((item) => {
          const active = baseline.typicalSymptomIds.includes(item.id);
          return (
            <Pressable
              key={item.id}
              testID={`symptom-typical-${item.id}`}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggleSymptom(item.id)}>
              {active ? (
                <Ionicons name="checkmark-circle" size={14} color={theme.colors.accent} />
              ) : null}
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.labelRu}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.skipHint}>{t('profileSetup.symptoms.skipHint')}</Text>
      <Disclaimer>{t('profileSetup.symptoms.disclaimer')}</Disclaimer>
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
    groupLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 4,
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
      fontSize: 13,
      color: colors.textSecondary,
    },
    chipTextActive: {
      fontFamily: fonts.sansSemiBold,
      color: colors.accent,
      fontWeight: '600',
    },
    skipHint: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 16,
    },
  });
}
