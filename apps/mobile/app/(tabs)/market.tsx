import { useState } from 'react';
import type { MarketplaceCategory } from '@allerguide/core';
import { Screen } from '@/src/components/Screen';
import { TabScreenHeader } from '@/src/components/TabScreenHeader';
import { useTranslation } from '@/src/store/locale-store';
import { MarketplaceModule } from '@/src/modules/marketplace';
import { useMarketplaceProducts } from '@/src/modules/marketplace/use-marketplace-products';
import { ProfileHeaderButton } from '@/src/components/ProfileHeaderButton';
import { useAppStore } from '@/src/store/app-store';

export default function MarketScreen() {
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
      <TabScreenHeader
        eyebrow={t('market.eyebrow')}
        title={t('market.title')}
        meta={t('market.subtitle')}
      />

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
