import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  ASIT_PHASE_LABELS,
  ASIT_ROUTE_LABELS,
  DEFAULT_ASIT_REMINDER_HOUR,
  DEFAULT_ASIT_REMINDER_MINUTE,
  findAllergenById,
  formatAsitReminderTime,
  isAsitReminderConfigured,
  type AsitCourse,
  type AsitPhase,
  type AsitRoute,
  type AsitScheduleStage,
} from '@allerguide/core';
import { getDemoPrescriptionParse, parsePrescriptionText } from '@allerguide/ai';
import { Screen } from '@/src/components/Screen';
import { ScreenEyebrow } from '@/src/components/ScreenEyebrow';
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { Disclaimer } from '@/src/components/Disclaimer';
import { DateTimeField } from '@/src/components/DateTimeField';
import { AllergenCatalogModal } from '@/src/components/AllergenCatalogModal';
import { useAppStore } from '@/src/store/app-store';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { Ionicons } from '@expo/vector-icons';
import {
  createEmptyAsitCourse,
  getAsitCourse,
  saveAsitCourse,
} from '@/src/services/asit-course-service';
import { ensureNotificationPermission, syncAsitReminder } from '@/src/services/asit-reminder-service';
import { getAsitReminderNotificationContent } from '@/src/services/notification-content-service';
import { getProfileCapabilities } from '@/src/services/profile-capabilities-service';

const ROUTES: AsitRoute[] = ['slit', 'scit'];
const PHASES: AsitPhase[] = ['buildup', 'maintenance'];

type Step = 'form' | 'verify' | 'review';

export default function AsitCourseScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const profile = useAppStore((s) => s.activeProfile);
  const profileId = profile?.id;
  const [course, setCourse] = useState<AsitCourse>(() => createEmptyAsitCourse());
  const [step, setStep] = useState<Step>('form');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseText, setParseText] = useState('');
  const [parseTextOpen, setParseTextOpen] = useState(false);

  const asitEnabled = useMemo(() => {
    if (!profile) return false;
    return getProfileCapabilities(profile).modules.asit;
  }, [profile]);

  useEffect(() => {
    if (!profileId || asitEnabled) return;
    void syncAsitReminder(profileId, null, getAsitReminderNotificationContent(createEmptyAsitCourse()));
  }, [profileId, asitEnabled]);

  useEffect(() => {
    if (!profileId) return;
    const existing = getAsitCourse(profileId);
    if (existing) {
      setCourse(existing);
      void syncAsitReminder(profileId, existing, getAsitReminderNotificationContent(existing));
    }
  }, [profileId]);

  const pickAllergen = useCallback(
    (ids: string[]) => {
      const id = ids[0];
      if (!id) return;
      const name = findAllergenById(id)?.name ?? id;
      setCourse((prev) => ({ ...prev, allergen: name, allergenId: id }));
    },
    [],
  );

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setCourse((prev) => ({ ...prev, prescriptionPhotoUri: result.assets[0]!.uri }));
    }
  };

  const pickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!result.canceled && result.assets[0]) {
      setCourse((prev) => ({ ...prev, prescriptionDocUri: result.assets[0]!.uri }));
    }
  };

  const parseOcr = async () => {
    setParsing(true);
    try {
      const parsed = parseText.trim()
        ? parsePrescriptionText(parseText)
        : getDemoPrescriptionParse();
      const update: Partial<AsitCourse> = {};
      if (parsed.drug && !course.drug.trim()) update.drug = parsed.drug;
      if (parsed.startDate && !course.startDate.trim()) update.startDate = parsed.startDate;
      if (parsed.scheduleStages.length > 0) update.scheduleStages = parsed.scheduleStages;
      if (parsed.notes && !course.scheduleNotes.trim()) update.scheduleNotes = parsed.notes;
      setCourse((prev) => ({ ...prev, ...update }));
      setParseTextOpen(false);
      if (parsed.scheduleStages.length > 0) {
        setStep('verify');
      }
    } finally {
      setParsing(false);
    }
  };

  const confirmVerify = () => {
    setCourse((prev) => ({ ...prev, verified: true }));
    setStep('review');
  };

  const save = async () => {
    if (!profileId) return;
    const toSave: AsitCourse = { ...course, activated: true };
    saveAsitCourse(profileId, toSave);
    if (isAsitReminderConfigured(toSave)) {
      await ensureNotificationPermission();
    }
    router.back();
  };

  const reminderEnabled = isAsitReminderConfigured(course);

  const toggleReminder = (enabled: boolean) => {
    setCourse((prev) => {
      if (!enabled) {
        const next = { ...prev };
        delete next.reminderHour;
        delete next.reminderMinute;
        return next;
      }
      return {
        ...prev,
        reminderHour: prev.reminderHour ?? DEFAULT_ASIT_REMINDER_HOUR,
        reminderMinute: prev.reminderMinute ?? DEFAULT_ASIT_REMINDER_MINUTE,
      };
    });
  };

  if (!profile) {
    return (
      <Screen>
        <Text style={styles.empty}>{t('asit.noProfile')}</Text>
      </Screen>
    );
  }

  if (!asitEnabled) {
    return (
      <Screen>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
          </Pressable>
          <View style={styles.headerText}>
            <ScreenEyebrow section={t('asit.eyebrow')} />
            <Text style={ui.docTitle}>{t('asit.courseTitle')}</Text>
          </View>
        </View>
        <GlassCard>
          <Text style={styles.hint}>{t('asit.notEligible')}</Text>
        </GlassCard>
      </Screen>
    );
  }

  if (step === 'verify') {
    return <VerifyStep
      theme={theme}
      ui={ui}
      styles={styles}
      course={course}
      setCourse={setCourse}
      onBack={() => setStep('form')}
      onConfirm={confirmVerify}
      t={t}
    />;
  }

  if (step === 'review') {
    return <ReviewStep
      theme={theme}
      ui={ui}
      styles={styles}
      course={course}
      onBack={() => setStep('verify')}
      onSave={save}
      reminderEnabled={reminderEnabled}
      toggleReminder={toggleReminder}
      setCourse={setCourse}
      t={t}
    />;
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <ScreenEyebrow section={t('asit.eyebrow')} />
          <Text style={ui.docTitle}>{t('asit.courseTitle')}</Text>
          <Text style={ui.docMeta}>{t('asit.courseSubtitle')}</Text>
        </View>
      </View>

      <GlassCard style={styles.section}>
        {/* Allergen picker */}
        <Text style={ui.sectionLabel}>{t('asit.allergenLabel')}</Text>
        {course.allergenId ? (
          <View style={styles.allergenRow}>
            <Text style={styles.allergenName}>{course.allergen}</Text>
            <Pressable onPress={() => setCatalogOpen(true)}>
              <Text style={styles.allergenChange}>{t('asit.allergenChange')}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.catalogPickerBtn} onPress={() => setCatalogOpen(true)}>
            <Ionicons name="search" size={18} color={theme.colors.accent} />
            <Text style={styles.catalogPickerText}>{t('asit.allergenFromCatalog')}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
          </Pressable>
        )}

        {/* Drug */}
        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asit.drugLabel')}</Text>
        <TextInput
          style={styles.input}
          value={course.drug}
          onChangeText={(drug) => setCourse((prev) => ({ ...prev, drug }))}
          placeholder={t('asit.drugPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
        />

        {/* Prescription upload */}
        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asit.uploadPrescription')}</Text>
        <View style={ui.toggleRow}>
          <Pressable style={[ui.toggle, course.prescriptionPhotoUri ? ui.toggleActive : null]} onPress={() => void pickPhoto()}>
            <Ionicons name="camera" size={15} color={course.prescriptionPhotoUri ? theme.colors.accent : theme.colors.textSecondary} />
            <Text style={[ui.toggleText, course.prescriptionPhotoUri ? ui.toggleTextActive : null]}>
              {course.prescriptionPhotoUri ? t('asit.uploadPhotoAttached') : t('asit.uploadPhoto')}
            </Text>
          </Pressable>
          <Pressable style={[ui.toggle, course.prescriptionDocUri ? ui.toggleActive : null]} onPress={() => void pickPdf()}>
            <Ionicons name="document" size={15} color={course.prescriptionDocUri ? theme.colors.accent : theme.colors.textSecondary} />
            <Text style={[ui.toggleText, course.prescriptionDocUri ? ui.toggleTextActive : null]}>
              {course.prescriptionDocUri ? t('asit.uploadPdfAttached') : t('asit.uploadPdf')}
            </Text>
          </Pressable>
        </View>

        {/* OCR parse */}
        <Pressable style={[styles.ocrBtn]} onPress={() => setParseTextOpen(true)}>
          <Ionicons name="scan-outline" size={18} color={theme.colors.accent} />
          <Text style={styles.ocrBtnText}>{t('asit.ocrParse')}</Text>
        </Pressable>

        {/* Route */}
        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asit.routeLabel')}</Text>
        <View style={ui.toggleRow}>
          {ROUTES.map((route) => (
            <Pressable
              key={route}
              style={[ui.toggle, course.route === route && ui.toggleActive]}
              onPress={() => setCourse((prev) => ({ ...prev, route }))}>
              <Text style={[ui.toggleText, course.route === route && ui.toggleTextActive]}>
                {ASIT_ROUTE_LABELS[route]}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Phase */}
        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asit.phaseLabel')}</Text>
        <View style={ui.toggleRow}>
          {PHASES.map((phase) => (
            <Pressable
              key={phase}
              style={[ui.toggle, course.phase === phase && ui.toggleActive]}
              onPress={() => setCourse((prev) => ({ ...prev, phase }))}>
              <Text style={[ui.toggleText, course.phase === phase && ui.toggleTextActive]}>
                {ASIT_PHASE_LABELS[phase]}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Start date */}
        <View style={styles.fieldGap}>
          <DateTimeField
            label={t('asit.startDateLabel')}
            value={course.startDate}
            onChange={(startDate) => setCourse((prev) => ({ ...prev, startDate }))}
            mode="date"
            minYear={2020}
          />
        </View>

        {/* Schedule notes */}
        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asit.scheduleLabel')}</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={course.scheduleNotes}
          onChangeText={(scheduleNotes) => setCourse((prev) => ({ ...prev, scheduleNotes }))}
          placeholder={t('asit.schedulePlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          multiline
          textAlignVertical="top"
        />
      </GlassCard>

      {/* If stages already parsed, show verify button */}
      {course.scheduleStages && course.scheduleStages.length > 0 && !course.verified ? (
        <Button
          label={t('asit.verifyTitle')}
          variant="secondary"
          block
          onPress={() => setStep('verify')}
        />
      ) : null}

      <Button
        label={isAsitReminderConfigured(course) ? t('asit.reviewTitle') : t('asit.saveCourse')}
        variant="primary"
        block
        onPress={() => {
          if (course.scheduleStages && course.scheduleStages.length > 0 && !course.verified) {
            setStep('verify');
          } else if (isAsitReminderConfigured(course)) {
            setStep('review');
          } else {
            void save();
          }
        }}
      />

      <Disclaimer>{t('asit.disclaimer')}</Disclaimer>

      {/* Allergen catalog modal */}
      <AllergenCatalogModal
        visible={catalogOpen}
        selected={course.allergenId ? [course.allergenId] : []}
        onClose={() => setCatalogOpen(false)}
        onApply={pickAllergen}
      />

      {/* OCR text input modal */}
      <Modal visible={parseTextOpen} transparent animationType="slide" onRequestClose={() => setParseTextOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setParseTextOpen(false)}>
                <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
              </Pressable>
              <Text style={styles.modalTitle}>{t('asit.ocrParse')}</Text>
              <Pressable onPress={() => void parseOcr()} disabled={parsing}>
                <Text style={[styles.modalDone, parsing && styles.modalDoneDisabled]}>
                  {parsing ? t('asit.ocrParsing') : t('common.done')}
                </Text>
              </Pressable>
            </View>
            <TextInput
              style={styles.parseInput}
              value={parseText}
              onChangeText={setParseText}
              placeholder="Вставьте текст назначения или оставьте пустым для демо…"
              placeholderTextColor={theme.colors.textMuted}
              multiline
              textAlignVertical="top"
              autoFocus
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

interface VerifyStepProps {
  theme: ReturnType<typeof useTheme>;
  ui: ReturnType<typeof useUiStyles>;
  styles: ReturnType<typeof createStyles>;
  course: AsitCourse;
  setCourse: React.Dispatch<React.SetStateAction<AsitCourse>>;
  onBack: () => void;
  onConfirm: () => void;
  t: (key: string, params?: Record<string, string>) => string;
}

function VerifyStep({ theme, ui, styles, course, setCourse, onBack, onConfirm, t }: VerifyStepProps) {
  const stages = course.scheduleStages ?? [];

  const updateStage = (index: number, field: keyof AsitScheduleStage, value: string) => {
    setCourse((prev) => {
      const next = [...(prev.scheduleStages ?? [])];
      next[index] = { ...next[index]!, [field]: value };
      return { ...prev, scheduleStages: next };
    });
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <ScreenEyebrow section={t('asit.eyebrow')} />
          <Text style={ui.docTitle}>{t('asit.verifyTitle')}</Text>
          <Text style={ui.docMeta}>{t('asit.verifySubtitle')}</Text>
        </View>
      </View>

      {stages.length === 0 ? (
        <GlassCard>
          <Text style={styles.hint}>{t('asit.verifyStagesEmpty')}</Text>
        </GlassCard>
      ) : (
        stages.map((stage, i) => (
          <GlassCard key={i} style={styles.stageCard}>
            <Text style={styles.stageLabel}>Этап {i + 1}</Text>
            <View style={styles.stageDateRow}>
              <DateTimeField
                label="С"
                value={stage.from}
                onChange={(v) => updateStage(i, 'from', v)}
                mode="date"
                minYear={2020}
              />
              <DateTimeField
                label="По"
                value={stage.to}
                onChange={(v) => updateStage(i, 'to', v)}
                mode="date"
                minYear={2020}
              />
            </View>
            <TextInput
              style={styles.input}
              value={stage.dose}
              onChangeText={(v) => updateStage(i, 'dose', v)}
              placeholder="Доза / описание"
              placeholderTextColor={theme.colors.textMuted}
            />
          </GlassCard>
        ))
      )}

      <Button label={t('asit.verifyConfirm')} variant="primary" block onPress={onConfirm} />
    </Screen>
  );
}

interface ReviewStepProps {
  theme: ReturnType<typeof useTheme>;
  ui: ReturnType<typeof useUiStyles>;
  styles: ReturnType<typeof createStyles>;
  course: AsitCourse;
  setCourse: React.Dispatch<React.SetStateAction<AsitCourse>>;
  onBack: () => void;
  onSave: () => Promise<void>;
  reminderEnabled: boolean;
  toggleReminder: (enabled: boolean) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

function ReviewStep({ theme, ui, styles, course, setCourse, onBack, onSave, reminderEnabled, toggleReminder, t }: ReviewStepProps) {
  return (
    <Screen>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <ScreenEyebrow section={t('asit.eyebrow')} />
          <Text style={ui.docTitle}>{t('asit.reviewTitle')}</Text>
        </View>
      </View>

      <GlassCard style={styles.section}>
        <Text style={ui.sectionLabel}>{t('asit.allergenLabel')}</Text>
        <Text style={styles.reviewValue}>{course.allergen || '—'}</Text>

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asit.drugLabel')}</Text>
        <Text style={styles.reviewValue}>{course.drug || '—'}</Text>

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asit.startDateLabel')}</Text>
        <Text style={styles.reviewValue}>{course.startDate || '—'}</Text>

        {course.scheduleStages && course.scheduleStages.length > 0 ? (
          <>
            <Text style={[ui.sectionLabel, styles.fieldGap]}>Этапы схемы</Text>
            {course.scheduleStages.map((s, i) => (
              <Text key={i} style={styles.stageRow}>
                {i + 1}. {s.from} – {s.to}: {s.dose}
              </Text>
            ))}
          </>
        ) : null}

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asit.reminderLabel')}</Text>
        <View style={ui.toggleRow}>
          <Pressable
            style={[ui.toggle, reminderEnabled && ui.toggleActive]}
            onPress={() => toggleReminder(true)}>
            <Text style={[ui.toggleText, reminderEnabled && ui.toggleTextActive]}>
              {t('asit.reminderOn')}
            </Text>
          </Pressable>
          <Pressable
            style={[ui.toggle, !reminderEnabled && ui.toggleActive]}
            onPress={() => toggleReminder(false)}>
            <Text style={[ui.toggleText, !reminderEnabled && ui.toggleTextActive]}>
              {t('asit.reminderOff')}
            </Text>
          </Pressable>
        </View>

        {reminderEnabled ? (
          <View style={styles.reminderRow}>
            <View style={styles.reminderField}>
              <Text style={styles.reminderFieldLabel}>{t('asit.reminderHour')}</Text>
              <TextInput
                style={styles.input}
                value={String(course.reminderHour ?? DEFAULT_ASIT_REMINDER_HOUR)}
                onChangeText={(value) => {
                  const hour = Number(value.replace(/\D/g, ''));
                  if (!Number.isFinite(hour)) return;
                  setCourse((prev) => ({ ...prev, reminderHour: Math.min(23, Math.max(0, hour)) }));
                }}
                keyboardType="number-pad"
                maxLength={2}
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
            <View style={styles.reminderField}>
              <Text style={styles.reminderFieldLabel}>{t('asit.reminderMinute')}</Text>
              <TextInput
                style={styles.input}
                value={String(course.reminderMinute ?? DEFAULT_ASIT_REMINDER_MINUTE)}
                onChangeText={(value) => {
                  const minute = Number(value.replace(/\D/g, ''));
                  if (!Number.isFinite(minute)) return;
                  setCourse((prev) => ({
                    ...prev,
                    reminderMinute: Math.min(59, Math.max(0, minute)),
                  }));
                }}
                keyboardType="number-pad"
                maxLength={2}
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
            <Text style={styles.reminderPreview}>
              {formatAsitReminderTime(
                course.reminderHour ?? DEFAULT_ASIT_REMINDER_HOUR,
                course.reminderMinute ?? DEFAULT_ASIT_REMINDER_MINUTE,
              )}
            </Text>
          </View>
        ) : (
          <Text style={styles.hint}>{t('asit.reminderHint')}</Text>
        )}
      </GlassCard>

      <Button label={t('asit.reviewConfirm')} variant="primary" block onPress={() => void onSave()} />
      <Disclaimer>{t('asit.disclaimer')}</Disclaimer>
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
    allergenRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
    allergenName: { flex: 1, fontFamily: fonts.sansSemiBold, fontSize: 15, fontWeight: '600', color: colors.text },
    allergenChange: { fontFamily: fonts.sansSemiBold, fontSize: 13, fontWeight: '600', color: colors.accent },
    catalogPickerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    catalogPickerText: { flex: 1, fontFamily: fonts.sans, fontSize: 14, color: colors.textSecondary },
    ocrBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 6,
      backgroundColor: colors.accentLight,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    ocrBtnText: { fontFamily: fonts.sansSemiBold, fontSize: 14, fontWeight: '600', color: colors.accent },
    reminderRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 },
    reminderField: { flex: 1, gap: 4 },
    reminderFieldLabel: { fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted },
    reminderPreview: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 16,
      fontWeight: '600',
      color: colors.accent,
      paddingBottom: 12,
    },
    empty: {
      fontFamily: fonts.sans,
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingVertical: 24,
    },
    hint: { fontFamily: fonts.sans, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
    stageCard: { gap: 8, marginBottom: 8 },
    stageLabel: { fontFamily: fonts.sansSemiBold, fontSize: 13, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
    stageDateRow: { flexDirection: 'row', gap: 8 },
    stageRow: { fontFamily: fonts.sans, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
    reviewValue: { fontFamily: fonts.sansSemiBold, fontSize: 15, fontWeight: '600', color: colors.text },
    modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
    modalSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingBottom: 24,
      maxHeight: '70%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    modalTitle: { fontFamily: fonts.sans, fontSize: 15, fontWeight: '700', color: colors.text },
    modalCancel: { fontFamily: fonts.sans, fontSize: 15, color: colors.textSecondary },
    modalDone: { fontFamily: fonts.sans, fontSize: 15, fontWeight: '700', color: colors.accent },
    modalDoneDisabled: { opacity: 0.4 },
    parseInput: {
      flex: 1,
      margin: 16,
      backgroundColor: colors.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.borderInput,
      padding: 12,
      fontSize: 14,
      fontFamily: fonts.sans,
      color: colors.text,
      minHeight: 120,
    },
  });
}
