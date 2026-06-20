import { Text, View, StyleSheet, Pressable, TextInput } from 'react-native';
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
import { Ionicons } from '@expo/vector-icons';
import type { CatalogProduct } from '@allerguide/core';
import { useAppStore } from '@/src/store/app-store';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
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
        <Text style={styles.title}>Маркет</Text>
        <Text style={styles.subtitle}>Товары для аллергиков</Text>
      </View>

      <ProfileSwitcher />

      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Поиск по каталогу…"
          placeholderTextColor={theme.colors.textMuted}
          onSubmitEditing={refresh}
        />
      </View>

      <View style={styles.banner}>
        <Ionicons name="star" size={18} color={theme.colors.warning} />
        <Text style={styles.bannerText}>
          Подборка на основе профиля аллергий — скрыты товары с конфликтующими аллергенами
        </Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="basket-outline" size={36} color={theme.colors.textMuted} />
          <Text style={styles.emptyText}>Ничего не найдено. Попробуйте другой запрос.</Text>
        </View>
      ) : (
        items.map((item) => {
          const color = getProductColor(theme, item.colorKey);
          return (
            <Pressable
              key={item.id}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
              <View style={[styles.cardIcon, { backgroundColor: `${color}18` }]}>
                <Ionicons name={item.icon as any} size={26} color={color} />
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
            </Pressable>
          );
        })
      )}

      <Text style={styles.disclaimer}>
        Рекомендации основаны на общих характеристиках товара и не заменяют назначения врача.
      </Text>
    </Screen>
  );
}

function createStyles({ colors, shadows }: AppTheme) {
  return StyleSheet.create({
    header: { gap: 3 },
    title: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
    subtitle: { fontSize: 14, color: colors.textSecondary },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.card,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: { flex: 1, fontSize: 15, color: colors.text },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.warningLight,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.warningBorder,
    },
    bannerText: { fontSize: 13, color: colors.warningText, fontWeight: '500', flex: 1 },
    empty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
    emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      ...(shadows.md as object),
    },
    pressed: { opacity: 0.85 },
    cardIcon: {
      width: 54,
      height: 54,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardBody: { flex: 1, gap: 6 },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    tag: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8 },
    tagText: { fontSize: 11, fontWeight: '700' },
    cardWhy: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    disclaimer: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
  });
}
