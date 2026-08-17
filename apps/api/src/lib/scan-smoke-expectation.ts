/**
 * Staging scan-smoke policy for a repeat POST /api/scan.
 *
 * Redis is shared across Serverless instances — a cache hit is required.
 * The in-memory store is per instance. A miss on the second call is expected
 * when the API Gateway routes to a different revision instance.
 */

export type ScanCacheStore = 'memory' | 'redis';

export interface RepeatScanSmokeInput {
  store: string | undefined;
  firstVerdict: string;
  secondOk: boolean;
  secondCached: boolean;
  secondVerdict: string | undefined;
}

export interface RepeatScanSmokeResult {
  ok: boolean;
  message: string;
}

export function resolveScanCacheStore(store: string | undefined): ScanCacheStore {
  return store === 'redis' ? 'redis' : 'memory';
}

export function evaluateRepeatScanSmoke(input: RepeatScanSmokeInput): RepeatScanSmokeResult {
  if (!input.secondOk) {
    return { ok: false, message: 'Second scan failed' };
  }

  if (input.secondCached) {
    return { ok: true, message: 'Scan smoke passed (JWT auth, LLM miss + cache hit).' };
  }

  if (resolveScanCacheStore(input.store) === 'redis') {
    return { ok: false, message: 'Second scan should be served from Redis cache' };
  }

  if (input.secondVerdict && input.secondVerdict === input.firstVerdict) {
    return {
      ok: true,
      message:
        'Scan smoke passed (JWT auth, LLM miss + repeat scan). Cache hit skipped: in-memory store is per Serverless instance.',
    };
  }

  return {
    ok: false,
    message: 'Second scan was not cached and verdict did not match the first (memory store)',
  };
}
