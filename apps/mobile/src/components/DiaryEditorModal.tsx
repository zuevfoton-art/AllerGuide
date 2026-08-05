import { useMemo } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ModalKeyboardAvoid } from '@/src/components/ModalKeyboardAvoid';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

interface DiaryEditorModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/** Bottom-sheet diary editor matching `docs/design-mockup.html` (#screen-diary-editor). */
export function DiaryEditorModal({ visible, onClose, children }: DiaryEditorModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      <ModalKeyboardAvoid style={styles.root}>
        {({ liftStyle }) => (
          <>
            <Pressable
              style={styles.backdrop}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
            />
            <View
              style={[
                styles.sheet,
                { paddingBottom: Math.max(insets.bottom, 16) },
                liftStyle,
              ]}
              accessibilityViewIsModal>
              <View style={styles.grabberWrap}>
                <View style={styles.grabber} />
              </View>
              <View style={styles.header}>
                <Pressable
                  style={styles.headerBtn}
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.cancel')}>
                  <Text style={styles.headerBtnText}>{t('common.cancel')}</Text>
                </Pressable>
                <Text style={styles.headerTitle}>{t('diary.title')}</Text>
                <View style={styles.headerBtn} />
              </View>
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
                bounces={false}>
                {children}
              </ScrollView>
            </View>
          </>
        )}
      </ModalKeyboardAvoid>
    </Modal>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
    },
    sheet: {
      maxHeight: '88%',
      backgroundColor: colors.bg,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      borderTopWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    grabberWrap: {
      alignItems: 'center',
      paddingTop: 8,
      paddingBottom: 2,
    },
    grabber: {
      width: 36,
      height: 4,
      borderRadius: 999,
      backgroundColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.bg,
    },
    headerBtn: {
      minWidth: 72,
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    headerBtnText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      fontWeight: '600',
      color: colors.accent,
    },
    headerTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 16,
      fontWeight: '600',
      color: colors.head,
    },
    scroll: { flexGrow: 0 },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      gap: 16,
    },
  });
}
