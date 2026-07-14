import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CatalogProduct } from '@allerguide/core';
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useMemo } from 'react';
import { getProductColor } from '@/src/modules/marketplace/product-theme';
import { trackEvent } from '@/src/services/analytics-service';
import { useTranslation } from '@/src/store/locale-store';
import { MARKETPLACE_CHECKOUT_ENABLED } from '@/src/constants/features';
import { useCartStore } from '@/src/store/cart-store';

interface MarketplaceProductCardProps {
  item: CatalogProduct;
  compact?: boolean;
}

export function MarketplaceProductCard({ item, compact = false }: MarketplaceProductCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, compact), [theme, compact]);
  const color = getProductColor(theme, item.colorKey);
  const { t } = useTranslation();
  const addProduct = useCartStore((s) => s.addProduct);

  const openAffiliate = () => {
    if (!item.affiliateUrl) return;
    trackEvent('market_click', { productId: item.id });
    void Linking.openURL(item.affiliateUrl);
  };

  const addToCart = () => {
    addProduct(item.id);
    trackEvent('market_add_to_cart', { productId: item.id });
  };

  const content = (
    <>
      <View style={[styles.cardIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={item.icon as any} size={compact ? 20 : 24} color={color} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={compact ? 1 : 2}>
            {item.title}
          </Text>
          <View style={[styles.tag, { backgroundColor: `${color}18` }]}>
            <Text style={[styles.tagText, { color }]}>{item.tag}</Text>
          </View>
        </View>
        <Text style={styles.cardWhy} numberOfLines={compact ? 2 : undefined}>
          {item.why}
        </Text>
        {item.affiliateUrl && !compact ? (
          <Pressable onPress={openAffiliate} accessibilityRole="link">
            <Text style={styles.buyLink}>{t('market.buyLink')} →</Text>
          </Pressable>
        ) : null}
        {MARKETPLACE_CHECKOUT_ENABLED && !compact ? (
          <Button
            testID={`market-add-${item.id}`}
            label={t('market.addToCart')}
            variant="secondary"
            size="sm"
            onPress={addToCart}
          />
        ) : null}
      </View>
      {!compact ? (
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
      ) : null}
    </>
  );

  if (compact) {
    return <View style={styles.card}>{content}</View>;
  }

  return <GlassCard style={styles.card}>{content}</GlassCard>;
}

function createStyles({ colors, fonts }: AppTheme, compact: boolean) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: compact ? 10 : 14,
      marginBottom: 0,
      paddingVertical: compact ? 10 : undefined,
      paddingHorizontal: compact ? 12 : undefined,
    },
    cardIcon: {
      width: compact ? 36 : 44,
      height: compact ? 36 : 44,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardBody: { flex: 1, gap: compact ? 4 : 6 },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    cardTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: compact ? 14 : 15,
      fontWeight: '600',
      color: colors.text,
      flexShrink: 1,
    },
    tag: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 4 },
    tagText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 11,
      fontWeight: '600',
    },
    cardWhy: {
      fontFamily: fonts.sans,
      fontSize: compact ? 12 : 13,
      color: colors.textSecondary,
      lineHeight: compact ? 16 : 18,
    },
    buyLink: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
      marginTop: 4,
    },
  });
}
