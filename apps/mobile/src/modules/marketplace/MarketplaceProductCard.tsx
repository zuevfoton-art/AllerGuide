import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getPrimaryOffer,
  getProductOffers,
  merchantDisplayName,
  type CatalogProduct,
  type MarketOffer,
} from '@allerguide/core';
import { GlassCard } from '@/src/components/GlassCard';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useMemo, useState } from 'react';
import { getProductColor } from '@/src/modules/marketplace/product-theme';
import { trackEvent } from '@/src/services/analytics-service';
import { resolveYandexMarketOffer } from '@/src/services/market-api';
import { useTranslation } from '@/src/store/locale-store';

interface MarketplaceProductCardProps {
  item: CatalogProduct;
  compact?: boolean;
}

export function MarketplaceProductCard({ item, compact = false }: MarketplaceProductCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, compact), [theme, compact]);
  const color = getProductColor(theme, item.colorKey);
  const { t } = useTranslation();
  const [opening, setOpening] = useState(false);

  const offers = getProductOffers(item);
  const primary = getPrimaryOffer(item);
  const hasOffers = offers.length > 0;

  const buyLabel = (offer: MarketOffer) => {
    if (offer.merchant === 'yandex_market') return t('market.buyOnYandex');
    return `${t('market.buyLink')} · ${merchantDisplayName(offer.merchant)}`;
  };

  const openOffer = async (offer: MarketOffer) => {
    if (opening) return;
    setOpening(true);
    try {
      let url = offer.url;
      let merchant = offer.merchant;
      let source = 'seed';

      if (offer.merchant === 'yandex_market') {
        const resolved = await resolveYandexMarketOffer({
          productId: item.id,
          marketUrl: offer.url,
          marketArticle: offer.sku,
          fallbackUrl: offer.url,
        });
        url = resolved.url;
        merchant = resolved.merchant;
        source = resolved.source;
      }

      trackEvent('market_click', {
        product_id: item.id,
        merchant,
        source,
      });
      await Linking.openURL(url);
    } finally {
      setOpening(false);
    }
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
        {hasOffers && !compact ? (
          <View style={styles.offerRow}>
            {offers.slice(0, 2).map((offer) => (
              <Pressable
                key={`${offer.merchant}-${offer.url}`}
                onPress={() => void openOffer(offer)}
                accessibilityRole="link"
                disabled={opening}
                hitSlop={8}
              >
                <Text style={styles.buyLink}>
                  {buyLabel(offer)} →
                </Text>
              </Pressable>
            ))}
          </View>
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

  return (
    <Pressable
      onPress={primary ? () => void openOffer(primary) : undefined}
      accessibilityRole="button"
      disabled={!primary || opening}
    >
      <GlassCard style={styles.card}>{content}</GlassCard>
    </Pressable>
  );
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
    offerRow: { gap: 4, marginTop: 4 },
    buyLink: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
    },
  });
}
