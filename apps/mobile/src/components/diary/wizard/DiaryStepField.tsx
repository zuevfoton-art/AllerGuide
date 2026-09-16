import { useLayoutEffect, useMemo, useRef } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { parseMultiChoiceValue, toggleMultiChoiceValue, type DiaryStep } from '@allerguide/core';
import { DateTimeField } from '@/src/components/DateTimeField';
import { useDiaryEditorScroll } from '@/src/components/DiaryEditorModal';
import { DiaryPhotoToolbar } from '@/src/components/diary/wizard/DiaryPhotoToolbar';
import { createFieldStyles } from '@/src/components/diary/wizard/diary-wizard-styles';
import { useTheme } from '@/src/hooks/use-theme';

export function DiaryStepField({
  step,
  value,
  compactIme = false,
  onChange,
}: {
  step: DiaryStep;
  value: string;
  compactIme?: boolean;
  onChange: (value: string) => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createFieldStyles(theme), [theme]);
  const inputRef = useRef<TextInput>(null);
  const editorScroll = useDiaryEditorScroll();

  useLayoutEffect(() => {
    const node = inputRef.current;
    if (!node) return undefined;
    // Maestro inputText focuses the native EditText without RN onFocus
    // (nightly 34956812041), so register on mount, not only on focus.
    editorScroll?.registerInput(node);
    return () => editorScroll?.unregisterInput(node);
  }, [editorScroll]);

  const handleFocus = () => {
    editorScroll?.registerInput(inputRef.current);
    editorScroll?.setFocusedStepId(step.id);
    editorScroll?.scrollFieldIntoView(inputRef.current);
  };

  const handleChangeText = (text: string) => {
    // Maestro inputText may skip RN onFocus (nightly 35067465304).
    editorScroll?.registerInput(inputRef.current);
    editorScroll?.setFocusedStepId(step.id);
    onChange(text);
  };

  if (step.field === 'photo') {
    return <DiaryPhotoToolbar value={value} onChange={onChange} />;
  }

  if (step.field === 'time' || step.field === 'datetime') {
    return (
      <DateTimeField
        label={step.label}
        value={value}
        mode={step.field}
        placeholder={step.placeholder}
        onChange={onChange}
        testID={`diary-field-${step.id}`}
      />
    );
  }

  if (step.field === 'choice' && step.choices) {
    const selected = step.multiSelect ? parseMultiChoiceValue(value) : [];
    return (
      <View
        style={styles.choiceGrid}
        testID={step.multiSelect ? 'diary-multi-choice' : `diary-choice-${step.id}`}
        collapsable={false}>
        {step.choices.map((choice) => {
          const active = step.multiSelect ? selected.includes(choice) : value === choice;
          return (
            <Pressable
              key={choice}
              testID={
                step.multiSelect ? `diary-multi-choice-${choice}` : `diary-choice-${choice}`
              }
              collapsable={false}
              style={[styles.choiceChip, active && styles.choiceChipActive]}
              hitSlop={8}
              onPress={() => {
                editorScroll?.dismissIme();
                onChange(step.multiSelect ? toggleMultiChoiceValue(value, choice) : choice);
              }}>
              <Text style={[styles.choiceText, active && styles.choiceTextActive]}>
                {step.multiSelect && active ? '✓ ' : ''}
                {choice}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  const useMultilineLayout = Boolean(step.multiline) && !compactIme;

  return (
    <View style={useMultilineLayout ? styles.inputMultilineWrap : styles.inputWrap} collapsable={false}>
      <TextInput
        ref={inputRef}
        testID={`diary-field-${step.id}`}
        collapsable={false}
        style={[styles.input, useMultilineLayout && styles.inputMultiline]}
        value={value}
        onChangeText={handleChangeText}
        onFocus={handleFocus}
        placeholder={step.placeholder}
        placeholderTextColor={theme.colors.textMuted}
        accessibilityLabel={step.label}
        multiline={step.multiline}
        textAlignVertical={step.multiline ? 'top' : 'center'}
      />
    </View>
  );
}
