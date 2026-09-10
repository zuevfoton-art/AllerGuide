import { Text, View, type TextStyle } from 'react-native';
import { ScreenEyebrow } from '@/src/components/ScreenEyebrow';
import { useUiStyles } from '@/src/hooks/use-glass-styles';

type TabScreenHeaderProps = {
  eyebrow: string;
  title: string;
  meta?: string;
  titleStyle?: TextStyle;
};

/** Shared tab H1: uppercase eyebrow + serif docTitle + optional meta. */
export function TabScreenHeader({ eyebrow, title, meta, titleStyle }: TabScreenHeaderProps) {
  const ui = useUiStyles();
  return (
    <View accessibilityRole="header">
      <ScreenEyebrow section={eyebrow} />
      <Text style={[ui.docTitle, titleStyle]}>{title}</Text>
      {meta ? <Text style={ui.docMeta}>{meta}</Text> : null}
    </View>
  );
}
