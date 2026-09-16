/**
 * First-party G5 crash-free rate. GlitchTip has no session health,
 * so soak uses unique analytics clients instead of Sentry Release Health.
 */

export const CRASH_FREE_TARGET_RATE = 0.99;

export interface CrashFreeRateInput {
  sessionClientIds: Iterable<string | undefined>;
  crashedClientIds: Iterable<string | undefined>;
}

export interface CrashFreeRateResult {
  sessionClients: number;
  crashedClients: number;
  rate: number | null;
  target: number;
  meetsTarget: boolean | null;
}

function uniqueClientIds(ids: Iterable<string | undefined>): Set<string> {
  const unique = new Set<string>();
  for (const id of ids) {
    if (typeof id === 'string' && id.trim()) unique.add(id);
  }
  return unique;
}

/**
 * crash_free = 1 - unique(app_crashed) / unique(session_started)
 * Null when nobody started a session (nothing to measure).
 */
export function computeCrashFreeRate(input: CrashFreeRateInput): CrashFreeRateResult {
  const sessionClients = uniqueClientIds(input.sessionClientIds).size;
  const crashedClients = uniqueClientIds(input.crashedClientIds).size;

  if (sessionClients === 0) {
    return {
      sessionClients,
      crashedClients,
      rate: null,
      target: CRASH_FREE_TARGET_RATE,
      meetsTarget: null,
    };
  }

  const rate = Math.max(0, 1 - crashedClients / sessionClients);
  return {
    sessionClients,
    crashedClients,
    rate,
    target: CRASH_FREE_TARGET_RATE,
    meetsTarget: rate >= CRASH_FREE_TARGET_RATE,
  };
}
