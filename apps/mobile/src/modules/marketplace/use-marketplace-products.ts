import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import type { MarketplaceCategory, MarketplaceProduct, Profile } from '@allerguide/core';
import { trackEvent } from '@/src/services/analytics-service';
import {
  loadMarketplaceCatalog,
  searchRecommendedMarketplaceProducts,
} from '@/src/services/product-service';

export function useMarketplaceProducts(
  profile: Profile | null | undefined,
  query = '',
  category: MarketplaceCategory | 'all' = 'all',
) {
  const [catalog, setCatalog] = useState<MarketplaceProduct[]>([]);
  const [items, setItems] = useState<MarketplaceProduct[]>([]);
  const [source, setSource] = useState<'api' | 'cache' | 'seed'>('seed');
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async (mode: 'focus' | 'pull' = 'focus') => {
    if (mode === 'pull') setRefreshing(true);
    else setLoading(true);
    try {
      const loaded = await loadMarketplaceCatalog();
      setCatalog(loaded.items);
      setSource(loaded.source);
      setStale(loaded.stale);
      trackEvent('market_impression', {
        count: loaded.items.length,
        source: loaded.source,
        stale: loaded.stale,
        product_kind: loaded.items.some((product) => product.kind === 'medicine')
          ? 'mixed'
          : 'regular',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setItems(searchRecommendedMarketplaceProducts(catalog, profile, query, category));
  }, [catalog, profile, query, category]);

  useFocusEffect(
    useCallback(() => {
      void refresh('focus');
    }, [refresh]),
  );

  return {
    items,
    catalog,
    source,
    stale,
    loading,
    refreshing,
    refresh: () => void refresh('pull'),
  };
}
