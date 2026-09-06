import { useMemo } from 'react';
import { getDiarySection, hideDiaryAutoSteps } from '@allerguide/core';
import { DiaryEditorModal } from '@/src/components/DiaryEditorModal';
import { DiaryWizard } from '@/src/components/DiaryWizard';
import { localizeDiarySections } from '@/src/i18n/content';
import { useTranslation } from '@/src/store/locale-store';
import { SCAN_DIARY_SECTION_TYPE } from '@/src/services/scan-diary-service';

type Props = {
  visible: boolean;
  /** «Питание» answers pre-filled from the scan verdict. */
  prefill?: Record<string, string>;
  initialStepId?: string;
  profileId: number | null;
  profileAllergiesJson: string;
  onClose: () => void;
  onComplete: (entries: { type: string; details: string; photoUris?: string[] }[]) => void;
};

/** Diary «Питание» entry started from a scan result, without leaving the scanner. */
export function ScanDiaryEntryModal({
  visible,
  prefill,
  initialStepId,
  profileId,
  profileAllergiesJson,
  onClose,
  onComplete,
}: Props) {
  const { t, locale, content } = useTranslation();
  const localeContent = content();
  const section = useMemo(() => {
    const base =
      localizeDiarySections(locale, localeContent).find(
        (item) => item.type === SCAN_DIARY_SECTION_TYPE,
      ) ?? getDiarySection(SCAN_DIARY_SECTION_TYPE);
    return base ? hideDiaryAutoSteps(base) : null;
  }, [locale, localeContent]);

  if (!section) return null;

  return (
    <DiaryEditorModal visible={visible} onClose={onClose}>
      <DiaryWizard
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
