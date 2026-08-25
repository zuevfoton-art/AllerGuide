import { publishedMarketplaceSeed } from '@allerguide/core';
import { upsertMarketplaceDraft } from '../services/marketplace/market-catalog-store';
import { closeDb } from './index';

/**
 * Writes the bundled marketplace catalog into `catalog.market_products` /
 * `catalog.market_offers` as published. Idempotent: curator allergen tags
 * already stored on a row are kept (see `upsertMarketplaceDraft`).
 */
export async function seedMarketplaceCatalog(): Promise<{ products: number; offers: number }> {
  const products = publishedMarketplaceSeed();
  if (products.length === 0) {
    throw new Error('Bundled marketplace seed is empty');
  }

  let offers = 0;
  for (const product of products) {
    await upsertMarketplaceDraft(product, { publish: true });
    offers += product.offers.length;
  }

  return { products: products.length, offers };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedMarketplaceCatalog()
    .then((result) => {
      console.log(`Seeded ${result.products} published market products, ${result.offers} offers.`);
    })
    .catch((error) => {
      console.error('Market seed failed:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      closeDb();
    });
}
