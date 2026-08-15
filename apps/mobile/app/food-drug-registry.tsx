import { StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  extractFoodAllergensFromProfile,
  parseAllergies,
  type FoodDrugRegistry,
} from '@allerguide/core';
import { Screen } from '@/src/components/Screen';
import { ScreenEyebrow } from '@/src/components/ScreenEyebrow';
import { ScreenBackBrandHeader } from '@/src/components/brand/ScreenBackBrandHeader';
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { Disclaimer } from '@/src/components/Disclaimer';
import { useAppStore } from '@/src/store/app-store';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { getProfileCapabilities } from '@/src/services/profile-capabilities-service';
import {
  createEmptyFoodDrugRegistry,
  getFoodDrugRegistry,
  saveFoodDrugRegistry,
} from '@/src/services/food-drug-registry-service';

function parseListInput(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatListInput(items: string[]): string {
  return items.join(', ');
}

export default function FoodDrugRegistryScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const profile = useAppStore((s) => s.activeProfile);
  const profileId = profile?.id;
  const [registry, setRegistry] = useState<FoodDrugRegistry>(() => createEmptyFoodDrugRegistry());
  const [extraAvoidFoods, setExtraAvoidFoods] = useState('');

  const foodEnabled = useMemo(() => {
    if (!profile) return false;
    return getProfileCapabilities(profile).modules.foodFocus;
  }, [profile]);

  const profileFoodAllergens = useMemo(
    () => (profile ? extractFoodAllergensFromProfile(parseAllergies(profile.allergies)) : []),
    [profile],
  );

  useEffect(() => {
    if (!profileId) return;
    const existing = getFoodDrugRegistry(profileId);
    if (existing) {
      setRegistry(existing);
      setExtraAvoidFoods(formatListInput(existing.extraAvoidFoods));
    }
  }, [profileId]);

  const save = () => {
    if (!profileId) return;
    const next: FoodDrugRegistry = {
      ...registry,
      extraAvoidFoods: parseListInput(extraAvoidFoods),
    };
    saveFoodDrugRegistry(profileId, next);
    router.back();
  };

  if (!profile) {
    return (
      <Screen>
        <ScreenBackBrandHeader />
        <Text style={styles.empty}>{t('foodDrug.noProfile')}</Text>
      </Screen>
    );
  }

  if (!foodEnabled) {
    return (
      <Screen>
        <ScreenBackBrandHeader />
        <View style={styles.headerText}>
          <ScreenEyebrow section={t('foodDrug.eyebrow')} />
          <Text style={ui.docTitle}>{t('foodDrug.registryTitle')}</Text>
        </View>
        <GlassCard>
          <Text style={styles.hint}>{t('foodDrug.notEligibleFood')}</Text>
        </GlassCard>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenBackBrandHeader />
      <View style={styles.headerText}>
        <ScreenEyebrow section={t('foodDrug.eyebrow')} />
        <Text style={ui.docTitle}>{t('foodDrug.registryTitle')}</Text>
        <Text style={ui.docMeta}>{t('foodDrug.registrySubtitle')}</Text>
      </View>

      <GlassCard style={styles.section}>
        <Text style={ui.sectionLabel}>{t('foodDrug.profileAllergens')}</Text>
        <Text style={styles.readonly}>
          {profileFoodAllergens.length ? profileFoodAllergens.join(', ') : t('foodDrug.noProfileAllergens')}
        </Text>

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('foodDrug.extraAvoidFoods')}</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={extraAvoidFoods}
          onChangeText={setExtraAvoidFoods}
          placeholder={t('foodDrug.extraAvoidFoodsPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          multiline
          textAlignVertical="top"
        />

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('foodDrug.clinicalNotes')}</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={registry.clinicalNotes}
          onChangeText={(clinicalNotes) => setRegistry((prev) => ({ ...prev, clinicalNotes }))}
          placeholder={t('foodDrug.clinicalNotesPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          multiline
          textAlignVertical="top"
        />
      </GlassCard>

      <Button label={t('foodDrug.saveRegistry')} variant="primary" block onPress={save} />
      <Disclaimer>{t('foodDrug.disclaimer')}</Disclaimer>
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
    readonly: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
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
