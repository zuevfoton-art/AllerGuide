import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ALLERGEN_CATEGORY_LABELS,
  getAllAllergens,
  getCrossReactionsFor,
  type AllergenCategory,
  type AllergenRecord,
} from '@allerguide/core';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

const CATEGORY_ORDER: AllergenCategory[] = ['food', 'environmental', 'medication', 'insect'];

interface AllergenCatalogModalProps {
  visible: boolean;
  selected: string[];
  onClose: () => void;
  onApply: (selected: string[]) => void;
}

export function AllergenCatalogModal({
  visible,
  selected,
  onClose,
  onApply,
}: AllergenCatalogModalProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<string[]>(selected);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const items = getAllAllergens();
    if (!normalized) return items;
    return items.filter((item) => item.name.toLowerCase().includes(normalized));
  }, [query]);

  const grouped = useMemo(() => {
    return CATEGORY_ORDER.map((category) => ({
      category,
      label: ALLERGEN_CATEGORY_LABELS[category],
      items: filtered.filter((item) => item.category === category),
    })).filter((section) => section.items.length > 0);
  }, [filtered]);

  const toggle = (name: string) => {
    setDraft((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name],
    );
  };

  const openModal = () => {
    setDraft(selected);
    setQuery('');
    setExpandedNote(null);
  };

  const renderItem = (item: AllergenRecord) => {
    const active = draft.includes(item.name);
    const crossReactions = getCrossReactionsFor(item.id);
    const showNote = expandedNote === item.id;

    return (
      <View key={item.id} style={styles.itemWrap}>
        <Pressable
          style={[styles.itemRow, active && styles.itemRowActive]}
          onPress={() => toggle(item.name)}
          onLongPress={() => setExpandedNote(showNote ? null : item.id)}>
          <View style={[styles.checkbox, active && styles.checkboxActive]}>
            {active ? <Ionicons name="checkmark" size={14} color={theme.colors.onAccent} /> : null}
          </View>
          <View style={styles.itemText}>
            <Text style={[styles.itemTitle, active && styles.itemTitleActive]}>{item.name}</Text>
            {crossReactions.length > 0 ? (
              <Text style={styles.itemHint}>
                Перекрёстные реакции: {crossReactions.map((match) => match.allergen.name).join(', ')}
              </Text>
            ) : null}
          </View>
        </Pressable>
        {showNote && crossReactions.length > 0 ? (
          <View style={styles.noteBox}>
            {crossReactions.map((match) => (
              <Text key={match.allergen.id} style={styles.noteText}>
                {match.allergen.name}: {match.note}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onShow={openModal}
      onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.headerBtn} onPress={onClose}>
            <Text style={styles.headerBtnText}>Отмена</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Все аллергены</Text>
          <Pressable
            style={styles.headerBtn}
            onPress={() => {
              onApply(draft);
              onClose();
            }}>
            <Text style={[styles.headerBtnText, styles.headerBtnPrimary]}>Готово</Text>
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={theme.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Поиск аллергена…"
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
          {grouped.map((section) => (
            <View key={section.category} style={styles.section}>
              <Text style={styles.sectionLabel}>{section.label}</Text>
              {section.items.map(renderItem)}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

function createStyles({ colors }: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
    headerBtn: { minWidth: 72 },
    headerBtnText: { fontSize: 15, color: colors.textSecondary, fontWeight: '600' },
    headerBtnPrimary: { color: colors.accent, textAlign: 'right' },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      margin: 16,
      marginBottom: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: { flex: 1, fontSize: 16, color: colors.text },
    list: { paddingHorizontal: 16, paddingBottom: 32, gap: 16 },
    section: { gap: 8 },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    itemWrap: { gap: 4 },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    itemRowActive: { borderColor: colors.accent, backgroundColor: colors.accentLight },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    checkboxActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    itemText: { flex: 1, gap: 4 },
    itemTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
    itemTitleActive: { color: colors.accent },
    itemHint: { fontSize: 12, color: colors.textSecondary, lineHeight: 16 },
    noteBox: {
      marginLeft: 34,
      padding: 10,
      borderRadius: 10,
      backgroundColor: colors.tipBg,
      borderWidth: 1,
      borderColor: colors.tipBorder,
      gap: 4,
    },
    noteText: { fontSize: 12, color: colors.tipText, lineHeight: 16 },
  });
}
