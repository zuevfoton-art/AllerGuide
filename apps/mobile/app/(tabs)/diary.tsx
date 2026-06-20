import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
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
  getDiaryEntries,
  updateDiaryEntry,
} from '@/src/services/diary-service';
import { useAppStore } from '@/src/store/app-store';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { GlassCard } from '@/src/components/GlassCard';
import { useGlassStyles } from '@/src/hooks/use-glass-styles';
import { DiaryLegacyEditor, DiaryWizard } from '@/src/components/DiaryWizard';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import type { DiaryEntry } from '@/src/types';

const TYPE_CONFIG: Record<string, { icon: string; colorKey: keyof AppTheme['colors'] }> = {
  Симптомы: { icon: 'pulse', colorKey: 'danger' },
  Лекарство: { icon: 'medkit', colorKey: 'purple' },
  Питание: { icon: 'restaurant', colorKey: 'accent' },
  Триггер: { icon: 'warning', colorKey: 'warning' },
  Кожа: { icon: 'body', colorKey: 'pink' },
  Пикфлоуметрия: { icon: 'speedometer', colorKey: 'success' },
  АСИТ: { icon: 'fitness', colorKey: 'forest' },
  'Визит к врачу': { icon: 'calendar', colorKey: 'purple' },
  Заметка: { icon: 'create', colorKey: 'success' },
};

type EditorState =
  | { mode: 'full' }
  | { mode: 'section'; sectionType: string }
  | { mode: 'edit'; entry: DiaryEntry; legacy?: boolean };

export default function DiaryScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const glass = useGlassStyles();
  const { t } = useTranslation();
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
      <ScreenHeader title={t('diary.title')} subtitle={t('diary.subtitle')} />

      <ProfileSwitcher />

      {!editor ? (
        <>
          <Pressable style={glass.primaryBtn} onPress={() => setEditor({ mode: 'full' })}>
            <Text style={glass.primaryBtnText}>{t('diary.newEntry')}</Text>
          </Pressable>

          <View style={styles.quickAddBlock}>
            <Text style={glass.sectionLabel}>{t('diary.quickAdd')}</Text>
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
        <Pressable style={glass.secondaryBtn} onPress={() => void load()}>
          <Ionicons name="refresh" size={16} color={theme.colors.teal} />
          <Text style={glass.secondaryBtnText}>{t('diary.refresh')}</Text>
        </Pressable>
        <Pressable style={glass.secondaryBtn} onPress={() => router.push('/doctor-report' as any)}>
          <Ionicons name="document-text" size={16} color={theme.colors.teal} />
          <Text style={glass.secondaryBtnText}>{t('diary.doctorReport')}</Text>
        </Pressable>
      </View>

      {list.length > 0 ? (
        <>
          <Text style={glass.sectionLabel}>{t('diary.history')}</Text>
          <GlassCard padded={false}>
          {list.map((item, index) => {
            const cfg = TYPE_CONFIG[item.type] ?? { icon: 'create', colorKey: 'textSecondary' as const };
            const color = theme.colors[cfg.colorKey];
            const summary = formatDiaryEntrySummary(item.type, item.details);
            return (
              <Pressable
                key={item.id}
                style={[glass.feedRow, index < list.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}
                onPress={() => openEdit(item)}>
                <View style={[glass.feedIcon, { backgroundColor: `${color}18` }]}>
                  <Ionicons name={cfg.icon as any} size={16} color={color} />
                </View>
                <View style={glass.feedBody}>
                  <Text style={glass.feedTitle}>{item.type}</Text>
                  <Text style={glass.feedSub}>{summary}</Text>
                  <Text style={styles.cardMeta}>{formatDiaryDate(item.createdAt)}</Text>
                </View>
                <Ionicons name="create-outline" size={16} color={theme.colors.textMuted} />
              </Pressable>
            );
          })}
          </GlassCard>
        </>
      ) : null}

      <Text style={glass.disclaimer}>{t('diary.disclaimer')}</Text>
    </Screen>
  );
}

function entryDetailsText(entry: DiaryEntry): string {
  const answers = getDiaryEntryAnswers(entry.type, entry.details);
  if (answers?.noteBody) return answers.noteBody;
  return entry.details.trim();
}

function createStyles({ colors }: AppTheme) {
  return StyleSheet.create({
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
    row: { flexDirection: 'row', gap: 10 },
    cardMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  });
}
