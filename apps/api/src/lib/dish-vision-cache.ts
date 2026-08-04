import { createHash } from 'node:crypto';
import type { DishVisionResult } from '@allerguide/ai';

interface CacheEntry {
  value: DishVisionResult;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry>();

function envNumber(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function ttlMs(): number {
  return envNumber('DISH_VISION_CACHE_TTL_MS', envNumber('SCAN_CACHE_TTL_MS', 24 * 60 * 60 * 1000));
}

function maxEntries(): number {
  return envNumber('DISH_VISION_CACHE_MAX', envNumber('SCAN_CACHE_MAX', 500));
}

export function dishVisionCacheKey(imageBase64: string, mimeType?: string): string {
  return createHash('sha256')
    .update(`${mimeType ?? 'image/jpeg'}\n${imageBase64.trim()}`)
    .digest('hex');
}

export function getCachedDishVision(key: string): DishVisionResult | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

export function setCachedDishVision(key: string, value: DishVisionResult): void {
  if (memoryCache.size >= maxEntries()) {
    const oldest = memoryCache.keys().next().value;
    if (oldest) memoryCache.delete(oldest);
  }
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlMs() });
}

export function resetDishVisionCache(): void {
  memoryCache.clear();
}
