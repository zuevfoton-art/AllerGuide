import { useEffect, useMemo, useState } from 'react';
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
import {
  CLINICAL_SCALES,
  type ClinicalScaleId,
  type DiaryEntryPickerOption,
} from '@allerguide/core';
import { ModalKeyboardAvoid } from '@/src/components/ModalKeyboardAvoid';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Симптомы: 'pulse',
  Лекарство: 'medkit',
  Питание: 'restaurant',
  Триггер: 'warning',
  Кожа: 'body',
  Пикфлоуметрия: 'speedometer',
  'Укус насекомого': 'bug',
  'Визит к врачу': 'calendar',
  Заметка: 'create',
  Шкала: 'analytics',
};

const PICKER_TEST_IDS: Record<string, string> = {
  Симптомы: 'symptoms',
  Лекарство: 'medicine',
  Питание: 'food',
  Триггер: 'trigger',
  Кожа: 'skin',
  Пикфлоуметрия: 'pef',
  'Укус насекомого': 'insect',
  'Визит к врачу': 'visit',
  Заметка: 'note',
  Шкала: 'scale',
};

interface DiaryEntryTypePickerModalProps {
  visible: boolean;
  options: DiaryEntryPickerOption[];
  sectionTitle: (sectionType: string) => string;
  onClose: () => void;
  onSelectSection: (sectionType: string) => void;
  onSelectScale: (scaleId: ClinicalScaleId) => void;
}

export function DiaryEntryTypePickerModal({
  visible,
  options,
  sectionTitle,
  onClose,
  onSelectSection,
  onSelectScale,
}: DiaryEntryTypePickerModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [scaleStep, setScaleStep] = useState(false);

  useEffect(() => {
    if (!visible) setScaleStep(false);
  }, [visible]);

  const scaleOption = options.find((option) => option.kind === 'scale');
  const recommendedScaleIds = scaleOption?.recommendedScaleIds ?? [];
  const recommendedScales = CLINICAL_SCALES.filter((scale) =>
    recommendedScaleIds.includes(scale.id),
  );
  const otherScales = CLINICAL_SCALES.filter((scale) => !recommendedScaleIds.includes(scale.id));

  const handleClose = () => {
    setScaleStep(false);
    onClose();
  };

  const handleLeftPress = () => {
    if (scaleStep) {
      setScaleStep(false);
      return;
    }
    handleClose();
  };

  const optionLabel = (option: DiaryEntryPickerOption): string => {
    if (option.kind === 'scale') return t('diary.scale');
    if (option.sectionType === 'Визит к врачу') return t('diary.entryPickerVisit');
    return sectionTitle(option.sectionType);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={handleLeftPress}>
      <ModalKeyboardAvoid style={styles.root}>
        {({ liftStyle }) => (
          <>
            <Pressable
              style={styles.backdrop}
              onPress={handleClose}
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
                <Pressable
                  style={styles.headerBtn}
                  onPress={handleLeftPress}
                  accessibilityRole="button"
                  accessibilityLabel={scaleStep ? t('common.back') : t('common.cancel')}>
                  <Text style={styles.headerBtnText}>
                    {scaleStep ? t('common.back') : t('common.cancel')}
                  </Text>
                </Pressable>
                <Text style={styles.headerTitle}>
                  {scaleStep ? t('diary.scalePick') : t('diary.entryPickerTitle')}
                </Text>
                <View style={styles.headerBtn} />
              </View>
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                bounces={false}>
                {scaleStep ? (
                  <>
                    <Text style={styles.hint}>{t('diary.scaleRaaciHint')}</Text>
                    {recommendedScales.length > 0 ? (
                      <>
                        <Text style={styles.groupLabel}>{t('diary.scaleSuggested')}</Text>
                        {recommendedScales.map((scale) => (
                          <PickerRow
                            key={scale.id}
                            testID={`diary-picker-scale-${scale.id}`}
                            icon="analytics"
                            label={scale.shortLabel}
                            hint={scale.title}
                            accent
                            onPress={() => onSelectScale(scale.id)}
                            styles={styles}
                            theme={theme}
                          />
                        ))}
                      </>
                    ) : null}
                    {otherScales.map((scale) => (
                      <PickerRow
                        key={scale.id}
                        testID={`diary-picker-scale-${scale.id}`}
                        icon="analytics"
                        label={scale.shortLabel}
                        hint={scale.title}
                        onPress={() => onSelectScale(scale.id)}
                        styles={styles}
                        theme={theme}
                      />
                    ))}
                  </>
                ) : (
                  options.map((option) => (
                    <PickerRow
                      key={option.id}
                      testID={`diary-picker-${PICKER_TEST_IDS[option.id] ?? 'other'}`}
                      icon={TYPE_ICONS[option.sectionType] ?? 'create'}
                      label={optionLabel(option)}
                      onPress={() => {
                        if (option.kind === 'scale') {
                          setScaleStep(true);
                          return;
                        }
                        onSelectSection(option.sectionType);
                      }}
                      styles={styles}
                      theme={theme}
                    />
                  ))
                )}
              </ScrollView>
            </View>
          </>
        )}
      </ModalKeyboardAvoid>
    </Modal>
  );
}

function PickerRow({
  testID,
  icon,
  label,
  hint,
  accent,
  onPress,
  styles,
  theme,
}: {
  testID: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  accent?: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  theme: AppTheme;
}) {
  return (
    <Pressable
      testID={testID}
      style={[styles.row, accent && styles.rowAccent]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={16} color={theme.colors.textSecondary} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
    </Pressable>
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
      gap: 8,
    },
    hint: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 17,
      marginBottom: 4,
    },
    groupLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginTop: 4,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    rowAccent: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
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
    },
  });
}
