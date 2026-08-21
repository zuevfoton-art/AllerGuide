import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fontSizes, scaledTextProps } from '@/src/constants/typography';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme } from '@/src/hooks/use-theme';

type CardTitleProps = {
  children: ReactNode;
  icon?: keyof typeof Ionicons.glyphMap;
  action?: string;
  onAction?: () => void;
};

export function CardTitle({ children, icon, action, onAction }: CardTitleProps) {
  const ui = useUiStyles();
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      {icon ? <Ionicons name={icon} size={18} color={colors.head} /> : null}
      <Text {...scaledTextProps} style={[ui.sectionTitle, styles.title]}>
        {children}
      </Text>
      {action ? (
        <Pressable
          onPress={onAction}
          disabled={!onAction}
          hitSlop={8}
          style={styles.action}
          accessibilityRole={onAction ? 'button' : undefined}
        >
          <Text {...scaledTextProps} style={[ui.sectionLink, styles.actionText]}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flexShrink: 1,
  },
  action: {
    marginLeft: 'auto',
  },
  actionText: {
    fontSize: fontSizes.label,
  },
});
