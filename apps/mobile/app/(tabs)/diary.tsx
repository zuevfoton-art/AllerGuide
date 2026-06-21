import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { Disclaimer } from '@/src/components/Disclaimer';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { DiaryLegacyEditor, DiaryWizard } from '@/src/components/DiaryWizard';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { localizeDiarySections, localizeDiaryType } from '@/src/i18n/content';
import type { DiaryEntry } from '@/src/types';

const TYPE_ICONS: Record<string, string> = {
  Симптомы: 'pulse',
  Лекарство: 'medkit',
  Питание: 'restaurant',
  Триггер: 'warning',
  Кожа: 'body',
  Пикфлоуметрия: 'speedometer',
  АСИТ: 'fitness',
  'Визит к врачу': 'calendar',
  Заметка: 'create',
};

type EditorState =
  | { mode: 'full' }
  | { mode: 'section'; sectionType: string }
  | { mode: 'edit'; entry: DiaryEntry; legacy?: boolean };

export default function DiaryScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, locale, content } = useTranslation();
  const localeContent = content();
  const localizedSections = useMemo(
    () => localizeDiarySections(locale, localeContent),
    [locale, localeContent],
  );
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
    Alert.alert(
      t('diary.deleteTitle'),
      t('diary.deleteMessage', { type: localizeDiaryType(entry.type, localeContent) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteDiaryEntry(entry.id);
            closeEditor();
            await load();
          },
        },
      ],
    );
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
      return (
        <DiaryWizard
          sections={localizedSections}
          onCancel={closeEditor}
          onComplete={(entries) => void handleCreate(entries)}
        />
      );
    }

    const sectionType = editor.mode === 'section' ? editor.sectionType : editor.entry.type;
    const section = localizedSections.find((s) => s.type === sectionType) ?? getDiarySection(sectionType);
    if (!section) return null;

    const initialAnswers = editor.mode === 'edit' ? getDiaryEntryAnswers(editor.entry.type, editor.entry.details) : null;

    return (
      <DiaryWizard
          sections={[section]}
          initialAnswersBySection={initialAnswers ? { [section.type]: initialAnswers } : undefined}
          allowSkipSection={false}
          submitLabel={editor.mode === 'edit' ? t('diary.saveChanges') : t('common.save')}
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
        <Text style={ui.docLabel}>AllerGuide · {t('diary.eyebrow')}</Text>
        <Text style={ui.docTitle}>{t('diary.title')}</Text>
        <Text style={ui.docMeta}>{t('diary.subtitle')}</Text>
      </View>

      <ProfileSwitcher />

      {!editor ? (
        <>
          <Button label={t('diary.newEntry')} variant="primary" block onPress={() => setEditor({ mode: 'full' })} />
          <Button
            label={t('diary.quickEntry')}
            variant="secondary"
            block
            onPress={() => {
              const section = localizedSections.find((s) => s.type === 'Симптомы') ?? localizedSections[0];
              if (section) setEditor({ mode: 'section', sectionType: section.type });
            }}
          />

          <GlassCard>
            <Text style={ui.cardTitle}>{t('diary.quickAdd')}</Text>
            <View style={styles.chipRow}>
              {localizedSections.map((section) => (
                  <Pressable
                    key={section.type}
                    style={styles.chip}
                    onPress={() => setEditor({ mode: 'section', sectionType: section.type })}>
                    <Ionicons
                      name={(TYPE_ICONS[section.type] ?? section.icon) as any}
                      size={14}
                      color={theme.colors.textSecondary}
                    />
                    <Text style={styles.chipText}>{section.title}</Text>
                  </Pressable>
                ))}
            </View>
          </GlassCard>
        </>
      ) : (
        renderEditor()
      )}

      <View style={styles.actionRow}>
        <Button label={t('diary.refresh')} variant="secondary" style={styles.actionBtn} onPress={() => void load()} />
        <Button
          label={t('diary.doctorReport')}
          variant="secondary"
          style={styles.actionBtn}
          onPress={() => router.push('/doctor-report' as any)}
        />
      </View>

      <GlassCard padded={false}>
        <View style={styles.listHead}>
          <Text style={[ui.cardTitle, styles.listHeadPad]}>{t('diary.history')}</Text>
        </View>

        {list.length === 0 ? (
          <Text style={[styles.empty, styles.listHeadPad]}>{t('diary.empty')}</Text>
        ) : (
          list.map((item, index) => {
            const icon = TYPE_ICONS[item.type] ?? 'create';
            const summary = formatDiaryEntrySummary(item.type, item.details);
            return (
              <Pressable
                key={item.id}
                style={[styles.row, index < list.length - 1 && styles.rowBorder]}
                onPress={() => openEdit(item)}>
                <View style={ui.feedIcon}>
                  <Ionicons name={icon as any} size={16} color={theme.colors.textSecondary} />
                </View>
                <View style={ui.feedBody}>
                  <Text style={ui.feedTitle}>{localizeDiaryType(item.type, localeContent)}</Text>
                  <Text style={ui.feedSub}>{summary}</Text>
                  <Text style={styles.cardMeta}>{formatDiaryDate(item.createdAt)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
              </Pressable>
            );
          })
        )}
      </GlassCard>

      <Disclaimer>{t('diary.disclaimer')}</Disclaimer>
    </Screen>
  );
}

function entryDetailsText(entry: DiaryEntry): string {
  const answers = getDiaryEntryAnswers(entry.type, entry.details);
  if (answers?.noteBody) return answers.noteBody;
  return entry.details.trim();
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    header: { gap: 2 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 7,
      paddingHorizontal: 10,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    chipText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    actionRow: { flexDirection: 'row', gap: 8 },
    actionBtn: { flex: 1 },
    listHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 14,
    },
    listHeadPad: { paddingHorizontal: 16 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    cardMeta: {
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
    },
    empty: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      paddingBottom: 16,
      lineHeight: 18,
    },
  });
}
