import { useMemo, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ModalKeyboardAvoid } from '@/src/components/ModalKeyboardAvoid';
import { density, radii } from '@/src/constants/layout';
import { fontSizes, lineHeights } from '@/src/constants/typography';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useModalAnimation } from '@/src/hooks/use-modal-animation';
import { useTranslation } from '@/src/store/locale-store';

export type BottomSheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Pinned footer (composer, primary CTA). */
  footer?: ReactNode;
  /** ~88% height for chat / tall content. */
  fullHeight?: boolean;
  testID?: string;
  accessibilityLabel?: string;
};

/**
 * Shared contextual bottom sheet chrome (Ask chat, pickers).
 * Not for crisis SOS or long clinical forms.
 */
export function BottomSheet({
  visible,
  title,
  onClose,
  children,
  footer,
  fullHeight = false,
  testID,
  accessibilityLabel,
}: BottomSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const modalAnimation = useModalAnimation('slide');

  return (
    <Modal
      visible={visible}
      transparent
      animationType={modalAnimation}
      onRequestClose={onClose}
      statusBarTranslucent>
      <ModalKeyboardAvoid style={styles.root}>
        {({ liftStyle }) => (
          <View style={styles.root}>
            <Pressable
              style={styles.backdrop}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
            />
            <View
              style={[
                fullHeight ? styles.fullSheet : styles.sheet,
                liftStyle,
                { paddingBottom: Math.max(insets.bottom, 12) },
              ]}
              accessibilityViewIsModal
              accessibilityLabel={accessibilityLabel ?? title}
              testID={testID}>
              <View style={styles.grabberWrap}>
                <View style={styles.grabber} />
              </View>
              <View style={styles.header}>
                <Text style={styles.title} numberOfLines={1}>
                  {title}
                </Text>
                <Pressable
                  testID={testID ? `${testID}-close` : undefined}
                  style={styles.closeBtn}
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.cancel')}
                  hitSlop={8}>
                  <Ionicons name="close" size={22} color={theme.colors.textMuted} />
                </Pressable>
              </View>
              <View style={styles.body}>{children}</View>
              {footer ? <View style={styles.footer}>{footer}</View> : null}
            </View>
          </View>
        )}
      </ModalKeyboardAvoid>
    </Modal>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, justifyContent: 'flex-end' },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(28, 38, 36, 0.42)',
    },
    sheet: {
      maxHeight: '72%',
      backgroundColor: colors.bg,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    fullSheet: {
      height: '88%',
      maxHeight: '92%',
      backgroundColor: colors.bg,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    grabberWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
    grabber: {
      width: 40,
      height: 4,
      borderRadius: radii.full,
      backgroundColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 10,
      gap: 12,
    },
    title: {
      flex: 1,
      fontFamily: fonts.serifBold,
      fontSize: fontSizes.h3,
      lineHeight: lineHeights.h3,
      fontWeight: '700',
      color: colors.head,
    },
    closeBtn: {
      width: density.tapMinHeight,
      height: density.tapMinHeight,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    body: { flex: 1, minHeight: 0 },
    footer: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingTop: 10,
      gap: 8,
    },
  });
}
