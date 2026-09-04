import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ModalKeyboardAvoid } from '@/src/components/ModalKeyboardAvoid';
import { PrescriptionCameraCapture } from '@/src/components/PrescriptionCameraCapture';
import type { CourseEditorStyles } from '@/src/components/therapy/course-editor-styles';
import type { PrescriptionCopyPrefix } from '@/src/components/therapy/course-editor';
import type { AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

type Props = {
  copyPrefix: PrescriptionCopyPrefix;
  styles: CourseEditorStyles;
  theme: AppTheme;
  cameraOpen: boolean;
  parseTextOpen: boolean;
  parseText: string;
  parsing: boolean;
  onCancelCamera: () => void;
  onCaptured: (uri: string) => void;
  onCloseParse: () => void;
  onChangeParseText: (text: string) => void;
  onSubmitParse: () => void;
};

export function PrescriptionImportModals({
  copyPrefix,
  styles,
  theme,
  cameraOpen,
  parseTextOpen,
  parseText,
  parsing,
  onCancelCamera,
  onCaptured,
  onCloseParse,
  onChangeParseText,
  onSubmitParse,
}: Props) {
  const { t } = useTranslation();
  const prefix = copyPrefix;

  if (cameraOpen) {
    return (
      <PrescriptionCameraCapture
        visible
        title={t(`${prefix}.cameraTitle`)}
        hint={t(`${prefix}.cameraHint`)}
        galleryLabel={t('scanner.pickFromGallery')}
        shutterLabel={t('scanner.takePhoto')}
        cancelLabel={t('common.cancel')}
        onCancel={onCancelCamera}
        onCaptured={onCaptured}
      />
    );
  }

  return (
    <Modal visible={parseTextOpen} transparent animationType="slide" onRequestClose={onCloseParse}>
      <ModalKeyboardAvoid style={styles.modalBackdrop}>
        {({ liftStyle, keyboardInset }) => (
          <View style={[styles.modalSheet, liftStyle]}>
            <View style={styles.modalHeader}>
              <Pressable onPress={onCloseParse}>
                <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
              </Pressable>
              <Text style={styles.modalTitle}>{t(`${prefix}.ocrParse`)}</Text>
              <Pressable onPress={onSubmitParse} disabled={parsing}>
                <Text style={[styles.modalDone, parsing && styles.modalDoneDisabled]}>
                  {parsing ? t(`${prefix}.ocrParsing`) : t('common.done')}
                </Text>
              </Pressable>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: keyboardInset }}>
              <TextInput
                style={styles.parseInput}
                value={parseText}
                onChangeText={onChangeParseText}
                placeholder={t(`${prefix}.ocrManualPlaceholder`)}
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
  );
}
