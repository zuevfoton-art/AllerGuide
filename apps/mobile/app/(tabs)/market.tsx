import { Text, View, StyleSheet, Pressable } from 'react-native';
import { useEffect, useMemo } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/Screen';
import { ScreenEyebrow } from '@/src/components/ScreenEyebrow';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { MarketplaceModule } from '@/src/modules/marketplace';
import { ProfileHeaderButton } from '@/src/components/ProfileHeaderButton';
import { MARKETPLACE_CHECKOUT_ENABLED } from '@/src/constants/features';
import { useCartStore } from '@/src/store/cart-store';

export default function MarketScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const ui = useUiStyles();
  const { t } = useTranslation();
  const hydrate = useCartStore((s) => s.hydrate);
  const totalQuantity = useCartStore((s) => s.totalQuantity());

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ScreenEyebrow section={t('market.eyebrow')} />
          <Text style={ui.docTitle}>{t('market.title')}</Text>
          <Text style={ui.docMeta}>{t('market.subtitle')}</Text>
        </View>
        <View style={styles.headerActions}>
          {MARKETPLACE_CHECKOUT_ENABLED ? (
            <Pressable
              testID="market-open-checkout"
              style={styles.cartButton}
              onPress={() => router.push('/market-checkout' as any)}
              accessibilityRole="button"
              accessibilityLabel={t('market.checkout')}>
              <Ionicons name="cart-outline" size={22} color={theme.colors.accent} />
              {totalQuantity > 0 ? (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{totalQuantity}</Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}
          <ProfileHeaderButton />
        </View>
      </View>

      <ProfileSwitcher />

      <MarketplaceModule variant="full" />
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    headerText: { flex: 1, gap: 2 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cartButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentLight,
    },
    cartBadge: {
      position: 'absolute',
      top: 2,
      right: 2,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    cartBadgeText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 10,
      color: colors.onAccent,
    },
  });
}
