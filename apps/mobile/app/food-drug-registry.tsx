import { StyleSheet, Text, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  extractFoodAllergensFromProfile,
  parseAllergies,
  type FoodDrugRegistry,
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
        <ScreenHeader
          onBack={() => router.back()}
          eyebrow={t('foodDrug.eyebrow')}
          title={t('foodDrug.registryTitle')}
          style={{ marginBottom: 12 }}
        />
        <GlassCard>
          <Text style={styles.hint}>{t('foodDrug.notEligibleFood')}</Text>
        </GlassCard>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        onBack={() => router.back()}
        eyebrow={t('foodDrug.eyebrow')}
        title={t('foodDrug.registryTitle')}
        subtitle={t('foodDrug.registrySubtitle')}
        style={{ marginBottom: 12 }}
      />

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
