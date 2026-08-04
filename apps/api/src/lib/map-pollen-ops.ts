import type { AnalyticsEventPayload } from '@allerguide/core';
import { listAnalyticsEvents } from './analytics-store';
import { logCaughtError } from './log-caught-error';

export type MapPollenOpsHealth = {
  windowHours: number;
  refreshed: number;
  fallbacks: number;
  fallbackRate: number;
  alert: boolean;
  threshold: number;
  minSamples: number;
  reasons: Record<string, number>;
};

const DEFAULT_WINDOW_HOURS = 6;
const DEFAULT_THRESHOLD = 0.35;
const DEFAULT_MIN_SAMPLES = 20;

function readNumberEnv(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) ? raw : fallback;
}

export function getMapPollenOpsConfig() {
  return {
    windowHours: Math.min(72, Math.max(1, readNumberEnv('MAP_POLLEN_OPS_WINDOW_HOURS', DEFAULT_WINDOW_HOURS))),
    threshold: Math.min(1, Math.max(0.05, readNumberEnv('MAP_POLLEN_OPS_FALLBACK_THRESHOLD', DEFAULT_THRESHOLD))),
    minSamples: Math.min(500, Math.max(5, readNumberEnv('MAP_POLLEN_OPS_MIN_SAMPLES', DEFAULT_MIN_SAMPLES))),
  };
}

export function buildMapPollenOpsHealth(
  events: AnalyticsEventPayload[] = listAnalyticsEvents(MAX_SCAN),
  nowMs: number = Date.now(),
): MapPollenOpsHealth {
  const { windowHours, threshold, minSamples } = getMapPollenOpsConfig();
  const cutoff = nowMs - windowHours * 3_600_000;

  let refreshed = 0;
  let fallbacks = 0;
  const reasons: Record<string, number> = {};

  for (const item of events) {
    const at = Date.parse(item.at);
    if (!Number.isFinite(at) || at < cutoff) continue;
    if (item.event === 'map_pollen_refreshed') {
      refreshed += 1;
    }
    if (item.event === 'map_pollen_fallback') {
      fallbacks += 1;
      const reason = typeof item.reason === 'string' ? item.reason : 'unknown';
      reasons[reason] = (reasons[reason] ?? 0) + 1;
    }
  }

  // Each map refresh emits one `map_pollen_refreshed`; failures also emit `map_pollen_fallback`.
  // Rate = fallbacks / refreshed (capped at 1). Denominator is refresh cycles, not event union.
  const fallbackRate = refreshed > 0 ? Math.min(1, fallbacks / refreshed) : 0;
  const alert = refreshed >= minSamples && fallbackRate >= threshold;

  return {
    windowHours,
    refreshed,
    fallbacks,
    fallbackRate: Number(fallbackRate.toFixed(4)),
    alert,
    threshold,
    minSamples,
    reasons,
  };
}

const MAX_SCAN = 5_000;
const alertState = { lastAlertAtMs: 0 };

/**
 * Evaluates rolling fallback rate after ingest. Logs + optional webhook when alert trips.
 * Debounced to once per 15 minutes.
 */
export async function maybeAlertMapPollenFallback(
  events?: AnalyticsEventPayload[],
): Promise<MapPollenOpsHealth> {
  const health = buildMapPollenOpsHealth(events);
  if (!health.alert) return health;

  const now = Date.now();
  if (now - alertState.lastAlertAtMs < 15 * 60_000) return health;
  alertState.lastAlertAtMs = now;

  const message =
    `[map-pollen-ops] HIGH FALLBACK RATE ${health.fallbackRate} ` +
    `(fallbacks=${health.fallbacks}, refreshed=${health.refreshed}, ` +
    `threshold=${health.threshold}, windowHours=${health.windowHours})`;

  logCaughtError('mapPollenOps.alert', new Error(message), {
    level: 'error',
    fallbackRate: health.fallbackRate,
    fallbacks: health.fallbacks,
    refreshed: health.refreshed,
  });

  const webhook = process.env.OPS_ALERT_WEBHOOK_URL?.trim();
  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message,
          health,
        }),
      });
    } catch (error) {
      logCaughtError('mapPollenOps.webhook', error, { level: 'warn' });
    }
  }

  return health;
}

/** @internal */
export function resetMapPollenOpsAlertStateForTests() {
  alertState.lastAlertAtMs = 0;
}
