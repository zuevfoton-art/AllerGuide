import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import type { CatalogProduct, Profile } from '@allerguide/core';
import { searchRecommendedProducts } from '@/src/services/product-service';

export function useMarketplaceProducts(profile: Profile | null | undefined, query = '') {
  const [items, setItems] = useState<CatalogProduct[]>([]);

  const refresh = useCallback(() => {
    setItems(searchRecommendedProducts(profile, query));
  }, [profile, query]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return { items, refresh };
}
