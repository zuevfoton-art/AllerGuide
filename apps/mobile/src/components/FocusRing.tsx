import { Platform, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

/** Web-only skip link. Renders nothing on native. */
export function SkipLink() {
  const { t } = useTranslation();
  const { colors, fonts } = useTheme();

  if (Platform.OS !== 'web') return null;

  return (
    <Text
      accessibilityRole="link"
      href="#content"
      style={[
        styles.link,
        {
          backgroundColor: colors.card,
          borderColor: colors.accent,
          color: colors.accent,
          fontFamily: fonts.sansSemiBold,
        },
      ]}
    >
      {t('common.skipToContent')}
    </Text>
  );
}

const styles = StyleSheet.create({
  link: {
    position: 'absolute',
    left: 8,
    top: -80,
    zIndex: 1000,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    fontSize: 14,
    fontWeight: '600',
  },
});
