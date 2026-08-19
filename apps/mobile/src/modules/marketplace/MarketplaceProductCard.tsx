import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getMarketplacePrimaryOffer,
  merchantDisplayName,
  type MarketplaceOffer,
  type MarketplaceProduct,
} from '@allerguide/core';
import { GlassCard } from '@/src/components/GlassCard';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useMemo, useState } from 'react';
import { CATEGORY_LABEL_KEYS } from '@/src/modules/marketplace/category-labels';
import { getProductColor } from '@/src/modules/marketplace/product-theme';
import { trackEvent } from '@/src/services/analytics-service';
import { resolveYandexMarketOffer } from '@/src/services/market-api';
import { useTranslation } from '@/src/store/locale-store';

interface MarketplaceProductCardProps {
  item: MarketplaceProduct;
  compact?: boolean;
}

export function MarketplaceProductCard({ item, compact = false }: MarketplaceProductCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, compact), [theme, compact]);
  const color = getProductColor(theme, item.colorKey);
  const { t } = useTranslation();
  const [opening, setOpening] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const primary = getMarketplacePrimaryOffer(item);
  const isMedicine = item.kind === 'medicine';

  const buyLabel = (offer: MarketplaceOffer) => {
    if (offer.merchant === 'yandex_market') return t('market.buyOnYandex');
    if (offer.merchant === 'pharmacy') return t('market.buyOnPharmacy');
    return `${t('market.buyLink')} · ${merchantDisplayName(offer.merchant)}`;
  };

  const openOffer = async (offer: MarketplaceOffer) => {
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
        product_kind: item.kind,
        provider: item.provider,
      });
      await Linking.openURL(url);
    } finally {
      setOpening(false);
    }
  };

  const photo = !imageFailed && item.imageUrl ? (
    <Image
      source={{ uri: item.imageUrl }}
      style={styles.photo}
      accessibilityLabel={item.title}
      onError={() => setImageFailed(true)}
    />
  ) : (
    <View style={[styles.photo, styles.photoFallback, { backgroundColor: `${color}18` }]}>
      <Ionicons name={item.icon as 'image'} size={compact ? 22 : 28} color={color} />
    </View>
  );

  const info = (
    <View style={styles.cardBody}>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <View style={[styles.tag, { backgroundColor: `${color}18` }]}>
        <Text style={[styles.tagText, { color }]}>{t(`market.${CATEGORY_LABEL_KEYS[item.category]}`)}</Text>
      </View>
      <Text style={styles.cardWhy} numberOfLines={compact ? 2 : 3}>
        {item.why}
      </Text>
      {item.showPrice && item.priceRub != null ? (
        <Text style={styles.price}>{t('market.priceFrom', { price: item.priceRub })}</Text>
      ) : null}
      {isMedicine ? <Text style={styles.medicineNote}>{t('market.medicineCardNote')}</Text> : null}
      {!compact && primary ? (
        <Text style={styles.buyLink}>{buyLabel(primary)} →</Text>
      ) : null}
    </View>
  );

  if (compact) {
    return (
      <Pressable
        onPress={primary ? () => void openOffer(primary) : undefined}
        accessibilityRole="button"
        accessibilityLabel={item.title}
        disabled={!primary || opening}
        style={styles.compactRow}
      >
        {photo}
        {info}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={primary ? () => void openOffer(primary) : undefined}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      disabled={!primary || opening}
      testID={`market-card-${item.id}`}
    >
      <GlassCard style={styles.card} padded={false}>
        {photo}
        <View style={styles.infoPad}>{info}</View>
      </GlassCard>
    </Pressable>
  );
}

function createStyles({ colors, fonts }: AppTheme, compact: boolean) {
  return StyleSheet.create({
    card: {
      flexDirection: 'column',
      alignItems: 'stretch',
      overflow: 'hidden',
      marginBottom: 0,
    },
    compactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
    },
    photo: compact
      ? {
          width: 56,
          height: 56,
          borderRadius: 6,
          backgroundColor: colors.surfaceMuted,
        }
      : {
          width: '100%',
          aspectRatio: 1,
          backgroundColor: colors.surfaceMuted,
        },
    photoFallback: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoPad: {
      paddingHorizontal: 10,
      paddingTop: 8,
      paddingBottom: 10,
    },
    cardBody: { gap: compact ? 3 : 5 },
    cardTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: compact ? 13 : 14,
      fontWeight: '600',
      color: colors.text,
    },
    tag: {
      alignSelf: 'flex-start',
      paddingVertical: 2,
      paddingHorizontal: 7,
      borderRadius: 4,
    },
    tagText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 10,
      fontWeight: '600',
    },
    cardWhy: {
      fontFamily: fonts.sans,
      fontSize: compact ? 11 : 12,
      color: colors.textSecondary,
      lineHeight: compact ? 15 : 16,
    },
    price: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    medicineNote: {
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.warningText,
      lineHeight: 14,
    },
    buyLink: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.accent,
    },
  });
}
