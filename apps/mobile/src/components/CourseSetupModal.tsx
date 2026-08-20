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
import { Ionicons } from '@expo/vector-icons';
import type { CourseSetupOption } from '@allerguide/core';
import { ModalKeyboardAvoid } from '@/src/components/ModalKeyboardAvoid';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

interface CourseSetupModalProps {
  visible: boolean;
  options: CourseSetupOption[];
  onClose: () => void;
  onSelect: (id: CourseSetupOption['id']) => void;
}

export function CourseSetupModal({ visible, options, onClose, onSelect }: CourseSetupModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const copy: Record<
    CourseSetupOption['id'],
    { icon: keyof typeof Ionicons.glyphMap; title: string; hint: string; testID: string }
  > = {
    therapy: {
      icon: 'medical',
      title: t('diary.setupCourseTherapy'),
      hint: t('diary.setupCourseTherapyHint'),
      testID: 'diary-course-therapy',
    },
    asit: {
      icon: 'fitness',
      title: t('diary.setupCourseAsit'),
      hint: t('diary.setupCourseAsitHint'),
      testID: 'diary-course-asit',
    },
  };

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
              style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }, liftStyle]}
              accessibilityViewIsModal>
              <View style={styles.grabberWrap}>
                <View style={styles.grabber} />
              </View>
              <View style={styles.header}>
                <View style={styles.headerBtn} />
                <Text style={styles.headerTitle}>{t('diary.setupCourseTitle')}</Text>
                <Pressable
                  style={styles.headerBtn}
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.done')}>
                  <Text style={[styles.headerBtnText, styles.headerBtnTextEnd]}>{t('common.done')}</Text>
                </Pressable>
              </View>
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                bounces={false}>
                {options.map((option) => {
                  const item = copy[option.id];
                  const disabled = !option.available;
                  return (
                    <Pressable
                      key={option.id}
                      testID={item.testID}
                      style={[styles.row, disabled && styles.rowDisabled]}
                      onPress={() => {
                        if (disabled) return;
                        onSelect(option.id);
                      }}
                      disabled={disabled}
                      accessibilityRole="button"
                      accessibilityState={{ disabled }}
                      accessibilityLabel={item.title}>
                      <View style={styles.iconWrap}>
                        <Ionicons name={item.icon} size={16} color={theme.colors.textSecondary} />
                      </View>
                      <View style={styles.rowBody}>
                        <Text style={styles.rowTitle}>{item.title}</Text>
                        <Text style={styles.rowHint}>
                          {disabled && option.id === 'asit'
                            ? t('diary.setupCourseAsitUnavailable')
                            : item.hint}
                        </Text>
                      </View>
                      {disabled ? null : (
                        <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                      )}
                    </Pressable>
                  );
                })}
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
    headerBtnTextEnd: {
      textAlign: 'right',
    },
    headerTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 16,
      fontWeight: '600',
      color: colors.head,
    },
    scroll: { maxHeight: 360 },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      gap: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 12,
      paddingVertical: 14,
      borderRadius: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    rowDisabled: {
      opacity: 0.55,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
    },
    rowBody: { flex: 1, gap: 2 },
    rowTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      fontWeight: '600',
      color: colors.head,
    },
    rowHint: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 17,
    },
  });
}
