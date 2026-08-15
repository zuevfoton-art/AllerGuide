import { Linking, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  GINA_ASTHMA_ATTRIBUTION,
  profileEnablesPeakFlow,
  type AsthmaActionPlan,
} from '@allerguide/core';
import { Screen } from '@/src/components/Screen';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { Disclaimer } from '@/src/components/Disclaimer';
import { useAppStore } from '@/src/store/app-store';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { Ionicons } from '@expo/vector-icons';
import { getProfileConditions } from '@/src/services/profile-conditions-service';
import {
  createEmptyAsthmaActionPlan,
  getAsthmaActionPlan,
  saveAsthmaActionPlan,
} from '@/src/services/asthma-action-plan-service';

const GINA_REPORT_URL = 'https://ginasthma.org/reports/';

export default function AsthmaActionPlanScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const profile = useAppStore((s) => s.activeProfile);
  const profileId = profile?.id;
  const [plan, setPlan] = useState<AsthmaActionPlan>(() => createEmptyAsthmaActionPlan());

  const asthmaEnabled = useMemo(() => {
    if (!profile) return false;
    return profileEnablesPeakFlow(getProfileConditions(profile));
  }, [profile]);

  useEffect(() => {
    if (!profileId) return;
    const existing = getAsthmaActionPlan(profileId);
    if (existing) setPlan(existing);
  }, [profileId]);

  const save = () => {
    if (!profileId) return;
    saveAsthmaActionPlan(profileId, plan);
    router.back();
  };

  if (!profile) {
    return (
      <Screen>
        <ScreenHeader onBack={() => router.back()} title={t('asthma.noProfile')} />
        <Text style={styles.empty}>{t('asthma.noProfile')}</Text>
      </Screen>
    );
  }

  if (!asthmaEnabled) {
    return (
      <Screen>
        <ScreenHeader
          onBack={() => router.back()}
          eyebrow={t('asthma.eyebrow')}
          title={t('asthma.planTitle')}
          style={{ marginBottom: 12 }}
        />
        <GlassCard>
          <Text style={styles.hint}>{t('asthma.notEligible')}</Text>
        </GlassCard>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        onBack={() => router.back()}
        eyebrow={t('asthma.eyebrow')}
        title={t('asthma.planTitle')}
        subtitle={t('asthma.planSubtitle')}
        style={{ marginBottom: 12 }}
      />

      <GlassCard style={styles.section}>
        <Text style={ui.sectionLabel}>{t('asthma.personalBest')}</Text>
        <TextInput
          style={styles.input}
          value={plan.personalBestPef}
          onChangeText={(personalBestPef) => setPlan((prev) => ({ ...prev, personalBestPef }))}
          placeholder={t('asthma.personalBestPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="number-pad"
        />

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asthma.relieverMedication')}</Text>
        <TextInput
          style={styles.input}
          value={plan.relieverMedication}
          onChangeText={(relieverMedication) => setPlan((prev) => ({ ...prev, relieverMedication }))}
          placeholder={t('asthma.relieverMedicationPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
        />

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asthma.controllerNotes')}</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={plan.controllerNotes}
          onChangeText={(controllerNotes) => setPlan((prev) => ({ ...prev, controllerNotes }))}
          placeholder={t('asthma.controllerNotesPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          multiline
          textAlignVertical="top"
        />

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asthma.yellowZoneSteps')}</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={plan.yellowZoneSteps}
          onChangeText={(yellowZoneSteps) => setPlan((prev) => ({ ...prev, yellowZoneSteps }))}
          placeholder={t('asthma.yellowZoneStepsPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          multiline
          textAlignVertical="top"
        />

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asthma.redZoneSteps')}</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={plan.redZoneSteps}
          onChangeText={(redZoneSteps) => setPlan((prev) => ({ ...prev, redZoneSteps }))}
          placeholder={t('asthma.redZoneStepsPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          multiline
          textAlignVertical="top"
        />

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asthma.clinicalNotes')}</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={plan.clinicalNotes}
          onChangeText={(clinicalNotes) => setPlan((prev) => ({ ...prev, clinicalNotes }))}
          placeholder={t('asthma.clinicalNotesPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          multiline
          textAlignVertical="top"
        />
      </GlassCard>

      <Pressable style={styles.ginaLink} onPress={() => void Linking.openURL(GINA_REPORT_URL)}>
        <Text style={styles.ginaLinkText}>{t('asthma.ginaLink')}</Text>
        <Ionicons name="open-outline" size={14} color={theme.colors.accent} />
      </Pressable>

      <Button label={t('asthma.savePlan')} variant="primary" block onPress={save} />
      <Disclaimer>{t('asthma.disclaimer')}</Disclaimer>
      <Text style={styles.attribution}>{GINA_ASTHMA_ATTRIBUTION}</Text>
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    section: { gap: 4, marginBottom: 12 },
    fieldGap: { marginTop: 12 },
    input: {
      backgroundColor: colors.card,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.borderInput,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      fontFamily: fonts.sans,
      color: colors.text,
    },
    inputMultiline: { minHeight: 96, lineHeight: 22 },
    ginaLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 12,
      paddingVertical: 4,
    },
    ginaLinkText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
    },
    empty: {
      fontFamily: fonts.sans,
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingVertical: 24,
    },
    hint: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    attribution: {
      marginTop: 8,
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.textMuted,
      lineHeight: 15,
    },
  });
}
