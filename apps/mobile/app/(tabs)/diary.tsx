import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  DIARY_AUTO_STEP_IDS,
  buildAdaptiveDiaryWizardSections,
  filterDiarySections,
  formatDiaryDate,
  formatDiaryEntrySummary,
  getDiaryEntryAnswers,
  getDiarySection,
  getAsthmaPlanPersonalBest,
  isDiaryHistoryVisible,
  parseAllergies,
  type DiaryAutoMetadata,
  type DiarySection,
} from '@allerguide/core';
import {
  addDiaryEntries,
  deleteDiaryEntry,
  getDiaryEntries,
  mergePhotosIntoAnswers,
  updateDiaryEntry,
} from '@/src/services/diary-service';
import { listDiaryAttachmentsForEntries } from '@/src/services/diary-attachment-service';
import { buildDiarySectionEditorState } from '@/src/services/diary-section-service';
import { AsitCourseCard } from '@/src/components/AsitCourseCard';
import { PrescribedTherapyCard } from '@/src/components/PrescribedTherapyCard';
import { DiaryInsightsCard } from '@/src/components/DiaryInsightsCard';
import { FoodDrugAllergyCard } from '@/src/components/FoodDrugAllergyCard';
import { InsectAllergyCard } from '@/src/components/InsectAllergyCard';
import { AsthmaCard } from '@/src/components/AsthmaCard';
import { getProfileCapabilities } from '@/src/services/profile-capabilities-service';
import { getAsthmaActionPlan } from '@/src/services/asthma-action-plan-service';
import { getAllergyPassport } from '@/src/services/sos-passport-service';
import { getAsitCourse } from '@/src/services/asit-course-service';
import { getPrescribedCourse } from '@/src/services/prescribed-therapy-service';
import { getFoodDrugRegistry } from '@/src/services/food-drug-registry-service';
import { getInsectActionPlan } from '@/src/services/insect-action-plan-service';
import { useAppStore } from '@/src/store/app-store';
import { Screen } from '@/src/components/Screen';
import { ScreenEyebrow } from '@/src/components/ScreenEyebrow';
import { GlassCard } from '@/src/components/GlassCard';
import { EmptyState } from '@/src/components/EmptyState';
import { Button } from '@/src/components/Button';
import { Disclaimer } from '@/src/components/Disclaimer';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { DiaryLegacyEditor, DiaryWizard } from '@/src/components/DiaryWizard';
import { DiaryEditorModal } from '@/src/components/DiaryEditorModal';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { localizeDiarySections, localizeDiaryType } from '@/src/i18n/content';
import type { DiaryEntry } from '@/src/types';
import { ProfileHeaderButton } from '@/src/components/ProfileHeaderButton';
import { ScreenBrandHeader } from '@/src/components/brand/ScreenBrandHeader';
import { collectDiaryAutoMetadata } from '@/src/services/diary-auto-metadata-service';
import { reconcileAllReminders } from '@/src/services/reminder-reconcile-service';
import { logCaughtError } from '@/src/services/error-reporting';
import { confirmDestructiveAction } from '@/src/utils/confirm-destructive-action';
import { getOrLoadActiveProfileId } from '@/src/services/profile-service';

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
  Терапия: 'medical',
};

const QUICK_ADD_EXCLUDED = new Set(['Шкала', 'Пикфлоуметрия', 'АСИТ', 'Визит к врачу', 'Терапия']);

type EditorState =
  | { mode: 'full' }
  | { mode: 'section'; sectionType: string; prefill?: Record<string, Record<string, string>>; simplifiedSection?: DiarySection }
  | { mode: 'edit'; entry: DiaryEntry; legacy?: boolean };

function hideAutoSteps(section: DiarySection): DiarySection {
  return {
    ...section,
    steps: section.steps.filter((step) => !DIARY_AUTO_STEP_IDS.has(step.id)),
  };
}

export default function DiaryScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, locale, content } = useTranslation();
  const localeContent = content();
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const activeProfile = useAppStore((s) => s.activeProfile);
  const [list, setList] = useState<DiaryEntry[]>([]);
  const [photoUrisByEntry, setPhotoUrisByEntry] = useState<Record<number, string[]>>({});
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [autoMetadata, setAutoMetadata] = useState<DiaryAutoMetadata>({});
  const [refreshing, setRefreshing] = useState(false);
  const loadRequestId = useRef(0);
  const localizedSections = useMemo(
    () => localizeDiarySections(locale, localeContent),
    [locale, localeContent],
  );
  /** Bump on focus so condition gating re-reads app_settings after profile edit. */
  const [capabilitiesTick, setCapabilitiesTick] = useState(0);
  const profileCapabilities = useMemo(
    () => (activeProfile ? getProfileCapabilities(activeProfile) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick forces re-read of profileConditions settings
    [activeProfile, capabilitiesTick],
  );
  const profileConditions = useMemo(
    () => profileCapabilities?.gatingConditions ?? [],
    [profileCapabilities],
  );
  const visibleSections = useMemo(
    () => filterDiarySections(localizedSections, profileConditions),
    [localizedSections, profileConditions],
  );
  const asitEnabled = profileCapabilities?.modules.asit ?? false;
  const foodFocusEnabled = profileCapabilities?.modules.foodFocus ?? false;
  const drugFocusEnabled = profileCapabilities?.modules.drugFocus ?? false;
  const insectFocusEnabled = profileCapabilities?.modules.insectSting ?? false;
  const peakFlowEnabled = profileCapabilities?.modules.peakFlow ?? false;
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
  const prescribedCourse = useMemo(
    () => (activeProfileId ? getPrescribedCourse(activeProfileId) : null),
    [activeProfileId],
  );
  const insectActionPlan = useMemo(
    () => (activeProfileId ? getInsectActionPlan(activeProfileId) : null),
    [activeProfileId],
  );
  const asthmaActionPlan = useMemo(
    () => (activeProfileId ? getAsthmaActionPlan(activeProfileId) : null),
    [activeProfileId],
  );
  const planPersonalBestPef = useMemo(
    () => getAsthmaPlanPersonalBest(asthmaActionPlan),
    [asthmaActionPlan],
  );

  const loadAutoMetadata = async () => {
    const metadata = await collectDiaryAutoMetadata({
      profileId: activeProfileId,
      profileAllergiesJson: activeProfile?.allergies ?? '[]',
      locale,
    });
    setAutoMetadata(metadata);
  };

  const openSection = async (sectionType: string) => {
    const editorState = await buildDiarySectionEditorState({
      sectionType,
      profileId: activeProfileId,
      profileAllergiesJson: activeProfile?.allergies ?? '[]',
      locale,
    });
    await loadAutoMetadata();
    setEditor({
      mode: 'section',
      sectionType: editorState.sectionType,
      prefill: editorState.prefill,
      simplifiedSection: editorState.section,
    });
  };

  const openFullWizard = async () => {
    await loadAutoMetadata();
    setEditor({ mode: 'full' });
  };

  const load = useCallback(async (profileId = activeProfileId) => {
    const requestId = loadRequestId.current + 1;
    loadRequestId.current = requestId;
    if (!profileId) {
      setList([]);
      setPhotoUrisByEntry({});
      return;
    }

    const entries = await getDiaryEntries(profileId);
    if (requestId !== loadRequestId.current) return;

    setList(entries);
    const attachments = listDiaryAttachmentsForEntries(entries.map((e) => e.id));
    const map: Record<number, string[]> = {};
    for (const item of attachments) {
      if (!map[item.entryId]) map[item.entryId] = [];
      map[item.entryId].push(item.localPath);
    }
    setPhotoUrisByEntry(map);
  }, [activeProfileId]);

  const refresh = useCallback(async () => {
    if (!activeProfileId) return;
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [activeProfileId, load]);

  useFocusEffect(
    useCallback(() => {
      setCapabilitiesTick((tick) => tick + 1);
      const profileId = getOrLoadActiveProfileId();
      void load(profileId);
      return () => {
        loadRequestId.current += 1;
      };
    }, [load]),
  );

  const closeEditor = () => setEditor(null);

  const handleCreate = async (entries: { type: string; details: string; photoUris?: string[] }[]) => {
    const profileId = activeProfileId ?? getOrLoadActiveProfileId();
    if (!profileId) return;
    const results = await addDiaryEntries(profileId, entries);
    const failed = results.find((result) => !result.ok);
    if (failed && !failed.ok) {
      logCaughtError('DiaryScreen.handleCreate', new Error(failed.code));
      return;
    }
    closeEditor();
    await load(profileId);
    void reconcileAllReminders();
  };

  const handleUpdate = async (
    entry: DiaryEntry,
    type: string,
    details: string,
    photoUris?: string[],
  ) => {
    const result = await updateDiaryEntry(entry.id, { type, details, photoUris });
    if (!result.ok) {
      logCaughtError('DiaryScreen.handleUpdate', new Error(result.code));
      return;
    }
    closeEditor();
    await load();
    void reconcileAllReminders();
  };

  const confirmDelete = (entry: DiaryEntry) => {
    confirmDestructiveAction({
      title: t('diary.deleteTitle'),
      message: t('diary.deleteMessage', {
        type: localizeDiaryType(entry.type, localeContent),
      }),
      cancelLabel: t('common.cancel'),
      confirmLabel: t('common.delete'),
      onConfirm: async () => {
        const result = await deleteDiaryEntry(entry.id);
        if (!result.ok) throw new Error(result.code);
        closeEditor();
        await load();
        void reconcileAllReminders();
      },
      onError: (error) => {
        logCaughtError('DiaryScreen.confirmDelete', error);
      },
    });
  };

  const openEdit = (entry: DiaryEntry) => {
    const answers = getDiaryEntryAnswers(entry.type, entry.details);
    if (answers) {
      setEditor({ mode: 'edit', entry });
      return;
    }
    setEditor({ mode: 'edit', entry, legacy: true });
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
          sections={buildAdaptiveDiaryWizardSections(visibleSections)}
          autoMetadata={autoMetadata}
          drugIntolerances={drugIntolerances}
          planPersonalBestPef={planPersonalBestPef}
          profileAllergiesJson={activeProfile?.allergies ?? '[]'}
          onCancel={closeEditor}
          onComplete={(entries) => void handleCreate(entries)}
        />
      );
    }

    const sectionType = editor.mode === 'section' ? editor.sectionType : editor.entry.type;
    const baseSection = localizedSections.find((s) => s.type === sectionType) ?? getDiarySection(sectionType);
    if (!baseSection) return null;
    const rawSection =
      editor.mode === 'section' && editor.simplifiedSection ? editor.simplifiedSection : baseSection;
    const section = hideAutoSteps(rawSection);

    const initialAnswers =
      editor.mode === 'edit'
        ? mergePhotosIntoAnswers(
            getDiaryEntryAnswers(editor.entry.type, editor.entry.details) ?? {},
            editor.entry.id,
          )
        : editor.mode === 'section'
          ? editor.prefill?.[baseSection.type]
          : null;

    return (
      <DiaryWizard
          sections={[section]}
          initialAnswersBySection={initialAnswers ? { [section.type]: initialAnswers } : undefined}
          allowSkipSection={false}
          drugIntolerances={drugIntolerances}
          planPersonalBestPef={planPersonalBestPef}
          profileAllergiesJson={activeProfile?.allergies ?? '[]'}
          autoMetadata={autoMetadata}
          submitLabel={editor.mode === 'edit' ? t('diary.saveChanges') : t('common.save')}
          onCancel={closeEditor}
          onComplete={(entries) => {
            const [entry] = entries;
            if (!entry) return;
            if (editor.mode === 'edit') {
              void handleUpdate(editor.entry, entry.type, entry.details, entry.photoUris);
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
      <ScreenBrandHeader right={<ProfileHeaderButton />} />
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ScreenEyebrow section={t('diary.eyebrow')} />
          <Text style={ui.docTitle}>{t('diary.title')}</Text>
          <Text style={ui.docMeta}>{t('diary.subtitle')}</Text>
        </View>
      </View>

      <Button label={t('diary.newEntry')} variant="primary" block onPress={() => void openFullWizard()} />
      <Button
        testID="diary-quick-entry"
        label={t('diary.quickEntry')}
        variant="secondary"
        block
        onPress={() => {
          const section = visibleSections.find((s) => s.type === 'Симптомы') ?? visibleSections[0];
          if (section) void openSection(section.type);
        }}
      />

      <GlassCard>
        <Text style={ui.cardTitle}>{t('diary.quickAdd')}</Text>
        <View style={styles.chipRow}>
          {visibleSections
            .filter((section) => !QUICK_ADD_EXCLUDED.has(section.type))
            .map((section) => (
              <Pressable
                key={section.type}
                testID={`diary-chip-${
                  (
                    {
                      Симптомы: 'symptoms',
                      Лекарство: 'medicine',
                      Питание: 'food',
                      Триггер: 'trigger',
                      Кожа: 'skin',
                      Пикфлоуметрия: 'pef',
                      АСИТ: 'asit',
                      'Визит к врачу': 'visit',
                      Заметка: 'note',
                      'Укус насекомого': 'insect',
                      Шкала: 'scale',
                    } as Record<string, string>
                  )[section.type] ?? 'other'
                }`}
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
        </View>
      </GlassCard>

      <Button
        label={t('diary.doctorVisit')}
        variant="secondary"
        block
        onPress={() => void openSection('Визит к врачу')}
      />
      <Button
        label={t('diary.clinicalScalesOpen')}
        variant="secondary"
        block
        onPress={() => router.push('/clinical-scales' as any)}
      />

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

      {list.filter((item) => isDiaryHistoryVisible(item.type)).length === 0 ? (
        <EmptyState icon="document-text-outline" title={t('diary.history')} description={t('diary.empty')} />
      ) : (
        <GlassCard padded={false}>
          <View style={styles.listHead}>
            <Text style={[ui.cardTitle, styles.listHeadPad]}>{t('diary.history')}</Text>
          </View>

          {list.filter((item) => isDiaryHistoryVisible(item.type)).map((item, index, visible) => {
            const icon = TYPE_ICONS[item.type] ?? 'create';
            const summary = formatDiaryEntrySummary(item.type, item.details);
            const photos = photoUrisByEntry[item.id] ?? [];
            return (
              <Pressable
                key={item.id}
                style={[styles.row, index < visible.length - 1 && styles.rowBorder]}
                onPress={() => openEdit(item)}>
                <View style={ui.feedIcon}>
                  <Ionicons name={icon as any} size={16} color={theme.colors.textSecondary} />
                </View>
                <View style={ui.feedBody}>
                  <Text style={ui.feedTitle}>{localizeDiaryType(item.type, localeContent)}</Text>
                  <Text style={ui.feedSub}>{summary}</Text>
                  {photos.length ? (
                    <View style={styles.photoRow}>
                      {photos.slice(0, 3).map((uri) => (
                        <Image key={uri} source={{ uri }} style={styles.photoThumb} />
                      ))}
                      {photos.length > 3 ? (
                        <Text style={styles.photoMore}>+{photos.length - 3}</Text>
                      ) : null}
                    </View>
                  ) : null}
                  <Text style={styles.cardMeta}>{formatDiaryDate(item.createdAt)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
              </Pressable>
            );
          })}
        </GlassCard>
      )}

      <Text style={ui.sectionLabel}>{t('diary.modulesTitle')}</Text>
      {asitEnabled ? (
        <AsitCourseCard
          course={asitCourse}
          entries={list}
          onLogDose={() => void openSection('АСИТ')}
        />
      ) : null}

      <PrescribedTherapyCard
        course={prescribedCourse}
        entries={list}
        onLogDose={() => void openSection('Терапия')}
      />

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

      {peakFlowEnabled ? (
        <AsthmaCard
          plan={asthmaActionPlan}
          entries={list}
          onLogPef={() => void openSection('Пикфлоуметрия')}
        />
      ) : null}

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
    photoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
    photoThumb: { width: 40, height: 40, borderRadius: 6, backgroundColor: colors.surfaceMuted },
    photoMore: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    hintsCard: { gap: 8 },
    hintText: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
  });
}
