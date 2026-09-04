import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CourseEditorStyles } from '@/src/components/therapy/course-editor-styles';
import type { PrescriptionCopyPrefix } from '@/src/components/therapy/course-editor';
import type { AppTheme } from '@/src/hooks/use-theme';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTranslation } from '@/src/store/locale-store';

type Props = {
  copyPrefix: PrescriptionCopyPrefix;
  styles: CourseEditorStyles;
  theme: AppTheme;
  variant: 'toggle' | 'chip';
  testIDPrefix: string;
  hasPhoto: boolean;
  hasPdf: boolean;
  parsing: boolean;
  ocrHint: string | null;
  onOpenCamera: () => void;
  onPickPdf: () => void;
  onRecognize: () => void;
};

export function PrescriptionImportPanel({
  copyPrefix,
  styles,
  theme,
  variant,
  testIDPrefix,
  hasPhoto,
  hasPdf,
  parsing,
  ocrHint,
  onOpenCamera,
  onPickPdf,
  onRecognize,
}: Props) {
  const ui = useUiStyles();
  const { t } = useTranslation();
  const prefix = copyPrefix;

  return (
    <>
      <Text style={ui.sectionLabel}>{t(`${prefix}.uploadPrescription`)}</Text>
      <View style={variant === 'toggle' ? ui.toggleRow : styles.uploadRow}>
        <Pressable
          style={
            variant === 'toggle'
              ? [ui.toggle, hasPhoto ? ui.toggleActive : null]
              : [styles.uploadChip, hasPhoto ? styles.uploadChipActive : null]
          }
          onPress={onOpenCamera}
          accessibilityRole="button"
          accessibilityLabel={t(`${prefix}.uploadPhoto`)}
          testID={`${testIDPrefix}-photo`}>
          <Ionicons
            name="camera"
            size={15}
            color={hasPhoto ? theme.colors.accent : theme.colors.textSecondary}
          />
          <Text
            style={
              variant === 'toggle'
                ? [ui.toggleText, hasPhoto ? ui.toggleTextActive : null]
                : [styles.uploadChipText, hasPhoto ? styles.uploadChipTextActive : null]
            }>
            {hasPhoto ? t(`${prefix}.uploadPhotoAttached`) : t(`${prefix}.uploadPhoto`)}
          </Text>
        </Pressable>
        <Pressable
          style={
            variant === 'toggle'
              ? [ui.toggle, hasPdf ? ui.toggleActive : null]
              : [styles.uploadChip, hasPdf ? styles.uploadChipActive : null]
          }
          onPress={onPickPdf}
          accessibilityRole="button"
          accessibilityLabel={t(`${prefix}.uploadPdf`)}
          testID={`${testIDPrefix}-pdf`}>
          <Ionicons
            name="document"
            size={15}
            color={hasPdf ? theme.colors.accent : theme.colors.textSecondary}
          />
          <Text
            style={
              variant === 'toggle'
                ? [ui.toggleText, hasPdf ? ui.toggleTextActive : null]
                : [styles.uploadChipText, hasPdf ? styles.uploadChipTextActive : null]
            }>
            {hasPdf ? t(`${prefix}.uploadPdfAttached`) : t(`${prefix}.uploadPdf`)}
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.ocrBtn, variant === 'chip' ? styles.ocrBtnCentered : null]}
        onPress={onRecognize}
        disabled={parsing}
        accessibilityRole="button"
        accessibilityLabel={t(`${prefix}.ocrParse`)}
        testID={`${testIDPrefix}-ocr`}>
        <Ionicons name="scan-outline" size={18} color={theme.colors.accent} />
        <Text style={styles.ocrBtnText}>
          {parsing ? t(`${prefix}.ocrParsing`) : t(`${prefix}.ocrParse`)}
        </Text>
      </Pressable>
      {ocrHint ? <Text style={styles.ocrHint}>{ocrHint}</Text> : null}
    </>
  );
}
