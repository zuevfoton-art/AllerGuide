import { createHash } from 'node:crypto';
import type { ScanResult } from '@allerguide/ai';

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

const cache = new Map<string, CacheEntry>();
const budget = new Map<string, BudgetEntry>();

let cacheHits = 0;
let cacheMisses = 0;
let budgetRejections = 0;

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

export function getCachedScan(key: string): ScanResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  // refresh LRU ordering
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

export function setCachedScan(key: string, value: ScanResult): void {
  const ttlMs = envNumber('SCAN_CACHE_TTL_MS', 24 * 60 * 60 * 1000);
  const maxSize = envNumber('SCAN_CACHE_MAX', 1000);

  cache.set(key, { value, expiresAt: Date.now() + ttlMs });

  while (cache.size > maxSize) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

export function clearScanCache(): void {
  cache.clear();
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
} {
  const total = cacheHits + cacheMisses;
  return {
    cacheEntries: cache.size,
    cacheHits,
    cacheMisses,
    budgetRejections,
    hitRate: total > 0 ? Math.round((cacheHits / total) * 1000) / 1000 : null,
    dailyBudget: envNumber('SCAN_DAILY_BUDGET', 100),
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

/**
 * Per-identity (user id or IP) daily budget for billable LLM calls. Returns
 * false when the caller has exhausted SCAN_DAILY_BUDGET for the current UTC day.
 * Only call this on a real cache miss so cached responses stay free.
 */
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
