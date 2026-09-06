import { useMemo } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { parseMultiChoiceValue, toggleMultiChoiceValue, type DiaryStep } from '@allerguide/core';
import { DateTimeField } from '@/src/components/DateTimeField';
import { DiaryPhotoToolbar } from '@/src/components/diary/wizard/DiaryPhotoToolbar';
import { createFieldStyles } from '@/src/components/diary/wizard/diary-wizard-styles';
import { useTheme } from '@/src/hooks/use-theme';

export function DiaryStepField({
  step,
  value,
  onChange,
}: {
  step: DiaryStep;
  value: string;
  onChange: (value: string) => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createFieldStyles(theme), [theme]);

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
      <View style={styles.choiceGrid} testID={step.multiSelect ? 'diary-multi-choice' : undefined}>
        {step.choices.map((choice) => {
          const active = step.multiSelect ? selected.includes(choice) : value === choice;
          return (
            <Pressable
              key={choice}
              testID={step.multiSelect ? `diary-multi-choice-${choice}` : undefined}
              style={[styles.choiceChip, active && styles.choiceChipActive]}
              hitSlop={8}
              onPress={() =>
                onChange(step.multiSelect ? toggleMultiChoiceValue(value, choice) : choice)
              }>
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

  return (
    <TextInput
      testID={`diary-field-${step.id}`}
      style={[styles.input, step.multiline && styles.inputMultiline]}
      value={value}
      onChangeText={onChange}
      placeholder={step.placeholder}
      placeholderTextColor={theme.colors.textMuted}
      accessibilityLabel={step.label}
      multiline={step.multiline}
      textAlignVertical={step.multiline ? 'top' : 'center'}
    />
  );
}
