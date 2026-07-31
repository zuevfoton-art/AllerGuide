/**
 * In-memory (+ optional Redis) cache and daily budget for /api/search/ingredients.
 * Mirrors scan-cache patterns without coupling to ScanResult types.
 */
import { createHash } from 'node:crypto';
import { getRedisClient, isRedisConfigured } from './redis-client';
import { logCaughtError } from './log-caught-error';

export interface CachedIngredientsResult {
  query: string;
  productName: string;
  ingredients: string;
  source: 'yandex_gen' | 'yandex_web';
}

interface CacheEntry {
  value: CachedIngredientsResult;
  expiresAt: number;
}

interface BudgetEntry {
  day: string;
  count: number;
}

function envNumber(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const memoryCache = new Map<string, CacheEntry>();
const budget = new Map<string, BudgetEntry>();
const SEARCH_CACHE_PREFIX = 'search-ing:';

let cacheHits = 0;
let cacheMisses = 0;
let budgetRejections = 0;

export function searchIngredientsCacheKey(query: string): string {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, ' ');
  return createHash('sha256').update(normalized).digest('hex');
}

async function getRedisCached(key: string): Promise<CachedIngredientsResult | null> {
  const redis = await getRedisClient();
  if (!redis) return null;

  const raw = await redis.get(`${SEARCH_CACHE_PREFIX}${key}`);
  if (!raw) return null;

  try {
    const entry = JSON.parse(raw) as CacheEntry;
    if (entry.expiresAt < Date.now()) {
      await redis.del(`${SEARCH_CACHE_PREFIX}${key}`);
      return null;
    }
    return entry.value;
  } catch (error) {
    logCaughtError('searchIngredientsCache.parseRedisEntry', error, { key });
    return null;
  }
}

async function setRedisCached(key: string, value: CachedIngredientsResult): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;

  const ttlMs = envNumber('SEARCH_CACHE_TTL_MS', envNumber('SCAN_CACHE_TTL_MS', 24 * 60 * 60 * 1000));
  const entry: CacheEntry = { value, expiresAt: Date.now() + ttlMs };
  await redis.setEx(
    `${SEARCH_CACHE_PREFIX}${key}`,
    Math.ceil(ttlMs / 1000),
    JSON.stringify(entry),
  );
}

export async function getCachedIngredients(
  key: string,
): Promise<CachedIngredientsResult | null> {
  if (isRedisConfigured()) {
    const redisHit = await getRedisCached(key);
    if (redisHit) return redisHit;
  }

  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  memoryCache.delete(key);
  memoryCache.set(key, entry);
  return entry.value;
}

export async function setCachedIngredients(
  key: string,
  value: CachedIngredientsResult,
): Promise<void> {
  const ttlMs = envNumber('SEARCH_CACHE_TTL_MS', envNumber('SCAN_CACHE_TTL_MS', 24 * 60 * 60 * 1000));
  const maxSize = envNumber('SEARCH_CACHE_MAX', envNumber('SCAN_CACHE_MAX', 1000));

  memoryCache.set(key, { value, expiresAt: Date.now() + ttlMs });
  while (memoryCache.size > maxSize) {
    const oldest = memoryCache.keys().next().value;
    if (oldest === undefined) break;
    memoryCache.delete(oldest);
  }

  if (isRedisConfigured()) {
    await setRedisCached(key, value);
  }
}

export function recordSearchCacheHit(): void {
  cacheHits += 1;
}

export function recordSearchCacheMiss(): void {
  cacheMisses += 1;
}

export function recordSearchBudgetRejection(): void {
  budgetRejections += 1;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function consumeSearchBudget(identity: string): boolean {
  const max = envNumber('SEARCH_DAILY_BUDGET', envNumber('SCAN_DAILY_BUDGET', 100));
  const day = today();
  const entry = budget.get(identity);

  if (!entry || entry.day !== day) {
    budget.set(identity, { day, count: 1 });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

export function getSearchIngredientsMetrics(): {
  cacheEntries: number;
  cacheHits: number;
  cacheMisses: number;
  budgetRejections: number;
  dailyBudget: number;
} {
  return {
    cacheEntries: memoryCache.size,
    cacheHits,
    cacheMisses,
    budgetRejections,
    dailyBudget: envNumber('SEARCH_DAILY_BUDGET', envNumber('SCAN_DAILY_BUDGET', 100)),
  };
}

export function resetSearchIngredientsState(): void {
  memoryCache.clear();
  budget.clear();
  cacheHits = 0;
  cacheMisses = 0;
  budgetRejections = 0;
}
