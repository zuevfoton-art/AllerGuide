import postgres from 'postgres';
import { buildConnectionOptions, isNeonPoolerUrl, resolveRuntimeUrl } from '../db/config';
import { getScanMetrics } from './scan-cache';
import { pingRedis } from './redis-client';
import { resolveRateLimitStoreKind } from './rate-limit-store';
import { dishVisionConfigured } from '../services/llm-dish-vision-provider';

export interface ScanHealthMetrics {
  enabled: boolean;
  cacheEntries: number;
  cacheHits: number;
  cacheMisses: number;
  budgetRejections: number;
  hitRate: number | null;
  dailyBudget: number;
}

export interface HealthCheckResult {
  ok: boolean;
  authDatabase: boolean;
  features?: {
    sync: boolean;
    aiScan: boolean;
    aiScanProvider?: 'yandex' | 'openai';
    ycOcr?: boolean;
    ycScanIntentLlm?: boolean;
    ycSearch?: boolean;
    ycStt?: boolean;
    aiDishVision?: boolean;
    pollenHeatmap?: boolean;
    airQuality?: boolean;
    mapPlaces?: boolean;
    yandexMapsInteractive?: boolean;
  };
  scan?: ScanHealthMetrics;
  database?: {
    ok: boolean;
    latencyMs?: number;
    error?: string;
    pooler?: boolean;
    poolerWarning?: string;
  };
  rateLimit?: {
    store: 'redis' | 'memory';
    ok?: boolean;
    latencyMs?: number;
    error?: string;
  };
}

/**
 * Lightweight DB ping for staging/production health checks.
 * Opens a short-lived connection; does not use the shared pool singleton.
 */
export async function checkDatabaseConnectivity(): Promise<{
  ok: boolean;
  latencyMs?: number;
  error?: string;
}> {
  const url = resolveRuntimeUrl();
  if (!url) {
    return { ok: false, error: 'DATABASE_URL is not configured' };
  }

  const started = Date.now();
  const client = postgres(url, { ...buildConnectionOptions(), max: 1 });

  try {
    await client`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - started };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Database ping failed';
    return { ok: false, error: message, latencyMs: Date.now() - started };
  } finally {
    await client.end({ timeout: 2 });
  }
}

function buildScanHealth(): ScanHealthMetrics | undefined {
  if (process.env.AI_SCAN_ENABLED !== 'true') return undefined;
  const metrics = getScanMetrics();
  return { enabled: true, ...metrics };
}

function resolveAiScanProviderLabel(): 'yandex' | 'openai' | undefined {
  if (process.env.AI_SCAN_ENABLED !== 'true') return undefined;
  const raw = (process.env.AI_PROVIDER || 'openai').trim().toLowerCase();
  return raw === 'yandex' ? 'yandex' : 'openai';
}

function buildFeatures() {
  const aiScan = process.env.AI_SCAN_ENABLED === 'true';
  const provider = resolveAiScanProviderLabel();
  const ycCreds = Boolean(process.env.YC_AI_API_KEY && process.env.YC_FOLDER_ID);
  const ycOcr = process.env.YC_OCR_ENABLED === 'true' && ycCreds;
  // Intent LLM uses the same provider as /api/scan (YandexGPT or OpenAI).
  const ycScanIntentLlm = process.env.YC_SCAN_INTENT_LLM === 'true' && aiScan;
  const ycSearch = process.env.YC_SEARCH_ENABLED === 'true' && ycCreds;
  const ycStt = process.env.YC_STT_ENABLED === 'true' && ycCreds;
  const aiDishVision = dishVisionConfigured();
  return {
    sync: process.env.SYNC_ENABLED === 'true',
    aiScan,
    pollenHeatmap:
      process.env.POLLEN_HEATMAP_ENABLED === 'true' &&
      Boolean(process.env.GOOGLE_POLLEN_API_KEY?.trim()),
    airQuality:
      process.env.AIR_QUALITY_ENABLED === 'true' &&
      Boolean(
        process.env.GOOGLE_AIR_QUALITY_API_KEY?.trim() ||
          process.env.GOOGLE_MAPS_SERVER_API_KEY?.trim() ||
          process.env.GOOGLE_POLLEN_API_KEY?.trim(),
      ),
    mapPlaces:
      process.env.MAP_PLACES_ENABLED === 'true' &&
      Boolean(
        process.env.GOOGLE_PLACES_API_KEY?.trim() ||
          process.env.GOOGLE_MAPS_SERVER_API_KEY?.trim() ||
          process.env.GOOGLE_POLLEN_API_KEY?.trim(),
      ),
    yandexMapsInteractive:
      process.env.YANDEX_MAPS_INTERACTIVE_ENABLED === 'true' &&
      Boolean(process.env.YANDEX_MAPS_JS_API_KEY?.trim()),
    ...(aiScan && provider ? { aiScanProvider: provider } : {}),
    ...(ycOcr ? { ycOcr: true } : {}),
    ...(ycScanIntentLlm ? { ycScanIntentLlm: true } : {}),
    ...(ycSearch ? { ycSearch: true } : {}),
    ...(ycStt ? { ycStt: true } : {}),
    ...(aiDishVision ? { aiDishVision: true } : {}),
  };
}

export async function buildHealthPayload(): Promise<HealthCheckResult> {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const authDatabase = hasDatabaseUrl && Boolean(process.env.JWT_SECRET);

  if (!hasDatabaseUrl) {
    return {
      ok: true,
      authDatabase: false,
      features: buildFeatures(),
      scan: buildScanHealth(),
      rateLimit: { store: resolveRateLimitStoreKind() },
    };
  }

  const database = await checkDatabaseConnectivity();
  const pooler = isNeonPoolerUrl(process.env.DATABASE_URL);
  const poolerWarning =
    pooler && process.env.DB_PREPARE !== 'false'
      ? 'Neon pooler detected; set DB_PREPARE=false for transaction pooling'
      : undefined;

  const rateLimitStore = resolveRateLimitStoreKind();
  const rateLimitPing = rateLimitStore === 'redis' ? await pingRedis() : null;
  const rateLimit = rateLimitPing
    ? { store: rateLimitStore, ...rateLimitPing }
    : { store: rateLimitStore };

  const ok =
    database.ok &&
    Boolean(process.env.JWT_SECRET) &&
    (rateLimitStore !== 'redis' || rateLimitPing?.ok !== false);

  return {
    ok,
    authDatabase,
    features: buildFeatures(),
    scan: buildScanHealth(),
    database: {
      ...database,
      pooler,
      ...(poolerWarning ? { poolerWarning } : {}),
    },
    rateLimit,
  };
}
