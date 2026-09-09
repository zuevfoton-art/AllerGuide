import type { Request } from 'express';
import { resolveAuthPayload } from './request-auth';

/** JWT required for billable AI routes when the flag is on. */
export function isScanAuthRequired(): boolean {
  return process.env.SCAN_REQUIRE_AUTH === 'true';
}

/**
 * Per-route override (`OCR_REQUIRE_AUTH`, `STT_REQUIRE_AUTH`):
 * explicit true/false wins; otherwise inherit `SCAN_REQUIRE_AUTH`.
 */
export function isOverrideAuthRequired(explicit: string | undefined): boolean {
  if (explicit === 'true') return true;
  if (explicit === 'false') return false;
  return isScanAuthRequired();
}

/**
 * Identify the caller for AI budgets: prefer JWT `sub`, else per-IP
 * when auth is not required. Returns null when a JWT is mandatory and missing.
 */
export async function resolveScanIdentity(
  req: Request,
  options?: { requireAuth?: boolean },
): Promise<string | null> {
  const payload = await resolveAuthPayload(req);
  if (payload) return `user:${payload.sub}`;
  const requireAuth = options?.requireAuth ?? isScanAuthRequired();
  if (requireAuth) return null;
  return `ip:${req.ip ?? 'unknown'}`;
}
