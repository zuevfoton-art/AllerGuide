import { Text, View, StyleSheet, TextInput } from 'react-native';
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
import { GlassCard } from '@/src/components/GlassCard';
import { Disclaimer } from '@/src/components/Disclaimer';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { Ionicons } from '@expo/vector-icons';
import type { CatalogProduct } from '@allerguide/core';
import { useAppStore } from '@/src/store/app-store';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { searchRecommendedProducts } from '@/src/services/product-service';

function getProductColor(theme: AppTheme, key: CatalogProduct['colorKey']) {
  const map = {
    purple: theme.colors.purple,
    pink: theme.colors.pink,
    accent: theme.colors.accent,
    success: theme.colors.success,
    warning: theme.colors.warning,
  };
  return map[key];
}

export default function MarketScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const ui = useUiStyles();
  const { t } = useTranslation();
  const profile = useAppStore((s) => s.activeProfile);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<CatalogProduct[]>([]);

  const refresh = useCallback(() => {
    setItems(searchRecommendedProducts(profile, query));
  }, [profile, query]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={ui.docLabel}>AllerGuide · {t('market.eyebrow')}</Text>
        <Text style={ui.docTitle}>{t('market.title')}</Text>
        <Text style={ui.docMeta}>{t('market.subtitle')}</Text>
      </View>

      <ProfileSwitcher />

      <GlassCard style={styles.searchCard}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={theme.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={t('market.searchPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
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
        items.map((item) => {
          const color = getProductColor(theme, item.colorKey);
          return (
            <GlassCard key={item.id} style={styles.card}>
              <View style={[styles.cardIcon, { backgroundColor: `${color}18` }]}>
                <Ionicons name={item.icon as any} size={24} color={color} />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <View style={[styles.tag, { backgroundColor: `${color}18` }]}>
                    <Text style={[styles.tagText, { color }]}>{item.tag}</Text>
                  </View>
                </View>
                <Text style={styles.cardWhy}>{item.why}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
            </GlassCard>
          );
        })
      )}

      <Disclaimer>{t('market.disclaimer')}</Disclaimer>
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    header: { gap: 2 },
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
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 0,
    },
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardBody: { flex: 1, gap: 6 },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    cardTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    tag: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 4 },
    tagText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 11,
      fontWeight: '600',
    },
    cardWhy: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
  });
}
