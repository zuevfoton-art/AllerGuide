import { Text, View, StyleSheet } from 'react-native';
import { useMemo, useState } from 'react';
import type { MarketplaceCategory } from '@allerguide/core';
import { Screen } from '@/src/components/Screen';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { MarketplaceModule } from '@/src/modules/marketplace';
import { useMarketplaceProducts } from '@/src/modules/marketplace/use-marketplace-products';
import { ProfileHeaderButton } from '@/src/components/ProfileHeaderButton';
import { useAppStore } from '@/src/store/app-store';

export default function MarketScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const ui = useUiStyles();
  const { t } = useTranslation();
  const profile = useAppStore((s) => s.activeProfile);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<MarketplaceCategory | 'all'>('all');
  const catalog = useMarketplaceProducts(profile, query, category);

  return (
    <Screen
      brandHeaderRight={<ProfileHeaderButton />}
      refreshing={catalog.refreshing}
      onRefresh={catalog.refresh}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={ui.docTitle}>{t('market.title')}</Text>
        </View>
      </View>

      <MarketplaceModule
        variant="full"
        catalog={catalog}
        query={query}
        onQueryChange={setQuery}
        category={category}
        onCategoryChange={setCategory}
      />
    </Screen>
  );
}

function createStyles(_theme: AppTheme) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    headerText: { flex: 1, gap: 2 },
  });
}
