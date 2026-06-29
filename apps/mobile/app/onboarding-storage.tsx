import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { setStorageMode } from '@/src/services/settings-service';
import { Screen } from '@/src/components/Screen';
import { GlassCard } from '@/src/components/GlassCard';
import { Disclaimer } from '@/src/components/Disclaimer';
import { BrandLogo } from '@/src/components/brand/BrandLogo';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

const OPTIONS = [
  {
    key: 'local' as const,
    labelKey: 'storageOnboarding.localTitle',
    descKey: 'storageOnboarding.localDesc',
    icon: 'phone-portrait-outline' as const,
    colorKey: 'success' as const,
  },
  {
    key: 'cloud' as const,
    labelKey: 'storageOnboarding.cloudTitle',
    descKey: 'storageOnboarding.cloudDesc',
    icon: 'cloud-outline' as const,
    colorKey: 'accent' as const,
  },
] as const;

export default function OnboardingStorageScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const choose = (mode: 'local' | 'cloud') => {
    setStorageMode(mode);
    router.push('/profile-setup');
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <BrandLogo size={56} showWordmark />
        <Text style={styles.title}>{t('storageOnboarding.title')}</Text>
        <Text style={styles.subtitle}>{t('storageOnboarding.subtitle')}</Text>
      </View>

      <Text style={ui.sectionLabel}>{t('storageOnboarding.sectionLabel')}</Text>

      {OPTIONS.map((opt) => {
        const color = theme.colors[opt.colorKey];
        return (
          <Pressable key={opt.key} onPress={() => choose(opt.key)} style={styles.pressable}>
            <GlassCard style={styles.card}>
              <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
                <Ionicons name={opt.icon} size={22} color={color} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{t(opt.labelKey)}</Text>
                <Text style={styles.cardDesc}>{t(opt.descKey)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </GlassCard>
          </Pressable>
        );
      })}

      <Disclaimer>{t('storageOnboarding.disclaimer')}</Disclaimer>
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    hero: { alignItems: 'center', paddingVertical: 20, gap: 10 },
    title: {
      fontFamily: fonts.serifBold,
      fontSize: 22,
      fontWeight: '700',
      color: colors.head,
      textAlign: 'center',
      letterSpacing: -0.2,
    },
    subtitle: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 8,
    },
    pressable: { marginBottom: 0 },
    card: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    cardText: { flex: 1, gap: 3 },
    cardTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    cardDesc: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
  });
}
