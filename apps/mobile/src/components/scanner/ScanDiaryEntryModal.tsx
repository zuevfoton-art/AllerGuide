import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getDiarySection, hideDiaryAutoSteps } from '@allerguide/core';
import { DiaryEditorModal } from '@/src/components/DiaryEditorModal';
import { DiaryWizard } from '@/src/components/DiaryWizard';
import { localizeDiarySections } from '@/src/i18n/content';
import { useTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import {
  SCAN_DIARY_SECTION_OPTIONS,
  type ScanDiarySectionType,
} from '@/src/services/scan-diary-service';
import { createStyles } from '@/src/components/scanner/scanner-styles';

const SECTION_TEST_IDS: Record<ScanDiarySectionType, string> = {
  Питание: 'food',
  Лекарство: 'medicine',
  Триггер: 'trigger',
  Кожа: 'skin',
  Заметка: 'note',
};

type Props = {
  visible: boolean;
  sectionType: string;
  /** Answers pre-filled from the scan verdict for the selected section. */
  prefill?: Record<string, string>;
  initialStepId?: string;
  profileId: number | null;
  profileAllergiesJson: string;
  onClose: () => void;
  onSectionChange: (sectionType: string) => void;
  onComplete: (entries: { type: string; details: string; photoUris?: string[] }[]) => void;
};

/** Diary entry started from a scan result, without leaving the scanner. */
export function ScanDiaryEntryModal({
  visible,
  sectionType,
  prefill,
  initialStepId,
  profileId,
  profileAllergiesJson,
  onClose,
  onSectionChange,
  onComplete,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, locale, content } = useTranslation();
  const localeContent = content();
  const localized = useMemo(
    () => localizeDiarySections(locale, localeContent),
    [locale, localeContent],
  );
  const section = useMemo(() => {
    const base =
      localized.find((item) => item.type === sectionType) ?? getDiarySection(sectionType);
    return base ? hideDiaryAutoSteps(base) : null;
  }, [localized, sectionType]);

  if (!section) return null;

  return (
    <DiaryEditorModal visible={visible} onClose={onClose}>
      <View style={styles.diarySectionPicker} testID="scan-diary-section-picker">
        <Text style={styles.diarySectionLabel}>{t('scanner.diarySectionLabel')}</Text>
        <View style={styles.diarySectionRow}>
          {SCAN_DIARY_SECTION_OPTIONS.map((option) => {
            const active = option === sectionType;
            const title =
              localized.find((item) => item.type === option)?.title ??
              getDiarySection(option)?.title ??
              option;
            return (
              <Pressable
                key={option}
                testID={`scan-diary-section-${SECTION_TEST_IDS[option]}`}
                onPress={() => onSectionChange(option)}
                style={[styles.diarySectionChip, active && styles.diarySectionChipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                hitSlop={4}>
                <Text
                  style={[styles.diarySectionChipText, active && styles.diarySectionChipTextActive]}>
                  {title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <DiaryWizard
        key={sectionType}
        sections={[section]}
        initialAnswersBySection={prefill ? { [section.type]: prefill } : undefined}
        allowSkipSection={false}
        profileId={profileId}
        profileAllergiesJson={profileAllergiesJson}
        initialStepId={initialStepId}
        submitLabel={t('common.save')}
        onCancel={onClose}
        onComplete={onComplete}
      />
    </DiaryEditorModal>
  );
}
