import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useCallback, useMemo, useState, useEffect } from 'react';
import {
  MAX_PRESCRIBED_REMINDER_TIMES,
  addPrescribedReminderTime,
  filterFilledScheduleStages,
  getPrescribedReminderTimes,
  isPrescribedReminderConfigured,
  normalizeScheduleLines,
  PRESCRIBED_THERAPY_ROUTE_LABELS,
  removePrescribedReminderTimeAt,
  scheduleLinesToNotes,
  setPrescribedReminderEnabled,
  updatePrescribedReminderTimeAt,
  type PrescribedCourse,
  type PrescribedTherapyRoute,
} from '@allerguide/core';
import { applyPrescriptionParseToCourse } from '@allerguide/ai';
import { Screen } from '@/src/components/Screen';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { Disclaimer } from '@/src/components/Disclaimer';
import { DateTimeField } from '@/src/components/DateTimeField';
import { ModalKeyboardAvoid } from '@/src/components/ModalKeyboardAvoid';
import { PrescriptionCameraCapture } from '@/src/components/PrescriptionCameraCapture';
import { ScheduleLinesEditor } from '@/src/components/ScheduleLinesEditor';
import { ScheduleStagesEditor } from '@/src/components/ScheduleStagesEditor';
import { useAppStore } from '@/src/store/app-store';
import { radii } from '@/src/constants/layout';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { Ionicons } from '@expo/vector-icons';
import {
  createEmptyPrescribedCourse,
  getPrescribedCourse,
  savePrescribedCourse,
} from '@/src/services/prescribed-therapy-service';
import { pickPrescriptionPdf } from '@/src/services/prescription-photo-service';
import {
  recognizePrescription,
  type PrescriptionOcrHintCode,
} from '@/src/services/prescription-ocr-service';

const ROUTES = Object.keys(PRESCRIBED_THERAPY_ROUTE_LABELS) as PrescribedTherapyRoute[];

type Step = 'form' | 'verify' | 'review';

export default function PrescribedTherapyScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const profile = useAppStore((s) => s.activeProfile);
  const profileId = profile?.id;
  const [course, setCourse] = useState<PrescribedCourse>(() => createEmptyPrescribedCourse());
  const [step, setStep] = useState<Step>('form');
  const [parsing, setParsing] = useState(false);
  const [parseText, setParseText] = useState('');
  const [parseTextOpen, setParseTextOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [ocrHint, setOcrHint] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) return;
    const existing = getPrescribedCourse(profileId);
    if (existing) setCourse(existing);
  }, [profileId]);

  const hintFromCode = useCallback(
    (code: PrescriptionOcrHintCode | undefined, cloudError?: string) => {
      if (!code) return null;
      if (code === 'cloud_failed') {
        return t('prescribedTherapy.ocrCloudFailed', { error: cloudError || 'error' });
      }
      if (code === 'cloud_disabled') return t('prescribedTherapy.ocrCloudDisabled');
      if (code === 'empty_media') return t('prescribedTherapy.ocrEmptyMedia');
      if (code === 'fields_incomplete') return t('prescribedTherapy.ocrFieldsIncomplete');
      if (code === 'parse_error') return t('prescribedTherapy.ocrParseError');
      return t('prescribedTherapy.ocrDemoHint');
    },
    [t],
  );

  const onPhotoCaptured = useCallback((uri: string) => {
    setCameraOpen(false);
    setCourse((prev) => ({ ...prev, prescriptionPhotoUri: uri }));
    setOcrHint(null);
  }, []);

  const pickPdf = async () => {
    const uri = await pickPrescriptionPdf();
    if (!uri) return;
    setCourse((prev) => ({ ...prev, prescriptionDocUri: uri }));
    setOcrHint(null);
  };

  const applyOcrOutcome = async (manualText?: string) => {
    setParsing(true);
    setOcrHint(null);
    try {
      const outcome = await recognizePrescription({
        photoUri: course.prescriptionPhotoUri,
        pdfUri: course.prescriptionDocUri,
        manualText,
      });
      setCourse((prev) => applyPrescriptionParseToCourse(prev, outcome.parsed));
      if (outcome.text) setParseText(outcome.text);
      setOcrHint(hintFromCode(outcome.hintCode, outcome.cloudError));
      if (outcome.hintCode === 'fields_incomplete' && outcome.text.trim()) {
        setParseTextOpen(true);
      } else {
        setParseTextOpen(false);
      }
    } catch {
      setOcrHint(t('prescribedTherapy.ocrParseError'));
      setParseTextOpen(true);
    } finally {
      setParsing(false);
    }
  };

  const setScheduleLines = (scheduleLines: string[]) => {
    const lines = normalizeScheduleLines(scheduleLines);
    setCourse((prev) => ({
      ...prev,
      scheduleLines: lines,
      scheduleNotes: scheduleLinesToNotes(lines),
    }));
  };

  const startRecognize = () => {
    const hasMedia = Boolean(course.prescriptionPhotoUri || course.prescriptionDocUri);
    if (hasMedia) {
      void applyOcrOutcome();
      return;
    }
    setParseTextOpen(true);
  };

  const confirmVerify = () => {
    setCourse((prev) => ({ ...prev, verified: true }));
    setStep('review');
  };

  const save = async () => {
    if (!profileId) return;
    const lines = normalizeScheduleLines(course.scheduleLines, course.scheduleNotes);
    const stages = filterFilledScheduleStages(course.stages);
    const toSave: PrescribedCourse = {
      ...course,
      scheduleLines: lines,
      scheduleNotes: scheduleLinesToNotes(lines),
      stages,
      verified: stages.length ? Boolean(course.verified) : true,
      activated: true,
      active: true,
    };
    savePrescribedCourse(profileId, toSave);
    router.back();
  };

  const goToNextFromForm = () => {
    if (!course.drug.trim()) return;
    const filledStages = filterFilledScheduleStages(course.stages);
    if (filledStages.length > 0 && !course.verified) {
      setStep('verify');
      return;
    }
    setStep('review');
  };

  const reminderEnabled = isPrescribedReminderConfigured(course);

  const toggleReminder = (enabled: boolean) => {
    setCourse((prev) => setPrescribedReminderEnabled(prev, enabled));
  };

  if (!profile) {
    return (
      <Screen>
        <ScreenHeader onBack={() => router.back()} title={t('prescribedTherapy.noProfile')} />
        <Text style={styles.empty}>{t('prescribedTherapy.noProfile')}</Text>
      </Screen>
    );
  }

  if (cameraOpen) {
    return (
      <PrescriptionCameraCapture
        visible
        title={t('prescribedTherapy.cameraTitle')}
        hint={t('prescribedTherapy.cameraHint')}
        galleryLabel={t('scanner.pickFromGallery')}
        shutterLabel={t('scanner.takePhoto')}
        cancelLabel={t('common.cancel')}
        onCancel={() => setCameraOpen(false)}
        onCaptured={onPhotoCaptured}
      />
    );
  }

  if (step === 'verify') {
    return <VerifyStepPT
      styles={styles}
      course={course}
      setCourse={setCourse}
      onBack={() => setStep('form')}
      onConfirm={confirmVerify}
      t={t}
    />;
  }

  if (step === 'review') {
    return <ReviewStepPT
      theme={theme}
      ui={ui}
      styles={styles}
      course={course}
      setCourse={setCourse}
      onBack={() => setStep(filterFilledScheduleStages(course.stages).length > 0 ? 'verify' : 'form')}
      onSave={save}
      reminderEnabled={reminderEnabled}
      toggleReminder={toggleReminder}
      t={t}
    />;
  }

  return (
    <Screen>
      <ScreenHeader
        onBack={() => router.back()}
        title={t('prescribedTherapy.courseTitle')}
        subtitle={t('prescribedTherapy.courseSubtitle')}
        style={{ marginBottom: 12 }}
      />

      <GlassCard style={styles.section}>
        {/* Prescription upload + OCR — top of form so recognition can prefill fields below */}
        <Text style={ui.sectionLabel}>{t('prescribedTherapy.uploadPrescription')}</Text>
        <View style={styles.uploadRow}>
          <Pressable
            style={[styles.uploadChip, course.prescriptionPhotoUri ? styles.uploadChipActive : null]}
            onPress={() => setCameraOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('prescribedTherapy.uploadPhoto')}
            testID="prescribed-therapy-photo">
            <Ionicons
              name="camera"
              size={15}
              color={course.prescriptionPhotoUri ? theme.colors.accent : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.uploadChipText,
                course.prescriptionPhotoUri ? styles.uploadChipTextActive : null,
              ]}>
              {course.prescriptionPhotoUri
                ? t('prescribedTherapy.uploadPhotoAttached')
                : t('prescribedTherapy.uploadPhoto')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.uploadChip, course.prescriptionDocUri ? styles.uploadChipActive : null]}
            onPress={() => void pickPdf()}
            accessibilityRole="button"
            accessibilityLabel={t('prescribedTherapy.uploadPdf')}
            testID="prescribed-therapy-pdf">
            <Ionicons
              name="document"
              size={15}
              color={course.prescriptionDocUri ? theme.colors.accent : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.uploadChipText,
                course.prescriptionDocUri ? styles.uploadChipTextActive : null,
              ]}>
              {course.prescriptionDocUri
                ? t('prescribedTherapy.uploadPdfAttached')
                : t('prescribedTherapy.uploadPdf')}
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.ocrBtn}
          onPress={startRecognize}
          disabled={parsing}
          accessibilityRole="button"
          accessibilityLabel={t('prescribedTherapy.ocrParse')}
          testID="prescribed-therapy-ocr">
          <Ionicons name="scan-outline" size={18} color={theme.colors.accent} />
          <Text style={styles.ocrBtnText}>
            {parsing ? t('prescribedTherapy.ocrParsing') : t('prescribedTherapy.ocrParse')}
          </Text>
        </Pressable>
        {ocrHint ? <Text style={styles.ocrHint}>{ocrHint}</Text> : null}

        {/* Drug */}
        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('prescribedTherapy.drugLabel')}</Text>
        <TextInput
          style={styles.input}
          value={course.drug}
          onChangeText={(drug) => setCourse((prev) => ({ ...prev, drug }))}
          placeholder={t('prescribedTherapy.drugPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
        />

        {/* Dosage */}
        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('prescribedTherapy.dosageLabel')}</Text>
        <TextInput
          style={styles.input}
          value={course.dosage}
          onChangeText={(dosage) => setCourse((prev) => ({ ...prev, dosage }))}
          placeholder={t('prescribedTherapy.dosagePlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
        />

        {/* Route — bubble chips */}
        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('prescribedTherapy.routeLabel')}</Text>
        <View style={styles.routeBubbles}>
          {ROUTES.map((route) => {
            const active = course.route === route;
            return (
              <Pressable
                key={route}
                style={[styles.routeBubble, active && styles.routeBubbleActive]}
                onPress={() => setCourse((prev) => ({ ...prev, route }))}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={PRESCRIBED_THERAPY_ROUTE_LABELS[route]}>
                <Text style={[styles.routeBubbleText, active && styles.routeBubbleTextActive]}>
                  {PRESCRIBED_THERAPY_ROUTE_LABELS[route]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Start / End dates */}
        <View style={[styles.fieldGap, styles.dateRow]}>
          <View style={styles.dateField}>
            <DateTimeField
              label={t('prescribedTherapy.startDateLabel')}
              value={course.startDate}
              onChange={(startDate) => setCourse((prev) => ({ ...prev, startDate }))}
              mode="date"
              minYear={2020}
            />
          </View>
          <View style={styles.dateField}>
            <DateTimeField
              label={t('prescribedTherapy.endDateLabel')}
              value={course.endDate}
              onChange={(endDate) => setCourse((prev) => ({ ...prev, endDate }))}
              mode="date"
              minYear={2020}
            />
          </View>
        </View>

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('prescribedTherapy.scheduleLabel')}</Text>
        <ScheduleLinesEditor
          lines={course.scheduleLines}
          notesFallback={course.scheduleNotes}
          placeholder={t('prescribedTherapy.schedulePlaceholder')}
          addRowLabel={t('prescribedTherapy.addScheduleRow')}
          onChange={setScheduleLines}
          testID="prescribed-schedule-lines"
        />

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('prescribedTherapy.stagesLabel')}</Text>
        <ScheduleStagesEditor
          stages={course.stages ?? []}
          doseLabel={t('prescribedTherapy.stageDose')}
          dosePlaceholder={t('prescribedTherapy.dosagePlaceholder')}
          addRowLabel={t('prescribedTherapy.addScheduleRow')}
          stageLabel={(index) => t('prescribedTherapy.stageLabel', { n: String(index + 1) })}
          fromLabel={t('prescribedTherapy.stageFrom')}
          toLabel={t('prescribedTherapy.stageTo')}
          onChange={(stages) => setCourse((prev) => ({ ...prev, stages, verified: false }))}
          testID="prescribed-schedule-stages"
        />

        {/* Notes */}
        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('prescribedTherapy.notesLabel')}</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={course.notes}
          onChangeText={(notes) => setCourse((prev) => ({ ...prev, notes }))}
          placeholder={t('prescribedTherapy.notesPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          multiline
          textAlignVertical="top"
        />
      </GlassCard>

      {filterFilledScheduleStages(course.stages).length > 0 && !course.verified ? (
        <Button label={t('prescribedTherapy.verifyTitle')} variant="secondary" block onPress={() => setStep('verify')} />
      ) : null}

      <Button
        label={t('prescribedTherapy.reviewTitle')}
        variant="primary"
        block
        disabled={!course.drug.trim()}
        onPress={goToNextFromForm}
      />

      <Disclaimer compact>{t('prescribedTherapy.disclaimerShort')}</Disclaimer>

      <Modal visible={parseTextOpen} transparent animationType="slide" onRequestClose={() => setParseTextOpen(false)}>
        <ModalKeyboardAvoid style={styles.modalBackdrop}>
          {({ liftStyle, keyboardInset }) => (
            <View style={[styles.modalSheet, liftStyle]}>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setParseTextOpen(false)}>
                  <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
                </Pressable>
                <Text style={styles.modalTitle}>{t('prescribedTherapy.ocrParse')}</Text>
                <Pressable onPress={() => void applyOcrOutcome(parseText)} disabled={parsing}>
                  <Text style={[styles.modalDone, parsing && styles.modalDoneDisabled]}>
                    {parsing ? t('prescribedTherapy.ocrParsing') : t('common.done')}
                  </Text>
                </Pressable>
              </View>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: keyboardInset }}>
                <TextInput
                  style={styles.parseInput}
                  value={parseText}
                  onChangeText={setParseText}
                  placeholder={t('prescribedTherapy.ocrManualPlaceholder')}
                  placeholderTextColor={theme.colors.textMuted}
                  multiline
                  textAlignVertical="top"
                  autoFocus
                />
              </ScrollView>
            </View>
          )}
        </ModalKeyboardAvoid>
      </Modal>
    </Screen>
  );
}

interface VerifyStepPTProps {
  styles: ReturnType<typeof createStyles>;
  course: PrescribedCourse;
  setCourse: React.Dispatch<React.SetStateAction<PrescribedCourse>>;
  onBack: () => void;
  onConfirm: () => void;
  t: (key: string, params?: Record<string, string>) => string;
}

function VerifyStepPT({ styles, course, setCourse, onBack, onConfirm, t }: VerifyStepPTProps) {
  return (
    <Screen>
      <ScreenHeader
        onBack={onBack}
        eyebrow={t('prescribedTherapy.eyebrow')}
        title={t('prescribedTherapy.verifyTitle')}
        style={{ marginBottom: 12 }}
      />

      <GlassCard style={styles.section}>
        <ScheduleStagesEditor
          stages={course.stages ?? []}
          doseLabel={t('prescribedTherapy.stageDose')}
          dosePlaceholder={t('prescribedTherapy.dosagePlaceholder')}
          addRowLabel={t('prescribedTherapy.addScheduleRow')}
          stageLabel={(index) => t('prescribedTherapy.stageLabel', { n: String(index + 1) })}
          fromLabel={t('prescribedTherapy.stageFrom')}
          toLabel={t('prescribedTherapy.stageTo')}
          onChange={(stages) => setCourse((prev) => ({ ...prev, stages }))}
          testID="prescribed-verify-stages"
        />
      </GlassCard>

      <Button label={t('prescribedTherapy.verifyConfirm')} variant="primary" block onPress={onConfirm} />
    </Screen>
  );
}

interface ReviewStepPTProps {
  theme: ReturnType<typeof useTheme>;
  ui: ReturnType<typeof useUiStyles>;
  styles: ReturnType<typeof createStyles>;
  course: PrescribedCourse;
  setCourse: React.Dispatch<React.SetStateAction<PrescribedCourse>>;
  onBack: () => void;
  onSave: () => void | Promise<void>;
  reminderEnabled: boolean;
  toggleReminder: (enabled: boolean) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

function ReviewStepPT({ theme, ui, styles, course, setCourse, onBack, onSave, reminderEnabled, toggleReminder, t }: ReviewStepPTProps) {
  const reminderTimes = getPrescribedReminderTimes(course);

  return (
    <Screen>
      <ScreenHeader
        onBack={onBack}
        eyebrow={t('prescribedTherapy.eyebrow')}
        title={t('prescribedTherapy.reviewTitle')}
        style={{ marginBottom: 12 }}
      />

      <GlassCard style={styles.section}>
        <Text style={ui.sectionLabel}>{t('prescribedTherapy.drugLabel')}</Text>
        <Text style={styles.reviewValue}>{course.drug || '—'}</Text>

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('prescribedTherapy.dosageLabel')}</Text>
        <Text style={styles.reviewValue}>{course.dosage || '—'}</Text>

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('prescribedTherapy.startDateLabel')}</Text>
        <Text style={styles.reviewValue}>{course.startDate || '—'}</Text>

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('prescribedTherapy.endDateLabel')}</Text>
        <Text style={styles.reviewValue}>{course.endDate || '—'}</Text>

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('prescribedTherapy.scheduleLabel')}</Text>
        {normalizeScheduleLines(course.scheduleLines, course.scheduleNotes)
          .filter((line) => line.trim())
          .map((line, i) => (
            <Text key={`sched-${i}`} style={styles.stageRow}>
              {i + 1}. {line}
            </Text>
          ))}

        {filterFilledScheduleStages(course.stages).length > 0 ? (
          <>
            <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('prescribedTherapy.stagesLabel')}</Text>
            {filterFilledScheduleStages(course.stages).map((s, i) => (
              <Text key={i} style={styles.stageRow}>
                {i + 1}. {s.from} – {s.to}: {s.dose}
              </Text>
            ))}
          </>
        ) : null}

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('prescribedTherapy.reminderLabel')}</Text>
        <View style={ui.toggleRow}>
          <Pressable style={[ui.toggle, reminderEnabled && ui.toggleActive]} onPress={() => toggleReminder(true)}>
            <Text style={[ui.toggleText, reminderEnabled && ui.toggleTextActive]}>{t('prescribedTherapy.reminderOn')}</Text>
          </Pressable>
          <Pressable style={[ui.toggle, !reminderEnabled && ui.toggleActive]} onPress={() => toggleReminder(false)}>
            <Text style={[ui.toggleText, !reminderEnabled && ui.toggleTextActive]}>{t('prescribedTherapy.reminderOff')}</Text>
          </Pressable>
        </View>

        {reminderEnabled ? (
          <View style={styles.reminderList} testID="prescribed-reminder-times">
            {reminderTimes.map((time, index) => (
              <View key={`reminder-${index}`} style={styles.reminderRow} testID={`prescribed-reminder-row-${index}`}>
                <View style={styles.reminderField}>
                  <DateTimeField
                    label={t('prescribedTherapy.reminderTime')}
                    value={`${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`}
                    mode="time"
                    onChange={(value) => {
                      const match = value.match(/(\d{1,2}):(\d{2})/);
                      if (!match) return;
                      setCourse((prev) =>
                        updatePrescribedReminderTimeAt(prev, index, {
                          hour: Number(match[1]),
                          minute: Number(match[2]),
                        }),
                      );
                    }}
                  />
                </View>
                {reminderTimes.length > 1 ? (
                  <Pressable
                    style={styles.reminderIconBtn}
                    onPress={() => setCourse((prev) => removePrescribedReminderTimeAt(prev, index))}
                    accessibilityRole="button"
                    accessibilityLabel={t('prescribedTherapy.removeReminderTime')}
                    testID={`prescribed-reminder-remove-${index}`}>
                    <Ionicons name="close" size={20} color={theme.colors.textMuted} />
                  </Pressable>
                ) : (
                  <View style={styles.reminderIconBtnSpacer} />
                )}
              </View>
            ))}
            {reminderTimes.length < MAX_PRESCRIBED_REMINDER_TIMES ? (
              <Pressable
                style={styles.addReminderBtn}
                onPress={() => setCourse((prev) => addPrescribedReminderTime(prev))}
                accessibilityRole="button"
                accessibilityLabel={t('prescribedTherapy.addReminderTime')}
                testID="prescribed-reminder-add">
                <Ionicons name="add" size={18} color={theme.colors.accent} />
                <Text style={styles.addReminderText}>{t('prescribedTherapy.addReminderTime')}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <Text style={styles.hint}>{t('prescribedTherapy.reminderHint')}</Text>
        )}
      </GlassCard>

      <Button
        label={t('prescribedTherapy.reviewConfirm')}
        variant="primary"
        block
        onPress={() => void onSave()}
      />
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    section: { gap: 4, marginBottom: 12 },
    fieldGap: { marginTop: 12 },
    input: {
      backgroundColor: colors.card, borderRadius: 6, borderWidth: 1, borderColor: colors.borderInput,
      paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: fonts.sans, color: colors.text,
    },
    inputMultiline: { minHeight: 80, lineHeight: 22 },
    uploadRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    uploadChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    uploadChipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    uploadChipText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    uploadChipTextActive: { color: colors.accent },
    routeBubbles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    routeBubble: {
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    routeBubbleActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accent,
    },
    routeBubbleText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    routeBubbleTextActive: { color: colors.card },
    dateRow: { flexDirection: 'row', gap: 8 },
    dateField: { flex: 1 },
    ocrBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 6,
      backgroundColor: colors.accentLight,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    ocrBtnText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.accent,
    },
    ocrHint: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 17,
      marginTop: 8,
    },
    stageCard: { gap: 8, marginBottom: 8 },
    stageLabel: { fontFamily: fonts.sansSemiBold, fontSize: 13, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
    stageDateRow: { flexDirection: 'row', gap: 8 },
    stageRow: { fontFamily: fonts.sans, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
    reviewValue: { fontFamily: fonts.sansSemiBold, fontSize: 15, fontWeight: '600', color: colors.text },
    reminderList: { gap: 8, marginTop: 8 },
    reminderRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    reminderField: { flex: 1, gap: 4 },
    reminderFieldLabel: { fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted },
    reminderPreview: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 16,
      fontWeight: '600',
      color: colors.accent,
      paddingBottom: 12,
      minWidth: 52,
      textAlign: 'right',
    },
    reminderIconBtn: {
      width: 40,
      height: 44,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      marginBottom: 0,
    },
    reminderIconBtnSpacer: { width: 40, height: 44 },
    addReminderBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    addReminderText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.accent,
    },
    empty: { fontFamily: fonts.sans, fontSize: 15, color: colors.textSecondary, textAlign: 'center', paddingVertical: 24 },
    hint: { fontFamily: fonts.sans, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
    modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
    modalSheet: { backgroundColor: colors.card, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingBottom: 24, maxHeight: '70%' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    modalTitle: { fontFamily: fonts.sans, fontSize: 15, fontWeight: '700', color: colors.text },
    modalCancel: { fontFamily: fonts.sans, fontSize: 15, color: colors.textSecondary },
    modalDone: { fontFamily: fonts.sans, fontSize: 15, fontWeight: '700', color: colors.accent },
    modalDoneDisabled: { opacity: 0.4 },
    parseInput: { flex: 1, margin: 16, backgroundColor: colors.card, borderRadius: 8, borderWidth: 1, borderColor: colors.borderInput, padding: 12, fontSize: 14, fontFamily: fonts.sans, color: colors.text, minHeight: 120 },
  });
}
