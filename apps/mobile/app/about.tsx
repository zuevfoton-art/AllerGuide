import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import appJson from '../app.json';
import { Screen } from '@/src/components/Screen';
import { ScreenEyebrow } from '@/src/components/ScreenEyebrow';
import { GlassCard } from '@/src/components/GlassCard';
import { Disclaimer } from '@/src/components/Disclaimer';
import { BrandLogo } from '@/src/components/brand/BrandLogo';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import {
  BRAND_LEGAL_URL,
  BRAND_MASTER_NAME,
  BRAND_PRODUCT_NAME,
  BRAND_SUPPORT_EMAIL,
  BRAND_WEBSITE_URL,
} from '@/src/constants/brand';

const APP_VERSION = appJson.expo.version;

export default function AboutScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const openUrl = (url: string) => {
    void Linking.openURL(url);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <ScreenEyebrow section={t('about.eyebrow')} />
          <Text style={ui.docTitle}>{t('about.title')}</Text>
          <Text style={ui.docMeta}>{t('about.subtitle')}</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <BrandLogo size={56} showWordmark showEndorser />
      </View>

      <GlassCard variant="calm">
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>{t('about.version')}</Text>
          <Text style={styles.metaValue}>{APP_VERSION}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>{t('about.developer')}</Text>
          <Text style={styles.metaValue}>{BRAND_MASTER_NAME}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>{t('about.product')}</Text>
          <Text style={styles.metaValue}>{BRAND_PRODUCT_NAME}</Text>
        </View>
      </GlassCard>

      <GlassCard padded={false}>
        <Pressable
          style={styles.linkRow}
          onPress={() => openUrl(BRAND_WEBSITE_URL)}
          accessibilityRole="link"
          accessibilityLabel={t('about.website')}>
          <View style={styles.linkIcon}>
            <Ionicons name="globe-outline" size={20} color={theme.colors.accent} />
          </View>
          <View style={styles.linkBody}>
            <Text style={styles.linkTitle}>{t('about.website')}</Text>
            <Text style={styles.linkSub}>{BRAND_WEBSITE_URL.replace('https://', '')}</Text>
          </View>
          <Ionicons name="open-outline" size={16} color={theme.colors.textMuted} />
        </Pressable>
        <Pressable
          style={[styles.linkRow, styles.linkRowBorder]}
          onPress={() => openUrl(`mailto:${BRAND_SUPPORT_EMAIL}`)}
          accessibilityRole="link"
          accessibilityLabel={t('about.support')}>
          <View style={styles.linkIcon}>
            <Ionicons name="mail-outline" size={20} color={theme.colors.accent} />
          </View>
          <View style={styles.linkBody}>
            <Text style={styles.linkTitle}>{t('about.support')}</Text>
            <Text style={styles.linkSub}>{BRAND_SUPPORT_EMAIL}</Text>
          </View>
          <Ionicons name="open-outline" size={16} color={theme.colors.textMuted} />
        </Pressable>
        <Pressable
          style={[styles.linkRow, styles.linkRowBorder]}
          onPress={() => router.push('/legal/privacy')}
          accessibilityRole="button"
          accessibilityLabel={t('about.privacy')}>
          <View style={styles.linkIcon}>
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.accent} />
          </View>
          <View style={styles.linkBody}>
            <Text style={styles.linkTitle}>{t('about.privacy')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </Pressable>
        <Pressable
          style={[styles.linkRow, styles.linkRowBorder]}
          onPress={() => router.push('/legal/terms')}
          accessibilityRole="button"
          accessibilityLabel={t('about.terms')}>
          <View style={styles.linkIcon}>
            <Ionicons name="document-text-outline" size={20} color={theme.colors.accent} />
          </View>
          <View style={styles.linkBody}>
            <Text style={styles.linkTitle}>{t('about.terms')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </Pressable>
      </GlassCard>

      <Text style={styles.legalUrl}>{BRAND_LEGAL_URL}</Text>

      <Disclaimer showMdrFootnote>{t('about.disclaimer')}</Disclaimer>
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 6,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 2,
      flexShrink: 0,
    },
    headerText: { flex: 1, gap: 2, minWidth: 0 },
    hero: { alignItems: 'center', paddingVertical: 8 },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 4,
    },
    metaLabel: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.textSecondary,
    },
    metaValue: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    linkRowBorder: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    linkIcon: {
      width: 40,
      height: 40,
      borderRadius: 6,
      backgroundColor: colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    linkBody: { flex: 1, gap: 2 },
    linkTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    linkSub: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
    },
    legalUrl: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });
}
