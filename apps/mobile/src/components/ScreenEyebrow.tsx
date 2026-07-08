import { Text, type TextStyle } from 'react-native';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTranslation } from '@/src/store/locale-store';

type ScreenEyebrowProps = {
  /** Screen section label after «A-Claro ·» */
  section?: string;
  style?: TextStyle;
};

/** Uppercase screen eyebrow: `A-Claro · {section}` or product name only. */
export function ScreenEyebrow({ section, style }: ScreenEyebrowProps) {
  const ui = useUiStyles();
  const { t } = useTranslation();
  const label = section
    ? `${t('brand.productName')} · ${section}`
    : t('brand.productName');

  return <Text style={[ui.docLabel, style]}>{label}</Text>;
}
