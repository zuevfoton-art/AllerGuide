import { createHash } from 'node:crypto';
import type { ScanResult } from '@allerguide/ai';
import { getRedisClient, isRedisConfigured } from './redis-client';
import { logCaughtError } from './log-caught-error';

interface CacheEntry {
  value: ScanResult;
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

let cacheHits = 0;
let cacheMisses = 0;
let budgetRejections = 0;

const SCAN_CACHE_PREFIX = 'scan:';

export interface ScanCacheKeyInput {
  mode: string;
  text: string;
  allergens: string[];
  productName?: string;
  prompt?: string;
}

/** Deterministic cache key — identical scans (same allergen set) reuse one LLM call. */
export function scanCacheKey(input: ScanCacheKeyInput): string {
  const normalized = {
    mode: input.mode,
    text: input.text.trim().toLowerCase(),
    allergens: [...input.allergens].map((a) => a.toLowerCase()).sort(),
    productName: input.productName?.trim().toLowerCase() ?? '',
    prompt: input.prompt ?? '',
  };
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

async function getRedisCachedScan(key: string): Promise<ScanResult | null> {
  const redis = await getRedisClient();
  if (!redis) return null;

  const raw = await redis.get(`${SCAN_CACHE_PREFIX}${key}`);
  if (!raw) return null;

  try {
    const entry = JSON.parse(raw) as CacheEntry;
    if (entry.expiresAt < Date.now()) {
      await redis.del(`${SCAN_CACHE_PREFIX}${key}`);
      return null;
    }
    return entry.value;
  } catch (error) {
    logCaughtError('scanCache.parseRedisEntry', error, { key });
    return null;
  }
}

async function setRedisCachedScan(key: string, value: ScanResult): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;

  const ttlMs = envNumber('SCAN_CACHE_TTL_MS', 24 * 60 * 60 * 1000);
  const entry: CacheEntry = { value, expiresAt: Date.now() + ttlMs };
  const ttlSeconds = Math.ceil(ttlMs / 1000);
  await redis.setEx(`${SCAN_CACHE_PREFIX}${key}`, ttlSeconds, JSON.stringify(entry));
}

export async function getCachedScan(key: string): Promise<ScanResult | null> {
  if (isRedisConfigured()) {
    const redisHit = await getRedisCachedScan(key);
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

export async function setCachedScan(key: string, value: ScanResult): Promise<void> {
  const ttlMs = envNumber('SCAN_CACHE_TTL_MS', 24 * 60 * 60 * 1000);
  const maxSize = envNumber('SCAN_CACHE_MAX', 1000);

  memoryCache.set(key, { value, expiresAt: Date.now() + ttlMs });

  while (memoryCache.size > maxSize) {
    const oldest = memoryCache.keys().next().value;
    if (oldest === undefined) break;
    memoryCache.delete(oldest);
  }

  if (isRedisConfigured()) {
    await setRedisCachedScan(key, value);
  }
}

export function clearScanCache(): void {
  memoryCache.clear();
}

export function recordCacheHit(): void {
  cacheHits += 1;
}

export function recordCacheMiss(): void {
  cacheMisses += 1;
}

export function recordBudgetRejection(): void {
  budgetRejections += 1;
}

export function getScanMetrics(): {
  cacheEntries: number;
  cacheHits: number;
  cacheMisses: number;
  budgetRejections: number;
  hitRate: number | null;
  dailyBudget: number;
  store: 'redis' | 'memory';
} {
  const total = cacheHits + cacheMisses;
  return {
    cacheEntries: memoryCache.size,
    cacheHits,
    cacheMisses,
    budgetRejections,
    hitRate: total > 0 ? Math.round((cacheHits / total) * 1000) / 1000 : null,
    dailyBudget: envNumber('SCAN_DAILY_BUDGET', 100),
    store: isRedisConfigured() ? 'redis' : 'memory',
  };
}

export function resetScanMetrics(): void {
  cacheHits = 0;
  cacheMisses = 0;
  budgetRejections = 0;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function consumeScanBudget(identity: string): boolean {
  const max = envNumber('SCAN_DAILY_BUDGET', 100);
  const day = today();
  const entry = budget.get(identity);

  if (!entry || entry.day !== day) {
    budget.set(identity, { day, count: 1 });
    return true;
  }

  if (entry.count >= max) {
    return false;
  }

  entry.count += 1;
  return true;
}

export function resetScanBudget(): void {
  budget.clear();
}

export function resetScanState(): void {
  clearScanCache();
  resetScanBudget();
  resetScanMetrics();
}
