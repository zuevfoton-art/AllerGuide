import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CLINICAL_SCALES,
  collectLatestScaleTrends,
  collectScaleHistory,
  formatDiaryDate,
  type ClinicalScaleId,
} from '@allerguide/core';
import { buildClinicalScaleEditorState } from '@/src/services/diary-section-service';
import { addDiaryEntries, getDiaryEntries } from '@/src/services/diary-service';
import { getProfileCapabilities } from '@/src/services/profile-capabilities-service';
import { useAppStore } from '@/src/store/app-store';
import { Screen } from '@/src/components/Screen';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { GlassCard } from '@/src/components/GlassCard';
import { Disclaimer } from '@/src/components/Disclaimer';
import { CardTitle } from '@/src/components/CardTitle';
import { DiaryEditorModal } from '@/src/components/DiaryEditorModal';
import { DiaryWizard } from '@/src/components/DiaryWizard';
import { DiaryTrendChart } from '@/src/components/diary/DiaryTrendChart';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { badgeStyle, useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTranslation } from '@/src/store/locale-store';
import { logCaughtError } from '@/src/services/error-reporting';
import { getOrLoadActiveProfileId } from '@/src/services/profile-service';
import type { DiaryEntry } from '@/src/types';

export default function ClinicalScalesScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const { openScale } = useLocalSearchParams<{ openScale?: string }>();
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const activeProfile = useAppStore((s) => s.activeProfile);
  const [list, setList] = useState<DiaryEntry[]>([]);
  const [scaleId, setScaleId] = useState<ClinicalScaleId | null>(null);

  const capabilities = useMemo(
    () => (activeProfile ? getProfileCapabilities(activeProfile) : null),
    [activeProfile],
  );
  const recommendedScaleIds = capabilities?.recommendedScaleIds ?? [];
  const recommendedScales = CLINICAL_SCALES.filter((scale) => recommendedScaleIds.includes(scale.id));
  const otherScales = CLINICAL_SCALES.filter((scale) => !recommendedScaleIds.includes(scale.id));
  const scaleTrends = useMemo(() => collectLatestScaleTrends(list), [list]);

  const load = useCallback(async () => {
    const profileId = activeProfileId ?? getOrLoadActiveProfileId();
    if (!profileId) {
      setList([]);
      return;
    }
    setList(await getDiaryEntries(profileId));
  }, [activeProfileId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (!openScale) return;
    const match = CLINICAL_SCALES.find((scale) => scale.id === openScale);
    if (match) setScaleId(match.id);
    router.setParams({ openScale: undefined } as any);
  }, [openScale]);

  const scaleEditor = scaleId ? buildClinicalScaleEditorState(scaleId) : null;

  const handleCreate = async (entries: { type: string; details: string; photoUris?: string[] }[]) => {
    const profileId = activeProfileId ?? getOrLoadActiveProfileId();
    if (!profileId) return;
    const results = await addDiaryEntries(profileId, entries);
    const failed = results.find((result) => !result.ok);
    if (failed && !failed.ok) {
      logCaughtError('ClinicalScalesScreen.handleCreate', new Error(failed.code));
      return;
    }
    setScaleId(null);
    await load();
  };

  return (
    <Screen>
      <ScreenHeader
        onBack={() => router.back()}
        title={t('clinicalScales.title')}
        subtitle={t('clinicalScales.subtitle')}
      />

      <GlassCard>
        <CardTitle>{t('diary.scalePick')}</CardTitle>
        <Text style={styles.hint}>{t('diary.scaleRaaciHint')}</Text>
        {recommendedScales.length > 0 ? (
          <>
            <Text style={ui.sectionLabel}>{t('diary.scaleSuggested')}</Text>
            <View style={styles.chipRow}>
              {recommendedScales.map((scale) => (
                <Pressable
                  key={scale.id}
                  style={[styles.chip, styles.chipAccent]}
                  onPress={() => setScaleId(scale.id)}
                  accessibilityRole="button"
                  accessibilityLabel={scale.shortLabel}
                  hitSlop={8}>
                  <Text style={styles.chipText}>{scale.shortLabel}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
        <View style={styles.chipRow}>
          {otherScales.map((scale) => (
            <Pressable
              key={scale.id}
              style={styles.chip}
              onPress={() => setScaleId(scale.id)}
              accessibilityRole="button"
              accessibilityLabel={scale.shortLabel}
              hitSlop={8}>
              <Text style={styles.chipText}>{scale.shortLabel}</Text>
            </Pressable>
          ))}
        </View>
      </GlassCard>

      {scaleTrends.length > 0 ? (
        <GlassCard>
          <CardTitle>{t('diary.scaleTrends')}</CardTitle>
          {scaleTrends.map((trend, index) => {
            const history = collectScaleHistory(list, trend.scaleId, 90);
            const last = history[history.length - 1];
            const zone =
              last && last.severity >= 3 ? 'alarm' : last && last.severity >= 2 ? 'attention' : 'calm';
            const badge = badgeStyle(
              last && last.severity >= 3 ? 'danger' : last && last.severity >= 2 ? 'warn' : 'ok',
              theme,
            );
            return (
              <View key={trend.scaleId} style={[styles.trendRow, index === 0 && styles.trendRowFirst]}>
                <GlassCard zone={zone} padded={false} style={styles.trendCard}>
                  <View style={styles.trendHead}>
                    <Text style={styles.trendLabel}>{trend.label}</Text>
                    <View style={[ui.badge, badge.container]}>
                      <Text style={[ui.badgeText, badge.text]}>
                        {trend.total} · {trend.interpretation}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.trendMeta}>{formatDiaryDate(trend.at)}</Text>
                  {history.length > 1 ? <DiaryTrendChart points={history} height={72} /> : null}
                </GlassCard>
              </View>
            );
          })}
        </GlassCard>
      ) : (
        <GlassCard>
          <Text style={styles.hint}>{t('diary.scaleTrendsEmpty')}</Text>
        </GlassCard>
      )}

      <DiaryEditorModal visible={scaleEditor !== null} onClose={() => setScaleId(null)}>
        {scaleEditor?.section ? (
          <DiaryWizard
            sections={[scaleEditor.section]}
            initialAnswersBySection={scaleEditor.prefill}
            allowSkipSection={false}
            profileAllergiesJson={activeProfile?.allergies ?? '[]'}
            onCancel={() => setScaleId(null)}
            onComplete={(entries) => void handleCreate(entries)}
          />
        ) : null}
      </DiaryEditorModal>

      <Disclaimer collapsible>{t('diary.disclaimer')}</Disclaimer>
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    hint: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 17,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    chip: {
      paddingVertical: 7,
      paddingHorizontal: 10,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    chipAccent: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    chipText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    trendRow: {
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 2,
    },
    trendRowFirst: { borderTopWidth: 0, paddingTop: 0 },
    trendCard: { padding: 12, gap: 6 },
    trendHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    trendLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.head,
    },
    trendValue: { fontFamily: fonts.sans, fontSize: 13, color: colors.textSecondary },
    trendMeta: { fontFamily: fonts.sans, fontSize: 11, color: colors.textMuted },
  });
}
