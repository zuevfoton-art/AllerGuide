import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/Screen';
import { GlassCard } from '@/src/components/GlassCard';
import { Disclaimer } from '@/src/components/Disclaimer';
import { BrandFeatureIcon } from '@/src/components/brand/BrandTabIcon';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

type MoreItem = {
  key: string;
  title: string;
  description: string;
  route: string;
  icon: 'market' | 'map' | 'expert' | 'settings';
  colorKey: 'success' | 'head' | 'accent' | 'textSecondary';
};

export default function MoreScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const items: MoreItem[] = useMemo(
    () => [
      {
        key: 'market',
        title: t('tabs.market'),
        description: t('more.marketDesc'),
        route: '/(tabs)/market',
        icon: 'market',
        colorKey: 'success',
      },
      {
        key: 'map',
        title: t('tabs.map'),
        description: t('more.mapDesc'),
        route: '/(tabs)/map',
        icon: 'map',
        colorKey: 'head',
      },
      {
        key: 'expert',
        title: t('home.expert'),
        description: t('more.expertDesc'),
        route: '/expert',
        icon: 'expert',
        colorKey: 'accent',
      },
      {
        key: 'settings',
        title: t('settings.title'),
        description: t('more.settingsDesc'),
        route: '/settings',
        icon: 'settings',
        colorKey: 'textSecondary',
      },
    ],
    [t],
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={ui.docLabel}>AllerGuide · {t('more.eyebrow')}</Text>
        <Text style={ui.docTitle}>{t('more.title')}</Text>
        <Text style={ui.docMeta}>{t('more.subtitle')}</Text>
      </View>

      <GlassCard padded={false}>
        {items.map((item, index) => {
          const color = theme.colors[item.colorKey];
          return (
            <Pressable
              key={item.key}
              style={[styles.row, index < items.length - 1 && styles.rowBorder]}
              onPress={() => router.push(item.route as any)}
              accessibilityRole="button"
              accessibilityLabel={item.title}>
              <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
                {item.icon === 'settings' ? (
                  <Ionicons name="settings-outline" size={20} color={color} />
                ) : (
                  <BrandFeatureIcon name={item.icon} size={20} color={color} />
                )}
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowDesc}>{item.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </Pressable>
          );
        })}
      </GlassCard>

      <Disclaimer>{t('home.disclaimer')}</Disclaimer>
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    header: { gap: 2 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowBody: { flex: 1, gap: 2 },
    rowTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      fontWeight: '600',
      color: colors.head,
    },
    rowDesc: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
  });
}
