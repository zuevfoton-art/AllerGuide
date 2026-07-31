import { Text, type TextStyle } from 'react-native';
import { useUiStyles } from '@/src/hooks/use-glass-styles';

type ScreenEyebrowProps = {
  /** Screen section label (no product brand prefix). */
  section?: string;
  style?: TextStyle;
};

/** Uppercase screen eyebrow — section label only. */
export function ScreenEyebrow({ section, style }: ScreenEyebrowProps) {
  const ui = useUiStyles();
  const label = section?.trim();
  if (!label) return null;

  return <Text style={[ui.docLabel, style]}>{label}</Text>;
}
