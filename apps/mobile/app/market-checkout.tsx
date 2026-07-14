import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { CATALOG_PRODUCTS, formatMoneyMinor } from '@allerguide/core';
import { Screen } from '@/src/components/Screen';
import { ScreenEyebrow } from '@/src/components/ScreenEyebrow';
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { Disclaimer } from '@/src/components/Disclaimer';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { useCartStore } from '@/src/store/cart-store';

export default function MarketCheckoutScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const items = useCartStore((s) => s.items);
  const hydrate = useCartStore((s) => s.hydrate);
  const applyDiscountCode = useCartStore((s) => s.applyDiscountCode);
  const clear = useCartStore((s) => s.clear);
  const getSummary = useCartStore((s) => s.getSummary);
  const [discountInput, setDiscountInput] = useState('');
  const [discountError, setDiscountError] = useState('');

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const summary = getSummary();
  const productById = useMemo(
    () => new Map(CATALOG_PRODUCTS.map((product) => [product.id, product])),
    [],
  );

  const handleApplyDiscount = () => {
    setDiscountError('');
    const result = applyDiscountCode(discountInput);
    if (!result.ok) {
      setDiscountError(t(`checkout.errors.${result.error}`));
    }
  };

  const handleConfirm = () => {
    Alert.alert(t('checkout.confirmTitle'), t('checkout.confirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('checkout.confirmOrder'),
        onPress: () => {
          clear();
          if (router.canGoBack()) router.back();
          else router.replace('/(tabs)/market' as any);
        },
      },
    ]);
  };

  if (items.length === 0) {
    return (
      <Screen>
        <View style={styles.header}>
          <ScreenEyebrow section={t('checkout.eyebrow')} />
          <Text style={ui.docTitle}>{t('checkout.title')}</Text>
        </View>
        <GlassCard style={styles.empty}>
          <Text style={styles.emptyText}>{t('checkout.emptyCart')}</Text>
          <Button
            testID="checkout-back-to-market"
            label={t('market.title')}
            variant="secondary"
            onPress={() => router.replace('/(tabs)/market' as any)}
          />
        </GlassCard>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <ScreenEyebrow section={t('checkout.eyebrow')} />
        <Text style={ui.docTitle}>{t('checkout.title')}</Text>
        <Text style={ui.docMeta}>{t('checkout.subtitle')}</Text>
      </View>

      <GlassCard style={styles.section}>
        {items.map((item) => {
          const product = productById.get(item.productId);
          return (
            <View key={item.productId} style={styles.lineRow}>
              <Text style={styles.lineTitle}>
                {product?.title ?? item.productId} × {item.quantity}
              </Text>
              <Text style={styles.linePrice}>
                {formatMoneyMinor(item.unitPriceMinor * item.quantity)}
              </Text>
            </View>
          );
        })}
      </GlassCard>

      <GlassCard style={styles.section}>
        <Text style={ui.sectionLabel}>{t('checkout.discountLabel')}</Text>
        <TextInput
          testID="checkout-discount-input"
          style={styles.input}
          value={discountInput}
          onChangeText={setDiscountInput}
          placeholder={t('checkout.discountPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="characters"
        />
        {discountError ? <Text style={styles.errorText}>{discountError}</Text> : null}
        {summary.discountCode ? (
          <Text testID="checkout-discount-applied" style={styles.successText}>
            {t('checkout.discountApplied', { code: summary.discountCode })}
          </Text>
        ) : null}
        <Button
          testID="checkout-apply-discount"
          label={t('checkout.applyDiscount')}
          variant="secondary"
          size="sm"
          onPress={handleApplyDiscount}
        />
      </GlassCard>

      <GlassCard style={styles.totals}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t('checkout.subtotal')}</Text>
          <Text testID="checkout-subtotal" style={styles.totalValue}>
            {formatMoneyMinor(summary.subtotalMinor)}
          </Text>
        </View>
        {summary.discountMinor > 0 ? (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('checkout.discount')}</Text>
            <Text testID="checkout-discount-amount" style={styles.discountValue}>
              −{formatMoneyMinor(summary.discountMinor)}
            </Text>
          </View>
        ) : null}
        <View style={styles.totalRow}>
          <Text style={styles.grandLabel}>{t('checkout.total')}</Text>
          <Text testID="checkout-total" style={styles.grandValue}>
            {formatMoneyMinor(summary.totalMinor)}
          </Text>
        </View>
      </GlassCard>

      <Button
        testID="checkout-confirm"
        label={t('checkout.confirmOrder')}
        variant="primary"
        block
        onPress={handleConfirm}
      />

      <Disclaimer>{t('checkout.disclaimer')}</Disclaimer>
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    header: { gap: 2, marginBottom: 4 },
    section: { gap: 10 },
    empty: { gap: 12, alignItems: 'flex-start' },
    emptyText: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 20,
    },
    lineRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 4,
    },
    lineTitle: {
      flex: 1,
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.text,
    },
    linePrice: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      color: colors.text,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontFamily: fonts.sans,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.card,
    },
    errorText: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.danger,
    },
    successText: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.success,
    },
    totals: { gap: 8 },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    totalLabel: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.textSecondary,
    },
    totalValue: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.text,
    },
    discountValue: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      color: colors.success,
    },
    grandLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 16,
      color: colors.text,
    },
    grandValue: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 18,
      color: colors.accent,
    },
  });
}
