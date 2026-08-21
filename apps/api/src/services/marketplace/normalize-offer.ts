import { createHash } from 'node:crypto';
import {
  canPublishMarketplaceProduct,
  type MarketplaceProduct,
  type MarketplaceProvider,
} from '@allerguide/core';
import { guessYandexCategory, type ParsedFeedOffer } from './yandex-yml-parser';

export interface FeedImportCandidate {
  product: MarketplaceProduct;
  publishable: boolean;
  reasons: string[];
}

export function marketplaceProductId(provider: MarketplaceProvider, sku: string): string {
  return createHash('sha256').update(`${provider}:${sku}`).digest('hex').slice(0, 24);
}

export function marketplaceOfferId(productId: string, merchant: string, url: string): string {
  return createHash('sha256').update(`${productId}:${merchant}:${url}`).digest('hex').slice(0, 24);
}

export function shouldSkipYandexAsMedicine(offer: ParsedFeedOffer): boolean {
  return offer.prescriptionHint || guessYandexCategory(offer) === 'pharmacy';
}

export function toYandexDraft(offer: ParsedFeedOffer, refreshedAt: string): FeedImportCandidate {
  const product: MarketplaceProduct = {
    id: marketplaceProductId('yandex_market', offer.sku),
    title: offer.title,
    why: '',
    imageUrl: offer.imageUrl,
    icon: 'basket',
    category: guessYandexCategory(offer),
    kind: 'regular',
    provider: 'yandex_market',
    colorKey: 'accent',
    forAllergenIds: [],
    containsAllergenIds: [],
    moderationStatus: 'draft',
    prescriptionOnly: offer.prescriptionHint,
    showPrice: true,
    priceRub: offer.priceRub,
    offers: [
      {
        merchant: 'yandex_market',
        url: offer.url,
        sku: offer.sku,
        priceRub: offer.priceRub,
        photoUrl: offer.imageUrl,
        refreshedAt,
        inStock: true,
      },
    ],
    refreshedAt,
  };

  const verdict = canPublishMarketplaceProduct(product);
  return { product, publishable: verdict.canPublish, reasons: verdict.reasons };
}

export function toPharmacyDraft(offer: ParsedFeedOffer, refreshedAt: string): FeedImportCandidate {
  const product: MarketplaceProduct = {
    id: marketplaceProductId('pharmacy', offer.sku),
    title: offer.title,
    why: 'Безрецептурный аптечный товар. Не является персональной рекомендацией.',
    imageUrl: offer.imageUrl,
    icon: 'medkit',
    category: 'pharmacy',
    kind: 'medicine',
    provider: 'pharmacy',
    colorKey: 'warning',
    forAllergenIds: [],
    containsAllergenIds: [],
    moderationStatus: 'draft',
    prescriptionOnly: offer.prescriptionHint,
    showPrice: false,
    priceRub: undefined,
    offers: [
      {
        merchant: 'pharmacy',
        url: offer.url,
        sku: offer.sku,
        photoUrl: offer.imageUrl,
        refreshedAt,
        inStock: true,
      },
    ],
    refreshedAt,
  };

  const verdict = canPublishMarketplaceProduct(product);
  return { product, publishable: verdict.canPublish, reasons: verdict.reasons };
}
