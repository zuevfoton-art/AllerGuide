import { createElement } from 'react';
import { Platform } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

/** Web-only skip link. Renders nothing on native. */
export function SkipLink() {
  const { t } = useTranslation();
  const { colors, fonts } = useTheme();

  if (Platform.OS !== 'web') return null;

  return createElement(
    'a',
    {
      href: '#content',
      style: {
        position: 'absolute',
        left: 8,
        top: -80,
        zIndex: 1000,
        minHeight: 44,
        padding: '10px 14px',
        borderRadius: 999,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: colors.accent,
        backgroundColor: colors.card,
        color: colors.accent,
        fontFamily: fonts.sansSemiBold,
        fontSize: 14,
        fontWeight: 600,
        textDecoration: 'none',
      },
    },
    t('common.skipToContent'),
  );
}
