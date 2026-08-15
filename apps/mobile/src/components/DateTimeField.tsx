import { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

type PickerMode = 'date' | 'time' | 'datetime';

export interface DateTimeFieldProps {
  label: string;
  value: string;
  onChange: (isoOrLocal: string) => void;
  mode?: PickerMode;
  /** Minimum selectable year (date modes). */
  minYear?: number;
  maxYear?: number;
  testID?: string;
  placeholder?: string;
}

const MONTHS_RU = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function parseParts(value: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const now = new Date();
  const dateMatch = value.match(/(\d{4})-(\d{2})-(\d{2})/);
  const timeMatch = value.match(/(\d{1,2}):(\d{2})/);
  return {
    year: dateMatch ? Number(dateMatch[1]) : now.getFullYear(),
    month: dateMatch ? Number(dateMatch[2]) : now.getMonth() + 1,
    day: dateMatch ? Number(dateMatch[3]) : now.getDate(),
    hour: timeMatch ? Number(timeMatch[1]) : now.getHours(),
    minute: timeMatch ? Number(timeMatch[2]) : 0,
  };
}

function formatDisplay(value: string, mode: PickerMode): string {
  if (!value.trim()) return '';
  const p = parseParts(value);
  if (mode === 'time') return `${pad2(p.hour)}:${pad2(p.minute)}`;
  if (mode === 'date') return `${pad2(p.day)}.${pad2(p.month)}.${p.year}`;
  return `${pad2(p.day)}.${pad2(p.month)}.${p.year} ${pad2(p.hour)}:${pad2(p.minute)}`;
}

function toStored(parts: ReturnType<typeof parseParts>, mode: PickerMode): string {
  const date = `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
  const time = `${pad2(parts.hour)}:${pad2(parts.minute)}`;
  if (mode === 'time') return time;
  if (mode === 'date') return date;
  return `${date}T${time}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Native-style scroll date/time picker (no third-party dependency).
 * Emits ISO-like `YYYY-MM-DD`, `HH:mm`, or `YYYY-MM-DDTHH:mm`.
 */
export function DateTimeField({
  label,
  value,
  onChange,
  mode = 'date',
  minYear = 1950,
  maxYear = new Date().getFullYear() + 5,
  testID,
  placeholder,
}: DateTimeFieldProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => parseParts(value));

  const openPicker = () => {
    setDraft(parseParts(value || toStored(parseParts(''), mode)));
    setOpen(true);
  };

  const confirm = () => {
    const maxDay = daysInMonth(draft.year, draft.month);
    const next = { ...draft, day: Math.min(draft.day, maxDay) };
    onChange(toStored(next, mode));
    setOpen(false);
  };

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = maxYear; y >= minYear; y -= 1) list.push(y);
    return list;
  }, [minYear, maxYear]);

  const days = useMemo(() => {
    const max = daysInMonth(draft.year, draft.month);
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [draft.year, draft.month]);

  const emptyLabel =
    placeholder ??
    (mode === 'time' ? 'Выберите время' : mode === 'datetime' ? 'Выберите дату и время' : 'Выберите дату');
  const display = formatDisplay(value, mode) || emptyLabel;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        testID={testID}
        style={styles.field}
        onPress={openPicker}
        accessibilityRole="button">
        <Text style={[styles.fieldText, !value.trim() && styles.placeholder]}>{display}</Text>
        <Ionicons
          name={mode === 'time' ? 'time-outline' : 'calendar-outline'}
          size={18}
          color={theme.colors.textSecondary}
        />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setOpen(false)}>
                <Text style={styles.cancel}>Отмена</Text>
              </Pressable>
              <Text style={styles.sheetTitle}>{label}</Text>
              <Pressable onPress={confirm} testID={testID ? `${testID}-confirm` : undefined}>
                <Text style={styles.done}>Готово</Text>
              </Pressable>
            </View>
            <View style={styles.wheels}>
              {(mode === 'date' || mode === 'datetime') && (
                <>
                  <Wheel
                    items={days.map(String)}
                    selectedIndex={Math.max(0, draft.day - 1)}
                    onSelect={(i) => setDraft((d) => ({ ...d, day: i + 1 }))}
                    styles={styles}
                  />
                  <Wheel
                    items={MONTHS_RU}
                    selectedIndex={draft.month - 1}
                    onSelect={(i) => setDraft((d) => ({ ...d, month: i + 1 }))}
                    styles={styles}
                    flex={1.4}
                  />
                  <Wheel
                    items={years.map(String)}
                    selectedIndex={Math.max(0, years.indexOf(draft.year))}
                    onSelect={(i) => setDraft((d) => ({ ...d, year: years[i]! }))}
                    styles={styles}
                  />
                </>
              )}
              {(mode === 'time' || mode === 'datetime') && (
                <>
                  <Wheel
                    items={Array.from({ length: 24 }, (_, i) => pad2(i))}
                    selectedIndex={draft.hour}
                    onSelect={(i) => setDraft((d) => ({ ...d, hour: i }))}
                    styles={styles}
                  />
                  <Text style={styles.colon}>:</Text>
                  <Wheel
                    items={Array.from({ length: 60 }, (_, i) => pad2(i))}
                    selectedIndex={draft.minute}
                    onSelect={(i) => setDraft((d) => ({ ...d, minute: i }))}
                    styles={styles}
                  />
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Wheel({
  items,
  selectedIndex,
  onSelect,
  styles,
  flex = 1,
}: {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  styles: ReturnType<typeof createStyles>;
  flex?: number;
}) {
  return (
    <ScrollView
      style={[styles.wheel, { flex }]}
      showsVerticalScrollIndicator={false}
      snapToInterval={40}
      decelerationRate="fast"
      contentContainerStyle={styles.wheelContent}>
      {items.map((item, index) => {
        const active = index === selectedIndex;
        return (
          <Pressable key={`${item}-${index}`} style={styles.wheelItem} onPress={() => onSelect(index)}>
            <Text style={[styles.wheelText, active && styles.wheelTextActive]}>{item}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: 6 },
    label: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.card,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    },
    fieldText: {
      fontFamily: fonts.sans,
      fontSize: 16,
      color: colors.text,
    },
    placeholder: { color: colors.textMuted },
    backdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingBottom: 24,
      maxHeight: '55%',
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    sheetTitle: {
      fontFamily: fonts.sans,
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    cancel: { fontFamily: fonts.sans, fontSize: 15, color: colors.textSecondary },
    done: { fontFamily: fonts.sans, fontSize: 15, fontWeight: '700', color: colors.accent },
    wheels: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      height: 200,
    },
    wheel: { height: 200 },
    wheelContent: { paddingVertical: 80 },
    wheelItem: {
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    wheelText: {
      fontFamily: fonts.sans,
      fontSize: 16,
      color: colors.textMuted,
    },
    wheelTextActive: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 18,
    },
    colon: {
      fontFamily: fonts.sans,
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginHorizontal: 4,
    },
  });
}
