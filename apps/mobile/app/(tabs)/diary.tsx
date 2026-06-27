import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CLINICAL_SCALES,
  buildAsitPrefill,
  buildFoodPrefill,
  buildInsectStingPrefill,
  buildMedicinePrefill,
  buildScaleInitialAnswers,
  buildTriggerPrefill,
  collectLatestScaleTrends,
  filterDiarySections,
  formatDiaryDate,
  formatDiaryEntrySummary,
  getClinicalScaleSection,
  getDiaryEntryAnswers,
  getDiarySection,
  getRecommendedScalesForConditions,
  isActPromptDue,
  isAsitCourseConfigured,
  parseAllergies,
  profileEnablesAsit,
  profileEnablesDrugFocus,
  profileEnablesFoodFocus,
  profileEnablesInsectFocus,
  type ClinicalScaleId,
} from '@allerguide/core';
import {
  addDiaryEntries,
  deleteDiaryEntry,
  getDiaryEntries,
  getLastDiaryAnswers,
  updateDiaryEntry,
} from '@/src/services/diary-service';
import { loadDiaryTriggerContext } from '@/src/services/diary-context-service';
import { getProfileConditions } from '@/src/services/profile-conditions-service';
import { getAsitCourse } from '@/src/services/asit-course-service';
import { getFoodDrugRegistry } from '@/src/services/food-drug-registry-service';
import { getInsectActionPlan } from '@/src/services/insect-action-plan-service';
import { getAllergyPassport } from '@/src/services/sos-passport-service';
import { listScanHistory } from '@/src/services/scan-history-service';
import { AsitCourseCard } from '@/src/components/AsitCourseCard';
import { DiaryInsightsCard } from '@/src/components/DiaryInsightsCard';
import { FoodDrugAllergyCard } from '@/src/components/FoodDrugAllergyCard';
import { InsectAllergyCard } from '@/src/components/InsectAllergyCard';
import { fetchWellnessSnapshot } from '@/src/services/wellness-service';
import { useAppStore } from '@/src/store/app-store';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
import { GlassCard } from '@/src/components/GlassCard';
import { EmptyState } from '@/src/components/EmptyState';
import { Button } from '@/src/components/Button';
import { Disclaimer } from '@/src/components/Disclaimer';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { DiaryLegacyEditor, DiaryWizard } from '@/src/components/DiaryWizard';
import { DiaryFormView } from '@/src/components/DiaryFormView';
import { DiaryEditorModal } from '@/src/components/DiaryEditorModal';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { localizeDiarySections, localizeDiaryType } from '@/src/i18n/content';
import type { DiaryEntry } from '@/src/types';
import { ProfileHeaderButton } from '@/src/components/ProfileHeaderButton';
import { MarketplaceModule } from '@/src/modules/marketplace';
import { reconcileAllReminders } from '@/src/services/reminder-reconcile-service';

const TYPE_ICONS: Record<string, string> = {
  Симптомы: 'pulse',
  Лекарство: 'medkit',
  Питание: 'restaurant',
  Триггер: 'warning',
  Кожа: 'body',
  Пикфлоуметрия: 'speedometer',
  АСИТ: 'fitness',
  'Укус насекомого': 'bug',
  'Визит к врачу': 'calendar',
  Заметка: 'create',
  Шкала: 'analytics',
};

type EditorState =
  | { mode: 'full' }
  | { mode: 'section'; sectionType: string; prefill?: Record<string, Record<string, string>> }
  | { mode: 'scale'; scaleId: ClinicalScaleId }
  | { mode: 'edit'; entry: DiaryEntry; legacy?: boolean };

export default function DiaryScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, locale, content } = useTranslation();
  const { openScale } = useLocalSearchParams<{ openScale?: string }>();
  const localeContent = content();
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const activeProfile = useAppStore((s) => s.activeProfile);
  const [list, setList] = useState<DiaryEntry[]>([]);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [scalePickerOpen, setScalePickerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const localizedSections = useMemo(
    () => localizeDiarySections(locale, localeContent),
    [locale, localeContent],
  );
  const profileConditions = useMemo(
    () => (activeProfile ? getProfileConditions(activeProfile) : []),
    [activeProfile],
  );
  const visibleSections = useMemo(
    () => filterDiarySections(localizedSections, profileConditions),
    [localizedSections, profileConditions],
  );
  const recommendedScaleIds = useMemo(
    () => getRecommendedScalesForConditions(profileConditions),
    [profileConditions],
  );
  const recommendedScales = useMemo(
    () => CLINICAL_SCALES.filter((scale) => recommendedScaleIds.includes(scale.id)),
    [recommendedScaleIds],
  );
  const otherScales = useMemo(
    () => CLINICAL_SCALES.filter((scale) => !recommendedScaleIds.includes(scale.id)),
    [recommendedScaleIds],
  );
  const scaleTrends = useMemo(() => collectLatestScaleTrends(list), [list]);
  const asitEnabled = useMemo(
    () => profileEnablesAsit(profileConditions),
    [profileConditions],
  );
  const foodFocusEnabled = useMemo(
    () =>
      activeProfile
        ? profileEnablesFoodFocus(profileConditions, parseAllergies(activeProfile.allergies))
        : false,
    [profileConditions, activeProfile],
  );
  const drugFocusEnabled = useMemo(() => {
    if (!activeProfileId) return false;
    const passport = getAllergyPassport(activeProfileId);
    return profileEnablesDrugFocus(profileConditions, passport.drugIntolerances);
  }, [profileConditions, activeProfileId]);
  const insectFocusEnabled = useMemo(
    () =>
      activeProfile
        ? profileEnablesInsectFocus(profileConditions, parseAllergies(activeProfile.allergies))
        : false,
    [profileConditions, activeProfile],
  );
  const foodDrugRegistry = useMemo(
    () => (activeProfileId ? getFoodDrugRegistry(activeProfileId) : null),
    [activeProfileId],
  );
  const drugIntolerances = useMemo(() => {
    if (!activeProfileId) return [];
    return getAllergyPassport(activeProfileId).drugIntolerances;
  }, [activeProfileId]);
  const asitCourse = useMemo(
    () => (activeProfileId ? getAsitCourse(activeProfileId) : null),
    [activeProfileId],
  );
  const actPromptDue = useMemo(
    () => isActPromptDue(list, profileConditions),
    [list, profileConditions],
  );
  const insectActionPlan = useMemo(
    () => (activeProfileId ? getInsectActionPlan(activeProfileId) : null),
    [activeProfileId],
  );

  const openSection = async (sectionType: string) => {
    if (sectionType === 'АСИТ' && activeProfileId) {
      const course = getAsitCourse(activeProfileId);
      if (course && isAsitCourseConfigured(course)) {
        setEditor({
          mode: 'section',
          sectionType,
          prefill: { АСИТ: buildAsitPrefill(course) },
        });
        return;
      }
    }
    if (sectionType === 'Питание' && activeProfile) {
      const allergies = parseAllergies(activeProfile.allergies);
      const registry = activeProfileId ? getFoodDrugRegistry(activeProfileId) : null;
      const scans = activeProfileId ? listScanHistory(activeProfileId) : [];
      const recentFoodScan = scans.find((scan) => scan.mode === 'product' || scan.mode === 'menu');
      const withinDay =
        recentFoodScan &&
        Date.now() - new Date(recentFoodScan.createdAt).getTime() <= 24 * 3_600_000;
      const prefill = buildFoodPrefill(
        allergies,
        registry,
        withinDay
          ? {
              productName: recentFoodScan.productName,
              verdict: recentFoodScan.verdict,
              level: recentFoodScan.level,
              matches: (() => {
                try {
                  return JSON.parse(recentFoodScan.matches) as string[];
                } catch {
                  return [];
                }
              })(),
              createdAt: recentFoodScan.createdAt,
            }
          : null,
      );
      setEditor({ mode: 'section', sectionType, prefill: { Питание: prefill } });
      return;
    }
    if (sectionType === 'Лекарство' && activeProfileId) {
      const passport = getAllergyPassport(activeProfileId);
      const basePrefill = buildMedicinePrefill(passport.drugIntolerances);
      const last = getLastDiaryAnswers(activeProfileId, 'Лекарство');
      const smartPrefill: Record<string, string> = { ...basePrefill };
      if (last?.medicine) smartPrefill.medicine = last.medicine;
      if (last?.dosage) smartPrefill.dosage = last.dosage;
      if (last?.takenAt) smartPrefill.takenAt = last.takenAt;
      setEditor({ mode: 'section', sectionType, prefill: { Лекарство: smartPrefill } });
      return;
    }
    if (sectionType === 'Укус насекомого' && activeProfile) {
      const allergies = parseAllergies(activeProfile.allergies);
      const plan = activeProfileId ? getInsectActionPlan(activeProfileId) : null;
      const prefill = buildInsectStingPrefill(allergies, plan);
      setEditor({ mode: 'section', sectionType, prefill: { 'Укус насекомого': prefill } });
      return;
    }
    if (sectionType === 'Триггер' && activeProfileId) {
      const allergiesJson = activeProfile?.allergies ?? '[]';
      const wellness = await fetchWellnessSnapshot(allergiesJson, [], locale).catch(() => null);
      const context = await loadDiaryTriggerContext(activeProfileId, wellness?.factors);
      const prefill = { Триггер: buildTriggerPrefill(context) };
      setEditor({ mode: 'section', sectionType, prefill });
      return;
    }
    setEditor({ mode: 'section', sectionType });
  };

  const load = useCallback(async () => {
    if (!activeProfileId) return;
    setList(await getDiaryEntries(activeProfileId));
  }, [activeProfileId]);

  const refresh = useCallback(async () => {
    if (!activeProfileId) return;
    setRefreshing(true);
    try {
      setList(await getDiaryEntries(activeProfileId));
    } finally {
      setRefreshing(false);
    }
  }, [activeProfileId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (openScale !== 'act') return;
    setEditor({ mode: 'scale', scaleId: 'act' });
    router.setParams({ openScale: undefined } as any);
  }, [openScale]);

  const closeEditor = () => setEditor(null);

  const handleCreate = async (entries: { type: string; details: string }[]) => {
    if (!activeProfileId) return;
    await addDiaryEntries(activeProfileId, entries);
    closeEditor();
    await load();
    void reconcileAllReminders();
  };

  const handleUpdate = async (entry: DiaryEntry, type: string, details: string) => {
    await updateDiaryEntry(entry.id, { type, details });
    closeEditor();
    await load();
    void reconcileAllReminders();
  };

  const confirmDelete = (entry: DiaryEntry) => {
    Alert.alert(
      t('diary.deleteTitle'),
      t('diary.deleteMessage', { type: localizeDiaryType(entry.type, localeContent) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteDiaryEntry(entry.id);
            closeEditor();
            await load();
            void reconcileAllReminders();
          },
        },
      ],
    );
  };

  const openEdit = (entry: DiaryEntry) => {
    const answers = getDiaryEntryAnswers(entry.type, entry.details);
    if (answers) {
      setEditor({ mode: 'edit', entry });
      return;
    }
    setEditor({ mode: 'edit', entry, legacy: true });
  };

  const handleRepeat = async (entry: DiaryEntry) => {
    if (!activeProfileId) return;
    await addDiaryEntries(activeProfileId, [{ type: entry.type, details: entry.details }]);
    await load();
    void reconcileAllReminders();
  };

  const renderEditor = () => {
    if (!editor) return null;

    if (editor.mode === 'edit' && editor.legacy) {
      return (
        <DiaryLegacyEditor
          value={entryDetailsText(editor.entry)}
          onCancel={closeEditor}
          onSave={(details) => void handleUpdate(editor.entry, editor.entry.type, details)}
          onDelete={() => confirmDelete(editor.entry)}
        />
      );
    }

    if (editor.mode === 'full') {
      return (
        <DiaryWizard
          sections={visibleSections}
          drugIntolerances={drugIntolerances}
          onCancel={closeEditor}
          onComplete={(entries) => void handleCreate(entries)}
        />
      );
    }

    if (editor.mode === 'scale') {
      const section = getClinicalScaleSection(editor.scaleId);
      return (
        <DiaryWizard
          sections={[section]}
          initialAnswersBySection={{ Шкала: buildScaleInitialAnswers(editor.scaleId) }}
          allowSkipSection={false}
          onCancel={closeEditor}
          onComplete={(entries) => void handleCreate(entries)}
        />
      );
    }

    const sectionType = editor.mode === 'section' ? editor.sectionType : editor.entry.type;
    const section = localizedSections.find((s) => s.type === sectionType) ?? getDiarySection(sectionType);
    if (!section) return null;

    const initialAnswers =
      editor.mode === 'edit'
        ? getDiaryEntryAnswers(editor.entry.type, editor.entry.details)
        : editor.mode === 'section'
          ? editor.prefill?.[section.type]
          : null;

    return (
      <DiaryFormView
        section={section}
        initialAnswers={initialAnswers ?? undefined}
        drugIntolerances={drugIntolerances}
        submitLabel={editor.mode === 'edit' ? t('diary.saveChanges') : t('common.save')}
        onCancel={closeEditor}
        onComplete={(entries) => {
          const [entry] = entries;
          if (!entry) return;
          if (editor.mode === 'edit') {
            void handleUpdate(editor.entry, entry.type, entry.details);
            return;
          }
          void handleCreate(entries);
        }}
        onDelete={editor.mode === 'edit' ? () => confirmDelete(editor.entry) : undefined}
      />
    );
  };

  return (
    <Screen
      onRefresh={activeProfileId && !editor ? () => void refresh() : undefined}
      refreshing={refreshing}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={ui.docLabel}>AllerGuide · {t('diary.eyebrow')}</Text>
          <Text style={ui.docTitle}>{t('diary.title')}</Text>
          <Text style={ui.docMeta}>{t('diary.subtitle')}</Text>
        </View>
        <ProfileHeaderButton />
      </View>

      <ProfileSwitcher />

      {actPromptDue ? (
        <GlassCard style={styles.actPromptCard}>
          <Text style={ui.cardTitle}>{t('diary.actPromptTitle')}</Text>
          <Text style={styles.actPromptText}>{t('diary.actPromptText')}</Text>
          <Button
            label={t('diary.actPromptButton')}
            variant="secondary"
            size="sm"
            onPress={() => setEditor({ mode: 'scale', scaleId: 'act' })}
          />
        </GlassCard>
      ) : null}

      {asitEnabled ? (
        <AsitCourseCard
          course={asitCourse}
          entries={list}
          onLogDose={() => void openSection('АСИТ')}
        />
      ) : null}

      {foodFocusEnabled && activeProfile ? (
        <FoodDrugAllergyCard
          mode="food"
          profileAllergies={parseAllergies(activeProfile.allergies)}
          drugIntolerances={drugIntolerances}
          registry={foodDrugRegistry}
          entries={list}
          onLogFood={() => void openSection('Питание')}
          onLogMedicine={() => void openSection('Лекарство')}
        />
      ) : null}

      {drugFocusEnabled ? (
        <FoodDrugAllergyCard
          mode="drug"
          profileAllergies={activeProfile ? parseAllergies(activeProfile.allergies) : []}
          drugIntolerances={drugIntolerances}
          registry={foodDrugRegistry}
          entries={list}
          onLogFood={() => void openSection('Питание')}
          onLogMedicine={() => void openSection('Лекарство')}
        />
      ) : null}

      {insectFocusEnabled && activeProfile ? (
        <InsectAllergyCard
          profileAllergies={parseAllergies(activeProfile.allergies)}
          plan={insectActionPlan}
          entries={list}
          onLogSting={() => void openSection('Укус насекомого')}
        />
      ) : null}

      <Button label={t('diary.newEntry')} variant="primary" block onPress={() => setEditor({ mode: 'full' })} />
      <Button
        label={t('diary.quickEntry')}
        variant="secondary"
        block
        onPress={() => {
          const section = visibleSections.find((s) => s.type === 'Симптомы') ?? visibleSections[0];
          if (section) setEditor({ mode: 'section', sectionType: section.type });
        }}
      />

      <GlassCard>
        <Text style={ui.cardTitle}>{t('diary.quickAdd')}</Text>
        <View style={styles.chipRow}>
          {visibleSections.map((section) => (
              <Pressable
                key={section.type}
                style={styles.chip}
                onPress={() => void openSection(section.type)}
                accessibilityRole="button"
                accessibilityLabel={section.title}>
                <Ionicons
                  name={(TYPE_ICONS[section.type] ?? section.icon) as any}
                  size={14}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.chipText}>{section.title}</Text>
              </Pressable>
            ))}
          <Pressable
            style={styles.chip}
            onPress={() => setScalePickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('diary.scale')}>
            <Ionicons name="analytics" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.chipText}>{t('diary.scale')}</Text>
          </Pressable>
        </View>
      </GlassCard>

      {scaleTrends.length > 0 ? (
        <GlassCard>
          <Text style={ui.cardTitle}>{t('diary.scaleTrends')}</Text>
          {scaleTrends.map((trend, index) => (
            <View
              key={trend.scaleId}
              style={[styles.trendRow, index === 0 && styles.trendRowFirst]}>
              <Text style={styles.trendLabel}>{trend.label}</Text>
              <Text style={styles.trendValue}>
                {trend.total} · {trend.interpretation}
              </Text>
              <Text style={styles.trendMeta}>{formatDiaryDate(trend.at)}</Text>
            </View>
          ))}
        </GlassCard>
      ) : null}

      {scalePickerOpen ? (
        <GlassCard style={styles.scalePicker}>
          <Text style={ui.cardTitle}>{t('diary.scalePick')}</Text>
          <Text style={styles.scaleHint}>{t('diary.scaleRaaciHint')}</Text>
          {recommendedScales.length > 0 ? (
            <>
              <Text style={styles.scaleGroupLabel}>{t('diary.scaleSuggested')}</Text>
              <View style={styles.chipRow}>
                {recommendedScales.map((scale) => (
                  <Pressable
                    key={scale.id}
                    style={[styles.chip, styles.chipAccent]}
                    onPress={() => {
                      setScalePickerOpen(false);
                      setEditor({ mode: 'scale', scaleId: scale.id });
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={scale.shortLabel}>
                    <Text style={styles.chipText}>{scale.shortLabel}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
          {otherScales.length > 0 ? (
            <View style={styles.chipRow}>
              {otherScales.map((scale) => (
                <Pressable
                  key={scale.id}
                  style={styles.chip}
                  onPress={() => {
                    setScalePickerOpen(false);
                    setEditor({ mode: 'scale', scaleId: scale.id });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={scale.shortLabel}>
                  <Text style={styles.chipText}>{scale.shortLabel}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Button label={t('common.cancel')} variant="secondary" size="sm" onPress={() => setScalePickerOpen(false)} />
        </GlassCard>
      ) : null}

      <DiaryEditorModal visible={editor !== null} onClose={closeEditor}>
        {renderEditor()}
      </DiaryEditorModal>

      <Button
        label={t('diary.doctorReport')}
        variant="secondary"
        block
        onPress={() => router.push('/doctor-report' as any)}
      />

      <DiaryInsightsCard entries={list} />

      <MarketplaceModule variant="embedded" />

      {list.length === 0 ? (
        <EmptyState icon="document-text-outline" title={t('diary.history')} description={t('diary.empty')} />
      ) : (
        <GlassCard padded={false}>
          <View style={styles.listHead}>
            <Text style={[ui.cardTitle, styles.listHeadPad]}>{t('diary.history')}</Text>
          </View>

          {list.map((item, index) => {
            const icon = TYPE_ICONS[item.type] ?? 'create';
            const summary = formatDiaryEntrySummary(item.type, item.details);
            return (
              <Pressable
                key={item.id}
                style={[styles.row, index < list.length - 1 && styles.rowBorder]}
                onPress={() => openEdit(item)}>
                <View style={ui.feedIcon}>
                  <Ionicons name={icon as any} size={16} color={theme.colors.textSecondary} />
                </View>
                <View style={ui.feedBody}>
                  <Text style={ui.feedTitle}>{localizeDiaryType(item.type, localeContent)}</Text>
                  <Text style={ui.feedSub}>{summary}</Text>
                  <Text style={styles.cardMeta}>{formatDiaryDate(item.createdAt)}</Text>
                </View>
                <View style={styles.rowEnd}>
                  <Pressable
                    style={styles.repeatBtn}
                    onPress={(e) => { e.stopPropagation(); void handleRepeat(item); }}
                    accessibilityLabel={t('diaryForm.repeat')}>
                    <Ionicons name="copy-outline" size={16} color={theme.colors.accent} />
                  </Pressable>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                </View>
              </Pressable>
            );
          })}
        </GlassCard>
      )}

      <Disclaimer>{t('diary.disclaimer')}</Disclaimer>
    </Screen>
  );
}

function entryDetailsText(entry: DiaryEntry): string {
  const answers = getDiaryEntryAnswers(entry.type, entry.details);
  if (answers?.noteBody) return answers.noteBody;
  return entry.details.trim();
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    headerText: { flex: 1, gap: 2 },
    actPromptCard: { gap: 8 },
    actPromptText: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    rowEnd: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    repeatBtn: { padding: 6, borderRadius: 6 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 7,
      paddingHorizontal: 10,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    chipText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    scalePicker: { gap: 10 },
    scaleHint: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 17,
    },
    scaleGroupLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    chipAccent: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    trendRow: {
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 2,
    },
    trendRowFirst: { borderTopWidth: 0, paddingTop: 0 },
    trendLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.head,
    },
    trendValue: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
    },
    trendMeta: {
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.textMuted,
    },
    listHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 14,
    },
    listHeadPad: { paddingHorizontal: 16 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    cardMeta: {
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
    },
  });
}
