import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { radii } from '@/src/constants/layout';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

type EmptyStateProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** Friendly placeholder shown when a list / section has no content yet. */
export function EmptyState({ icon = 'sparkles-outline', title, description, actionLabel, onAction }: EmptyStateProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <GlassCard>
      <View style={styles.wrap}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={24} color={theme.colors.accent} />
        </View>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.desc}>{description}</Text> : null}
        {actionLabel && onAction ? (
          <Button label={actionLabel} variant="primary" size="sm" onPress={onAction} />
        ) : null}
      </View>
    </GlassCard>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: { alignItems: 'center', gap: 8, paddingVertical: 8 },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: radii.md,
      backgroundColor: colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
    title: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    desc: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      textAlign: 'center',
      marginBottom: 4,
    },
  });
}
