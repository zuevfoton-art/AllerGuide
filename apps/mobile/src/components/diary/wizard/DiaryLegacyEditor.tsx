import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { applyVoiceParseToAnswers } from '@allerguide/core';
import { VoiceNoteButton } from '@/src/components/VoiceNoteButton';
import { createLegacyStyles } from '@/src/components/diary/wizard/diary-wizard-styles';
import { useTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

interface DiaryLegacyEditorProps {
  value: string;
  onCancel: () => void;
  onSave: (details: string) => void;
  onDelete?: () => void;
}

export function DiaryLegacyEditor({ value, onCancel, onSave, onDelete }: DiaryLegacyEditorProps) {
  const theme = useTheme();
  const styles = useMemo(() => createLegacyStyles(theme), [theme]);
  const { t } = useTranslation();
  const [text, setText] = useState(value);
  const [error, setError] = useState('');

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError(t('diaryWizard.enterEntryText'));
      return;
    }
    onSave(trimmed);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Text style={styles.title}>{t('diaryWizard.editEntry')}</Text>
        <Pressable onPress={onCancel}>
          <Text style={styles.cancelText}>{t('common.cancel')}</Text>
        </Pressable>
      </View>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder={t('diaryWizard.entryPlaceholder')}
        placeholderTextColor={theme.colors.textMuted}
        accessibilityLabel={t('diaryWizard.editEntry')}
        multiline
        textAlignVertical="top"
      />
      <VoiceNoteButton
        testID="diary-legacy-voice"
        onTranscript={(transcript) => {
          setText((prev) =>
            applyVoiceParseToAnswers({ text: prev }, { transcript }, { targetStepId: 'text' }).text,
          );
        }}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.primaryBtn} onPress={handleSave}>
        <Text style={styles.primaryText}>{t('diary.saveChanges')}</Text>
      </Pressable>
      {onDelete ? (
        <Pressable style={styles.deleteBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
          <Text style={styles.deleteText}>{t('diaryWizard.deleteEntry')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
