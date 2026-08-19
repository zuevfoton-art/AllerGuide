import { Platform } from 'react-native';
import {
  MARKETPLACE_CACHE_TTL_MS,
  isCatalogCacheFresh,
  type MarketplaceProduct,
} from '@allerguide/core';
import { getDb } from '@/src/db/init';
import { loadJson, saveJson } from '@/src/db/web-store';
import { logCaughtError } from '@/src/services/error-reporting';

const WEB_KEY = 'ag_market_catalog';

export interface MarketCatalogSnapshot {
  fetchedAt: string;
  source: 'api' | 'seed' | 'cache';
  products: MarketplaceProduct[];
}

function isWebStorageBackend(): boolean {
  return Platform.OS === 'web';
}

export function getCachedMarketCatalog(): MarketCatalogSnapshot | null {
  return readMarketCatalogSnapshot();
}

export function getFreshMarketCatalog(ttlMs = MARKETPLACE_CACHE_TTL_MS): MarketCatalogSnapshot | null {
  const snapshot = readMarketCatalogSnapshot();
  if (!snapshot || !isCatalogCacheFresh(snapshot.fetchedAt, ttlMs)) return null;
  return snapshot;
}

export function saveMarketCatalogSnapshot(
  products: MarketplaceProduct[],
  source: MarketCatalogSnapshot['source'],
): MarketCatalogSnapshot {
  const snapshot: MarketCatalogSnapshot = {
    fetchedAt: new Date().toISOString(),
    source,
    products,
  };

  if (isWebStorageBackend()) {
    saveJson(WEB_KEY, snapshot);
    return snapshot;
  }

  getDb().runSync(
    `INSERT OR REPLACE INTO market_catalog_snapshot (id, payload, fetched_at, source)
     VALUES (1, ?, ?, ?)`,
    [JSON.stringify(products), snapshot.fetchedAt, source],
  );
  return snapshot;
}

function readMarketCatalogSnapshot(): MarketCatalogSnapshot | null {
  if (isWebStorageBackend()) {
    return loadJson<MarketCatalogSnapshot | null>(WEB_KEY, null);
  }

  const row = getDb().getFirstSync<{ payload: string; fetched_at: string; source: string }>(
    'SELECT payload, fetched_at, source FROM market_catalog_snapshot WHERE id = 1',
  );
  if (!row) return null;

  try {
    const products = JSON.parse(row.payload) as MarketplaceProduct[];
    if (!Array.isArray(products)) return null;
    return {
      fetchedAt: row.fetched_at,
      source: row.source as MarketCatalogSnapshot['source'],
      products,
    };
  } catch (error) {
    logCaughtError('getCachedMarketCatalog.parsePayload', error, { level: 'warn' });
    return null;
  }
}
