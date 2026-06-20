import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DIARY_SECTIONS,
  formatDiaryDate,
  formatDiaryEntrySummary,
  getDiaryEntryAnswers,
  getDiarySection,
} from '@allerguide/core';
import {
  addDiaryEntries,
  deleteDiaryEntry,
  generateDoctorPdf,
  getDiaryEntries,
  updateDiaryEntry,
} from '@/src/services/diary-service';
import { useAppStore } from '@/src/store/app-store';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
import { DiaryLegacyEditor, DiaryWizard } from '@/src/components/DiaryWizard';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import type { DiaryEntry } from '@/src/types';

const TYPE_CONFIG: Record<string, { icon: string; colorKey: keyof AppTheme['colors'] }> = {
  Симптомы: { icon: 'pulse', colorKey: 'danger' },
  Лекарство: { icon: 'medkit', colorKey: 'purple' },
  Питание: { icon: 'restaurant', colorKey: 'accent' },
  Триггер: { icon: 'warning', colorKey: 'warning' },
  Кожа: { icon: 'body', colorKey: 'pink' },
  Заметка: { icon: 'create', colorKey: 'success' },
};

type EditorState =
  | { mode: 'full' }
  | { mode: 'section'; sectionType: string }
  | { mode: 'edit'; entry: DiaryEntry; legacy?: boolean };

export default function DiaryScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const [list, setList] = useState<DiaryEntry[]>([]);
  const [editor, setEditor] = useState<EditorState | null>(null);

  const load = useCallback(async () => {
    if (!activeProfileId) return;
    setList(await getDiaryEntries(activeProfileId));
  }, [activeProfileId]);

  useEffect(() => {
    void load();
  }, [load]);

  const closeEditor = () => setEditor(null);

  const handleCreate = async (entries: { type: string; details: string }[]) => {
    if (!activeProfileId) return;
    await addDiaryEntries(activeProfileId, entries);
    closeEditor();
    await load();
  };

  const handleUpdate = async (entry: DiaryEntry, type: string, details: string) => {
    await updateDiaryEntry(entry.id, { type, details });
    closeEditor();
    await load();
  };

  const confirmDelete = (entry: DiaryEntry) => {
    Alert.alert('Удалить запись?', `Запись «${entry.type}» будет удалена без возможности восстановления.`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          await deleteDiaryEntry(entry.id);
          closeEditor();
          await load();
        },
      },
    ]);
  };

  const openEdit = (entry: DiaryEntry) => {
    const answers = getDiaryEntryAnswers(entry.type, entry.details);
    if (answers) {
      setEditor({ mode: 'edit', entry });
      return;
    }
    setEditor({ mode: 'edit', entry, legacy: true });
  };

  const renderEditor = () => {
    if (!editor) return null;

    if (editor.mode === 'edit' && editor.legacy) {
      return (
        <DiaryLegacyEditor
          value={entryDetailsText(editor.entry)}
          onCancel={closeEditor}
          onSave={(details) => void handleUpdate(editor.entry, editor.entry.type, details)}
          onDelete={() => confirmDelete(editor.entry)}
        />
      );
    }

    if (editor.mode === 'full') {
      return <DiaryWizard onCancel={closeEditor} onComplete={(entries) => void handleCreate(entries)} />;
    }

    const sectionType = editor.mode === 'section' ? editor.sectionType : editor.entry.type;
    const section = getDiarySection(sectionType);
    if (!section) return null;

    const initialAnswers = editor.mode === 'edit' ? getDiaryEntryAnswers(editor.entry.type, editor.entry.details) : null;

    return (
      <DiaryWizard
        sections={[section]}
        initialAnswersBySection={initialAnswers ? { [section.type]: initialAnswers } : undefined}
        allowSkipSection={false}
        submitLabel={editor.mode === 'edit' ? 'Сохранить изменения' : 'Сохранить'}
        onCancel={closeEditor}
        onComplete={(entries) => {
          const [entry] = entries;
          if (!entry) return;
          if (editor.mode === 'edit') {
            void handleUpdate(editor.entry, entry.type, entry.details);
            return;
          }
          void handleCreate(entries);
        }}
        onDelete={editor.mode === 'edit' ? () => confirmDelete(editor.entry) : undefined}
      />
    );
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Дневник</Text>
        <Text style={styles.subtitle}>Пошаговые записи наблюдений</Text>
      </View>

      <ProfileSwitcher />

      {!editor ? (
        <>
          <Pressable style={styles.startBtn} onPress={() => setEditor({ mode: 'full' })}>
            <Ionicons name="add-circle" size={20} color={theme.colors.onAccent} />
            <Text style={styles.startBtnText}>Новая запись по шагам</Text>
          </Pressable>

          <View style={styles.quickAddBlock}>
            <Text style={styles.sectionLabel}>Быстрое добавление</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickAddRow}>
              {DIARY_SECTIONS.map((section) => {
                const cfg = TYPE_CONFIG[section.type] ?? { icon: 'create', colorKey: 'textSecondary' as const };
                const color = theme.colors[cfg.colorKey];
                return (
                  <Pressable
                    key={section.type}
                    style={[styles.quickChip, { borderColor: `${color}55`, backgroundColor: `${color}12` }]}
                    onPress={() => setEditor({ mode: 'section', sectionType: section.type })}>
                    <Ionicons name={section.icon as any} size={14} color={color} />
                    <Text style={[styles.quickChipText, { color }]}>{section.title}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </>
      ) : (
        renderEditor()
      )}

      <View style={styles.row}>
        <Pressable style={styles.secondaryBtn} onPress={() => void load()}>
          <Ionicons name="refresh" size={16} color={theme.colors.accent} />
          <Text style={styles.secondaryText}>Обновить</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => activeProfileId && generateDoctorPdf(activeProfileId)}>
          <Ionicons name="document-text" size={16} color={theme.colors.accent} />
          <Text style={styles.secondaryText}>PDF-отчёт</Text>
        </Pressable>
      </View>

      {list.length > 0 ? (
        <>
          <Text style={styles.sectionLabel}>История записей</Text>
          {list.map((item) => {
            const cfg = TYPE_CONFIG[item.type] ?? { icon: 'create', colorKey: 'textSecondary' as const };
            const color = theme.colors[cfg.colorKey];
            const summary = formatDiaryEntrySummary(item.type, item.details);
            return (
              <Pressable key={item.id} style={styles.card} onPress={() => openEdit(item)}>
                <View style={[styles.cardDot, { backgroundColor: `${color}18` }]}>
                  <Ionicons name={cfg.icon as any} size={16} color={color} />
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardType}>{item.type}</Text>
                    <Ionicons name="create-outline" size={16} color={theme.colors.textMuted} />
                  </View>
                  <Text style={styles.cardDetails}>{summary}</Text>
                  <Text style={styles.cardMeta}>{formatDiaryDate(item.createdAt)}</Text>
                </View>
              </Pressable>
            );
          })}
        </>
      ) : null}

      <Text style={styles.disclaimer}>
        Дневник отражает только наблюдения пользователя и не заменяет медицинскую документацию.
      </Text>
    </Screen>
  );
}

function entryDetailsText(entry: DiaryEntry): string {
  const answers = getDiaryEntryAnswers(entry.type, entry.details);
  if (answers?.noteBody) return answers.noteBody;
  return entry.details.trim();
}

function createStyles({ colors, shadows }: AppTheme) {
  return StyleSheet.create({
    header: { gap: 3 },
    title: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
    subtitle: { fontSize: 14, color: colors.textSecondary },
    startBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.accent,
      padding: 16,
      borderRadius: 16,
      ...(shadows.accent as object),
    },
    startBtnText: { color: colors.onAccent, fontWeight: '700', fontSize: 16 },
    quickAddBlock: { gap: 8 },
    quickAddRow: { gap: 8, paddingRight: 4 },
    quickChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1.5,
    },
    quickChipText: { fontSize: 13, fontWeight: '700' },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    row: { flexDirection: 'row', gap: 10 },
    secondaryBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.accentLight,
      padding: 13,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.accentMid,
    },
    secondaryText: { color: colors.accent, fontWeight: '600', fontSize: 14 },
    card: {
      flexDirection: 'row',
      gap: 12,
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 16,
      alignItems: 'flex-start',
      ...(shadows.xs as object),
    },
    cardDot: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    cardBody: { flex: 1, gap: 4 },
    cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    cardType: { fontSize: 14, fontWeight: '700', color: colors.text },
    cardDetails: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
    cardMeta: { fontSize: 11, color: colors.textMuted },
    disclaimer: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
  });
}
