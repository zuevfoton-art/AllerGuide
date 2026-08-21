import { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ModalKeyboardAvoid } from '@/src/components/ModalKeyboardAvoid';
import { density, radii } from '@/src/constants/layout';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

export type ListPickerItem = {
  value: string;
  label: string;
  hint?: string;
  status?: string;
  dot?: string;
};

export type ListPickerGroup = {
  title: string;
  items: ListPickerItem[];
};

export type ListPickerSheetProps = {
  visible: boolean;
  title: string;
  groups: ListPickerGroup[];
  selected: string[];
  multi?: boolean;
  fullHeight?: boolean;
  searchPlaceholder?: string;
  footnote?: string;
  onToggle: (value: string) => void;
  onDone: () => void;
  onRequestClose?: () => void;
};

export function ListPickerSheet({
  visible,
  title,
  groups,
  selected,
  multi = false,
  fullHeight = false,
  searchPlaceholder,
  footnote,
  onToggle,
  onDone,
  onRequestClose,
}: ListPickerSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const close = onRequestClose ?? onDone;

  const filteredGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return groups
      .map((group) => ({
        ...group,
        items: normalized
          ? group.items.filter((item) => {
              const haystack = `${item.label} ${item.hint ?? ''} ${item.status ?? ''}`.toLowerCase();
              return haystack.includes(normalized);
            })
          : group.items,
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, query]);

  const sheet = (
    <View
      style={[
        fullHeight ? styles.fullSheet : styles.sheet,
        { paddingBottom: Math.max(insets.bottom, 16) },
      ]}
      accessibilityViewIsModal>
      {fullHeight ? null : (
        <View style={styles.grabberWrap}>
          <View style={styles.grabber} />
        </View>
      )}
      <View style={styles.header}>
        <View style={styles.headerBtn} />
        <Text style={styles.headerTitle}>{title}</Text>
        <Pressable
          style={styles.headerBtn}
          onPress={onDone}
          accessibilityRole="button"
          accessibilityLabel={t('common.done')}>
          <Text style={[styles.headerBtnText, styles.headerBtnTextEnd]}>{t('common.done')}</Text>
        </Pressable>
      </View>
      {searchPlaceholder ? (
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={theme.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>
      ) : null}
      <ScrollView
        style={fullHeight ? styles.fullScroll : styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
        {filteredGroups.map((group) => (
          <View key={group.title} style={styles.group}>
            <Text style={styles.groupLabel}>
              {group.title} · {group.items.length}
            </Text>
            {group.items.map((item) => {
              const checked = selected.includes(item.value);
              return (
                <Pressable
                  key={item.value}
                  style={[styles.row, checked && styles.rowSelected]}
                  onPress={() => onToggle(item.value)}
                  accessibilityRole={multi ? 'checkbox' : 'radio'}
                  accessibilityState={{ checked }}>
                  {item.dot ? <View style={[styles.dot, { backgroundColor: item.dot }]} /> : null}
                  <View style={styles.rowText}>
                    <Text style={styles.rowLabel}>{item.label}</Text>
                    {item.hint ? <Text style={styles.rowHint}>{item.hint}</Text> : null}
                    {item.status ? <Text style={styles.rowHint}>{item.status}</Text> : null}
                  </View>
                  <View
                    style={[
                      styles.box,
                      multi ? styles.boxMulti : styles.boxSingle,
                      checked && styles.boxChecked,
                    ]}>
                    {checked ? (
                      <Ionicons name="checkmark" size={14} color={theme.colors.onAccent} />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
        {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
      </ScrollView>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={!fullHeight}
      animationType="slide"
      presentationStyle={fullHeight ? 'pageSheet' : undefined}
      statusBarTranslucent={!fullHeight}
      navigationBarTranslucent={!fullHeight}
      onRequestClose={close}>
      <ModalKeyboardAvoid style={fullHeight ? styles.fullRoot : styles.root}>
        {({ liftStyle }) =>
          fullHeight ? (
            <View style={[styles.fullRoot, liftStyle]}>{sheet}</View>
          ) : (
            <>
              <Pressable
                style={styles.backdrop}
                onPress={close}
                accessibilityRole="button"
                accessibilityLabel={t('common.done')}
              />
              <View style={liftStyle}>{sheet}</View>
            </>
          )
        }
      </ModalKeyboardAvoid>
    </Modal>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, justifyContent: 'flex-end' },
    fullRoot: { flex: 1, backgroundColor: colors.bg },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay,
      opacity: 0.45,
    },
    sheet: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      maxHeight: '85%',
    },
    fullSheet: { flex: 1, backgroundColor: colors.bg },
    grabberWrap: { alignItems: 'center', paddingTop: 8 },
    grabber: {
      width: 36,
      height: 4,
      borderRadius: radii.full,
      backgroundColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
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
    headerBtnTextEnd: { textAlign: 'right' },
    headerTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 16,
      fontWeight: '600',
      color: colors.head,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 4,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radii.sm,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      fontFamily: fonts.sans,
      color: colors.text,
    },
    scroll: { maxHeight: 440 },
    fullScroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16,
      gap: 14,
    },
    group: { gap: density.pickerRowGap },
    groupLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: density.tapMinHeight,
      gap: 12,
      paddingHorizontal: 12,
      paddingVertical: density.pickerRowPaddingV,
      borderRadius: radii.row,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rowSelected: {
      backgroundColor: colors.accentLight,
      borderColor: colors.accent,
    },
    rowText: { flex: 1, gap: 2 },
    rowLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    rowHint: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 16,
    },
    box: {
      width: 22,
      height: 22,
      borderWidth: 1,
      borderColor: colors.borderInput,
      alignItems: 'center',
      justifyContent: 'center',
    },
    boxMulti: { borderRadius: radii.xs },
    boxSingle: { borderRadius: 11 },
    boxChecked: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    footnote: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 16,
    },
  });
}
