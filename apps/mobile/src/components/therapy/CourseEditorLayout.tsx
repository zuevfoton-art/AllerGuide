import type { ReactNode } from 'react';
import { Text } from 'react-native';
import { Screen } from '@/src/components/Screen';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import type { CourseEditorStyles } from '@/src/components/therapy/course-editor-styles';

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  emptyMessage?: string;
  styles: CourseEditorStyles;
  onBack: () => void;
  children?: ReactNode;
};

export function CourseEditorLayout({
  title,
  subtitle,
  eyebrow,
  emptyMessage,
  styles,
  onBack,
  children,
}: Props) {
  return (
    <Screen>
      <ScreenHeader
        onBack={onBack}
        title={title}
        subtitle={subtitle}
        eyebrow={eyebrow}
        style={{ marginBottom: emptyMessage ? 0 : 12 }}
      />
      {emptyMessage ? <Text style={styles.empty}>{emptyMessage}</Text> : children}
    </Screen>
  );
}
