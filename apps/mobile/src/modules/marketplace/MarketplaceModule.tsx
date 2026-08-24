import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  MARKETPLACE_CATEGORIES,
  type MarketplaceCategory,
} from '@allerguide/core';
import { GlassCard } from '@/src/components/GlassCard';
import { Disclaimer } from '@/src/components/Disclaimer';
import { Button } from '@/src/components/Button';
import { BrandFeatureIcon } from '@/src/components/brand/BrandTabIcon';
import { radii } from '@/src/constants/layout';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { useAppStore } from '@/src/store/app-store';
import { CATEGORY_LABEL_KEYS } from '@/src/modules/marketplace/category-labels';
import { MarketplaceProductCard } from '@/src/modules/marketplace/MarketplaceProductCard';
import { useMarketplaceProducts } from '@/src/modules/marketplace/use-marketplace-products';

const PREVIEW_LIMIT = 3;

export type MarketplaceModuleVariant = 'embedded' | 'full';

export interface MarketplaceCatalogState {
  items: ReturnType<typeof useMarketplaceProducts>['items'];
  source: ReturnType<typeof useMarketplaceProducts>['source'];
  stale: boolean;
  loading: boolean;
  refresh: () => void;
}

interface MarketplaceModuleProps {
  variant?: MarketplaceModuleVariant;
  catalog?: MarketplaceCatalogState;
  query?: string;
  onQueryChange?: (value: string) => void;
  category?: MarketplaceCategory | 'all';
  onCategoryChange?: (value: MarketplaceCategory | 'all') => void;
}

export function MarketplaceModule({
  variant = 'full',
  catalog,
  query,
  onQueryChange,
  category,
  onCategoryChange,
}: MarketplaceModuleProps) {
  if (variant === 'embedded') {
    return <EmbeddedMarketplace />;
  }
  if (catalog && query != null && category != null && onQueryChange && onCategoryChange) {
    return (
      <FullMarketplace
        catalog={catalog}
        query={query}
        onQueryChange={onQueryChange}
        category={category}
        onCategoryChange={onCategoryChange}
      />
    );
  }
  return <FullMarketplaceSelfContained />;
}

function EmbeddedMarketplace() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const profile = useAppStore((s) => s.activeProfile);
  const { items } = useMarketplaceProducts(profile);
  const previewItems = items.slice(0, PREVIEW_LIMIT);
  const openFullMarket = () => router.push('/(tabs)/market');

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
        <Pressable onPress={openFullMarket} accessibilityRole="button" hitSlop={8}>
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

function FullMarketplaceSelfContained() {
  const profile = useAppStore((s) => s.activeProfile);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<MarketplaceCategory | 'all'>('all');
  const catalog = useMarketplaceProducts(profile, query, category);
  return (
    <FullMarketplace
      catalog={catalog}
      query={query}
      onQueryChange={setQuery}
      category={category}
      onCategoryChange={setCategory}
    />
  );
}

function FullMarketplace({
  catalog,
  query,
  onQueryChange,
  category,
  onCategoryChange,
}: {
  catalog: MarketplaceCatalogState;
  query: string;
  onQueryChange: (value: string) => void;
  category: MarketplaceCategory | 'all';
  onCategoryChange: (value: MarketplaceCategory | 'all') => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const { items, loading, refresh, source, stale } = catalog;

  return (
    <>
      <GlassCard style={styles.searchCard}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={theme.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={onQueryChange}
            placeholder={t('market.searchPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            accessibilityLabel={t('market.searchPlaceholder')}
            testID="market-search"
            onSubmitEditing={refresh}
          />
        </View>
      </GlassCard>

      <View style={styles.filterRow} testID="market-filters">
        {(['all', ...MARKETPLACE_CATEGORIES] as const).map((key) => {
          const selected = category === key;
          return (
            <Pressable
              key={key}
              onPress={() => onCategoryChange(key)}
              style={[styles.filterChip, selected && styles.filterChipActive]}
              testID={`market-filter-${key}`}
              hitSlop={8}
            >
              <Text style={[styles.filterText, selected && styles.filterTextActive]}>
                {t(`market.${CATEGORY_LABEL_KEYS[key]}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sourceHint} testID="market-source">
        {source === 'api'
          ? t('market.sourceLive')
          : source === 'cache'
            ? t('market.sourceCache')
            : t('market.sourceSeed')}
        {stale ? ` · ${t('market.staleHint')}` : ''}
      </Text>

      <GlassCard style={styles.banner}>
        <Ionicons name="star" size={18} color={theme.colors.warning} />
        <Text style={styles.bannerText}>{t('market.banner')}</Text>
      </GlassCard>

      {items.length === 0 && loading ? (
        <View style={styles.grid} testID="market-skeleton">
          {['a', 'b', 'c', 'd'].map((key) => (
            <View key={key} style={styles.gridItem}>
              <View style={styles.skeletonCard} />
            </View>
          ))}
        </View>
      ) : items.length === 0 ? (
        <GlassCard style={styles.empty} testID="market-empty">
          <Ionicons name="basket-outline" size={36} color={theme.colors.textMuted} />
          <Text style={styles.emptyText}>{t('market.empty')}</Text>
        </GlassCard>
      ) : (
        <View style={styles.grid} testID="market-grid">
          {items.map((item) => (
            <View key={item.id} style={styles.gridItem}>
              <MarketplaceProductCard item={item} />
            </View>
          ))}
        </View>
      )}

      <Disclaimer>{t('market.disclaimer')}</Disclaimer>
      {items.some((item) => item.kind === 'medicine') ? (
        <Disclaimer>{t('market.medicineDisclaimer')}</Disclaimer>
      ) : null}
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
    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    filterChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radii.sm,
      backgroundColor: colors.surfaceMuted,
    },
    filterChipActive: {
      backgroundColor: colors.accentLight,
      borderWidth: 1,
      borderColor: colors.accentMid,
    },
    filterText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      color: colors.textSecondary,
    },
    filterTextActive: {
      color: colors.accent,
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
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 12,
    },
    gridItem: {
      width: '48%',
    },
    sourceHint: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
    },
    skeletonCard: {
      width: '100%',
      aspectRatio: 0.72,
      borderRadius: 10,
      backgroundColor: colors.surfaceMuted,
    },
  });
}
