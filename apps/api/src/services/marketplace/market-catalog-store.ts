import { eq } from 'drizzle-orm';
import {
  publishedMarketplaceSeed,
  type MarketplaceOffer,
  type MarketplaceProduct,
} from '@allerguide/core';
import { db, readDb } from '../../db';
import { marketOffers, marketProducts, type MarketOfferRow, type MarketProductRow } from '../../db/catalog-schema';
import { marketplaceOfferId } from './normalize-offer';

export function isMarketDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function listSeedMarketplaceProducts(): MarketplaceProduct[] {
  return publishedMarketplaceSeed();
}

export async function listPublishedMarketplaceProducts(): Promise<{
  products: MarketplaceProduct[];
  source: 'db' | 'seed';
}> {
  if (!isMarketDatabaseConfigured()) {
    return { products: listSeedMarketplaceProducts(), source: 'seed' };
  }

  try {
    const productRows = await readDb
      .select()
      .from(marketProducts)
      .where(eq(marketProducts.moderationStatus, 'published'));
    if (productRows.length === 0) {
      return { products: listSeedMarketplaceProducts(), source: 'seed' };
    }

    const offerRows = await readDb.select().from(marketOffers);
    const offersByProduct = new Map<string, MarketplaceOffer[]>();
    for (const row of offerRows) {
      const list = offersByProduct.get(row.productId) ?? [];
      list.push(offerRowToOffer(row));
      offersByProduct.set(row.productId, list);
    }

    const products = productRows
      .map((row) => productRowToProduct(row, offersByProduct.get(row.id) ?? []))
      .filter((product) => product.offers.length > 0 && !product.prescriptionOnly);

    if (products.length === 0) {
      return { products: listSeedMarketplaceProducts(), source: 'seed' };
    }
    return { products, source: 'db' };
  } catch {
    return { products: listSeedMarketplaceProducts(), source: 'seed' };
  }
}

/** Seed / curator write: `publish` forces published; otherwise keep an already-live row live. */
export function resolveMarketplaceWriteStatus(
  currentStatus: string | undefined,
  publish: boolean,
): 'draft' | 'published' {
  if (publish) return 'published';
  return currentStatus === 'published' ? 'published' : 'draft';
}

export async function upsertMarketplaceDraft(
  product: MarketplaceProduct,
  options?: { publish?: boolean },
): Promise<void> {
  const now = new Date();
  const existing = await db
    .select()
    .from(marketProducts)
    .where(eq(marketProducts.id, product.id))
    .limit(1);
  const current = existing[0];

  const nextStatus = resolveMarketplaceWriteStatus(current?.moderationStatus, Boolean(options?.publish));
  const forAllergenIds = current?.forAllergenIds ?? product.forAllergenIds;
  const containsAllergenIds = current?.containsAllergenIds ?? product.containsAllergenIds;
  const why = current?.why?.trim() ? current.why : product.why;

  await db
    .insert(marketProducts)
    .values({
      id: product.id,
      provider: product.provider,
      providerSku: product.offers[0]?.sku ?? product.id,
      title: product.title,
      why,
      imageUrl: product.imageUrl,
      icon: product.icon,
      category: product.category,
      kind: product.kind,
      colorKey: product.colorKey,
      forAllergenIds,
      containsAllergenIds,
      moderationStatus: nextStatus,
      prescriptionOnly: product.prescriptionOnly,
      showPrice: product.showPrice,
      priceRub: product.showPrice ? product.priceRub : null,
      refreshedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: marketProducts.id,
      set: {
        title: product.title,
        imageUrl: product.imageUrl,
        category: product.category,
        kind: product.kind,
        prescriptionOnly: product.prescriptionOnly,
        showPrice: product.showPrice,
        priceRub: product.showPrice ? product.priceRub : null,
        refreshedAt: now,
        updatedAt: now,
        why,
        forAllergenIds,
        containsAllergenIds,
        moderationStatus: nextStatus,
      },
    });

  for (const offer of product.offers) {
    const offerId = marketplaceOfferId(product.id, offer.merchant, offer.url);
    await db
      .insert(marketOffers)
      .values({
        id: offerId,
        productId: product.id,
        merchant: offer.merchant,
        url: offer.url,
        sku: offer.sku,
        erid: offer.erid,
        priceRub: product.showPrice ? offer.priceRub : null,
        photoUrl: offer.photoUrl,
        inStock: offer.inStock ?? true,
        refreshedAt: now,
      })
      .onConflictDoUpdate({
        target: marketOffers.id,
        set: {
          url: offer.url,
          priceRub: product.showPrice ? offer.priceRub : null,
          photoUrl: offer.photoUrl,
          inStock: offer.inStock ?? true,
          refreshedAt: now,
        },
      });
  }
}

function productRowToProduct(row: MarketProductRow, offers: MarketplaceOffer[]): MarketplaceProduct {
  return {
    id: row.id,
    title: row.title,
    why: row.why,
    imageUrl: row.imageUrl,
    icon: row.icon,
    category: row.category as MarketplaceProduct['category'],
    kind: row.kind as MarketplaceProduct['kind'],
    provider: row.provider as MarketplaceProduct['provider'],
    colorKey: row.colorKey as MarketplaceProduct['colorKey'],
    forAllergenIds: row.forAllergenIds ?? [],
    containsAllergenIds: row.containsAllergenIds ?? [],
    moderationStatus: row.moderationStatus as MarketplaceProduct['moderationStatus'],
    prescriptionOnly: row.prescriptionOnly,
    showPrice: row.showPrice,
    priceRub: row.priceRub ?? undefined,
    offers,
    refreshedAt: row.refreshedAt.toISOString(),
  };
}

function offerRowToOffer(row: MarketOfferRow): MarketplaceOffer {
  return {
    merchant: row.merchant as MarketplaceOffer['merchant'],
    url: row.url,
    sku: row.sku ?? undefined,
    erid: row.erid ?? undefined,
    priceRub: row.priceRub ?? undefined,
    photoUrl: row.photoUrl ?? undefined,
    refreshedAt: row.refreshedAt.toISOString(),
    inStock: row.inStock,
  };
}
