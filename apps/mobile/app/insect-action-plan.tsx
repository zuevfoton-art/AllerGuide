import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  extractInsectAllergensFromProfile,
  getConsolidatedInsectList,
  parseAllergies,
  profileEnablesInsectFocus,
  type InsectActionPlan,
} from '@allerguide/core';
import { Screen } from '@/src/components/Screen';
import { ScreenEyebrow } from '@/src/components/ScreenEyebrow';
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
  createEmptyInsectActionPlan,
  getInsectActionPlan,
  saveInsectActionPlan,
} from '@/src/services/insect-action-plan-service';

function parseListInput(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatListInput(items: string[]): string {
  return items.join(', ');
}

export default function InsectActionPlanScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const profile = useAppStore((s) => s.activeProfile);
  const profileId = profile?.id;
  const [plan, setPlan] = useState<InsectActionPlan>(() => createEmptyInsectActionPlan());
  const [knownInsects, setKnownInsects] = useState('');

  const insectEnabled = useMemo(() => {
    if (!profile) return false;
    return profileEnablesInsectFocus(getProfileConditions(profile), parseAllergies(profile.allergies));
  }, [profile]);

  const profileInsects = useMemo(
    () => (profile ? extractInsectAllergensFromProfile(parseAllergies(profile.allergies)) : []),
    [profile],
  );

  useEffect(() => {
    if (!profileId) return;
    const existing = getInsectActionPlan(profileId);
    if (existing) {
      setPlan(existing);
      setKnownInsects(formatListInput(existing.knownInsects));
    }
  }, [profileId]);

  const save = () => {
    if (!profileId) return;
    const next: InsectActionPlan = {
      ...plan,
      knownInsects: parseListInput(knownInsects),
    };
    saveInsectActionPlan(profileId, next);
    router.back();
  };

  if (!profile) {
    return (
      <Screen>
        <Text style={styles.empty}>{t('insect.noProfile')}</Text>
      </Screen>
    );
  }

  if (!insectEnabled) {
    return (
      <Screen>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
          </Pressable>
          <View style={styles.headerText}>
            <ScreenEyebrow section={t('insect.eyebrow')} />
            <Text style={ui.docTitle}>{t('insect.planTitle')}</Text>
          </View>
        </View>
        <GlassCard>
          <Text style={styles.hint}>{t('insect.notEligible')}</Text>
        </GlassCard>
      </Screen>
    );
  }

  const consolidated = getConsolidatedInsectList(parseAllergies(profile.allergies), {
    ...plan,
    knownInsects: parseListInput(knownInsects),
  });

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <ScreenEyebrow section={t('insect.eyebrow')} />
          <Text style={ui.docTitle}>{t('insect.planTitle')}</Text>
          <Text style={ui.docMeta}>{t('insect.planSubtitle')}</Text>
        </View>
      </View>

      <GlassCard style={styles.section}>
        <Text style={ui.sectionLabel}>{t('insect.profileInsects')}</Text>
        <Text style={styles.profileList}>
          {profileInsects.length ? profileInsects.join(', ') : t('insect.noProfileInsects')}
        </Text>

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('insect.knownInsects')}</Text>
        <TextInput
          style={styles.input}
          value={knownInsects}
          onChangeText={setKnownInsects}
          placeholder={t('insect.knownInsectsPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
        />

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('insect.adrenalineLocation')}</Text>
        <TextInput
          style={styles.input}
          value={plan.adrenalineLocation}
          onChangeText={(adrenalineLocation) => setPlan((prev) => ({ ...prev, adrenalineLocation }))}
          placeholder={t('insect.adrenalineLocationPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
        />

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('insect.emergencySteps')}</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={plan.emergencySteps}
          onChangeText={(emergencySteps) => setPlan((prev) => ({ ...prev, emergencySteps }))}
          placeholder={t('insect.emergencyStepsPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          multiline
          textAlignVertical="top"
        />

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('insect.clinicalNotes')}</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={plan.clinicalNotes}
          onChangeText={(clinicalNotes) => setPlan((prev) => ({ ...prev, clinicalNotes }))}
          placeholder={t('insect.clinicalNotesPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          multiline
          textAlignVertical="top"
        />

        {consolidated.length ? (
          <Text style={styles.consolidated}>
            {t('insect.consolidated')}: {consolidated.join(', ')}
          </Text>
        ) : null}
      </GlassCard>

      <Button label={t('insect.savePlan')} variant="primary" block onPress={save} />
      <Disclaimer>{t('insect.disclaimer')}</Disclaimer>
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 6,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 2,
    },
    headerText: { flex: 1, gap: 2 },
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
    profileList: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    consolidated: {
      marginTop: 12,
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 17,
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
  });
}
