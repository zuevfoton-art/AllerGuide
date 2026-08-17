import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/src/components/GlassCard';
import { Disclaimer } from '@/src/components/Disclaimer';
import { Button } from '@/src/components/Button';
import { BrandFeatureIcon } from '@/src/components/brand/BrandTabIcon';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { useAppStore } from '@/src/store/app-store';
import { MarketplaceProductCard } from '@/src/modules/marketplace/MarketplaceProductCard';
import { useMarketplaceProducts } from '@/src/modules/marketplace/use-marketplace-products';

const PREVIEW_LIMIT = 3;

export type MarketplaceModuleVariant = 'embedded' | 'full';

interface MarketplaceModuleProps {
  variant?: MarketplaceModuleVariant;
}

export function MarketplaceModule({ variant = 'full' }: MarketplaceModuleProps) {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const profile = useAppStore((s) => s.activeProfile);
  const [query, setQuery] = useState('');
  const { items, refresh } = useMarketplaceProducts(profile, variant === 'full' ? query : '');
  const previewItems = items.slice(0, PREVIEW_LIMIT);

  const openFullMarket = () => router.push('/(tabs)/market');

  if (variant === 'embedded') {
    return (
      <GlassCard padded={false}>
        <View style={[styles.moduleHead, styles.moduleHeadPad]}>
          <View style={styles.moduleTitleRow}>
            <View style={styles.moduleIcon}>
              <BrandFeatureIcon name="market" size={18} color={theme.colors.accent} />
            </View>
            <View style={styles.moduleTitles}>
              <Text style={ui.cardTitle}>{t('home.marketplaceTitle')}</Text>
              <Text style={styles.moduleSub}>{t('home.marketplaceSub')}</Text>
            </View>
          </View>
          <Pressable onPress={openFullMarket} accessibilityRole="button">
            <Text style={ui.sectionLink}>{t('common.more')}</Text>
          </Pressable>
        </View>

        <View style={styles.embeddedBanner}>
          <Ionicons name="star" size={14} color={theme.colors.warning} />
          <Text style={styles.embeddedBannerText}>{t('market.banner')}</Text>
        </View>

        {previewItems.length === 0 ? (
          <View style={styles.embeddedEmpty}>
            <Text style={styles.embeddedEmptyText}>{t('home.marketplaceEmpty')}</Text>
          </View>
        ) : (
          <View style={styles.previewList}>
            {previewItems.map((item, index) => (
              <View
                key={item.id}
                style={[styles.previewRow, index < previewItems.length - 1 && styles.previewRowBorder]}>
                <MarketplaceProductCard item={item} compact />
              </View>
            ))}
          </View>
        )}

        <View style={styles.embeddedFooter}>
          <Button
            label={t('home.marketplaceOpen')}
            variant="secondary"
            size="sm"
            onPress={openFullMarket}
          />
        </View>
      </GlassCard>
    );
  }

  return (
    <>
      <GlassCard style={styles.searchCard}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={theme.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={t('market.searchPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            accessibilityLabel={t('market.searchPlaceholder')}
            onSubmitEditing={refresh}
          />
        </View>
      </GlassCard>

      <GlassCard style={styles.banner}>
        <Ionicons name="star" size={18} color={theme.colors.warning} />
        <Text style={styles.bannerText}>{t('market.banner')}</Text>
      </GlassCard>

      {items.length === 0 ? (
        <GlassCard style={styles.empty}>
          <Ionicons name="basket-outline" size={36} color={theme.colors.textMuted} />
          <Text style={styles.emptyText}>{t('market.empty')}</Text>
        </GlassCard>
      ) : (
        items.map((item) => <MarketplaceProductCard key={item.id} item={item} />)
      )}

      <Disclaimer>{t('market.disclaimer')}</Disclaimer>
    </>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    moduleHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    moduleHeadPad: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
    moduleTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    moduleIcon: {
      width: 32,
      height: 32,
      borderRadius: 6,
      backgroundColor: colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    moduleTitles: { flex: 1, gap: 2 },
    moduleSub: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 16,
    },
    embeddedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 16,
      marginBottom: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 6,
      backgroundColor: colors.warningLight,
      borderWidth: 1,
      borderColor: colors.warningBorder,
    },
    embeddedBannerText: {
      flex: 1,
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.warningText,
      lineHeight: 16,
    },
    previewList: { gap: 0 },
    previewRow: { paddingHorizontal: 8 },
    previewRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    embeddedEmpty: { paddingHorizontal: 16, paddingVertical: 12 },
    embeddedEmptyText: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
    },
    embeddedFooter: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 14,
      alignItems: 'flex-start',
    },
    searchCard: { padding: 12, marginBottom: 0 },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    searchInput: {
      flex: 1,
      fontSize: 15,
      fontFamily: fonts.sans,
      color: colors.text,
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.warningLight,
      borderColor: colors.warningBorder,
    },
    bannerText: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.warningText,
      flex: 1,
      lineHeight: 18,
    },
    empty: { alignItems: 'center', paddingVertical: 24, gap: 8 },
    emptyText: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });
}
