import { logCaughtError } from '../../lib/log-caught-error';
import { parsePharmacyFeed } from './pharmacy-feed-parser';
import { parseYandexYmlFeed } from './yandex-yml-parser';
import { isMarketDatabaseConfigured, upsertMarketplaceDraft } from './market-catalog-store';
import {
  shouldSkipYandexAsMedicine,
  toPharmacyDraft,
  toYandexDraft,
} from './normalize-offer';

export interface MarketImportStats {
  provider: 'yandex_market' | 'pharmacy';
  fetched: number;
  imported: number;
  skipped: number;
  persisted: boolean;
}

export function isYandexFeedConfigured(): boolean {
  return Boolean(process.env.YANDEX_MARKET_FEED_URL?.trim());
}

export function isPharmacyFeedConfigured(): boolean {
  return (
    process.env.MARKET_PHARMACY_FEED_ENABLED === 'true' &&
    Boolean(process.env.MARKET_PHARMACY_FEED_URL?.trim())
  );
}

export async function importConfiguredMarketFeeds(): Promise<MarketImportStats[]> {
  const stats: MarketImportStats[] = [];
  if (isYandexFeedConfigured()) {
    stats.push(await importYandexMarketFeed());
  }
  if (isPharmacyFeedConfigured()) {
    stats.push(await importPharmacyFeed());
  }
  return stats;
}

export async function importYandexMarketFeed(feedXml?: string): Promise<MarketImportStats> {
  const xml = feedXml ?? (await fetchTextFeed(process.env.YANDEX_MARKET_FEED_URL));
  const offers = parseYandexYmlFeed(xml);
  const refreshedAt = new Date().toISOString();
  let imported = 0;
  let skipped = 0;
  const persist = isMarketDatabaseConfigured() && !feedXml;

  for (const offer of offers) {
    if (shouldSkipYandexAsMedicine(offer)) {
      skipped += 1;
      continue;
    }
    const draft = toYandexDraft(offer, refreshedAt);
    if (persist) {
      await upsertMarketplaceDraft(draft.product);
    }
    imported += 1;
  }

  return {
    provider: 'yandex_market',
    fetched: offers.length,
    imported,
    skipped,
    persisted: persist,
  };
}

export async function importPharmacyFeed(feedRaw?: string): Promise<MarketImportStats> {
  const raw = feedRaw ?? (await fetchTextFeed(process.env.MARKET_PHARMACY_FEED_URL));
  const offers = parsePharmacyFeed(raw);
  const refreshedAt = new Date().toISOString();
  let imported = 0;
  let skipped = 0;
  const persist = isMarketDatabaseConfigured() && !feedRaw;

  for (const offer of offers) {
    const draft = toPharmacyDraft(offer, refreshedAt);
    if (draft.product.prescriptionOnly) {
      skipped += 1;
      continue;
    }
    if (persist) {
      await upsertMarketplaceDraft(draft.product);
    }
    imported += 1;
  }

  return {
    provider: 'pharmacy',
    fetched: offers.length,
    imported,
    skipped,
    persisted: persist,
  };
}

async function fetchTextFeed(url: string | undefined): Promise<string> {
  const trimmed = url?.trim();
  if (!trimmed) return '';

  const response = await fetch(trimmed, {
    headers: { Accept: 'application/xml, text/xml, application/json, */*' },
  });
  if (!response.ok) {
    logCaughtError('market.feed.fetch', new Error(`HTTP ${response.status}`), { level: 'warn' });
    return '';
  }
  return response.text();
}
