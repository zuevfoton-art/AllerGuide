/**
 * Analytics event schema (P2.4) — no PII, shared by mobile + API.
 */

export const ANALYTICS_EVENT_NAMES = [
  'screen_view',
  'auth_login',
  'auth_register',
  'auth_logout',
  'profile_created',
  'profile_switched',
  'diary_entry_saved',
  'diary_report_exported',
  'scan_completed',
  'scan_barcode',
  'sync_upload',
  'sync_download',
  'backup_exported',
  'backup_imported',
  'sos_opened',
  'wellness_refreshed',
  'settings_changed',
  'market_click',
  'profile_setup_step_view',
  'profile_setup_step_complete',
  'profile_setup_step_skip',
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export type AnalyticsEventProps = Record<string, string | number | boolean | null | undefined>;

export interface AnalyticsEventPayload {
  event: AnalyticsEventName;
  at: string;
  client_id?: string;
  platform?: string;
  app_version?: string;
  [key: string]: string | number | boolean | undefined;
}

/** Keys that must never be sent to analytics backends. */
export const ANALYTICS_FORBIDDEN_KEYS = [
  'email',
  'login',
  'password',
  'token',
  'recoveryKey',
  'name',
  'phone',
  'address',
  'birthYear',
  'allergies',
  'details',
  'ingredients',
  'notes',
] as const;

const ALLOWED_PROP_KEY = /^[a-z][a-z0-9_]{0,31}$/;

export function isAnalyticsEventName(name: string): name is AnalyticsEventName {
  return (ANALYTICS_EVENT_NAMES as readonly string[]).includes(name);
}

export function sanitizeAnalyticsProps(props: AnalyticsEventProps = {}): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(props)) {
    if (value == null) continue;
    const lower = key.toLowerCase();
    if (ANALYTICS_FORBIDDEN_KEYS.some((forbidden) => lower.includes(forbidden))) continue;
    if (!ALLOWED_PROP_KEY.test(key)) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
    }
  }

  return out;
}

export function buildAnalyticsPayload(
  name: AnalyticsEventName,
  props?: AnalyticsEventProps,
  meta?: { client_id?: string; platform?: string; app_version?: string },
): AnalyticsEventPayload {
  return {
    event: name,
    at: new Date().toISOString(),
    ...meta,
    ...sanitizeAnalyticsProps(props),
  };
}

export function parseAnalyticsEventPayload(raw: unknown): AnalyticsEventPayload | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const event = (raw as { event?: unknown }).event;
  if (typeof event !== 'string' || !isAnalyticsEventName(event)) return null;

  const atRaw = (raw as { at?: unknown }).at;
  const at = typeof atRaw === 'string' && !Number.isNaN(Date.parse(atRaw)) ? atRaw : new Date().toISOString();

  const props: AnalyticsEventProps = {};
  let client_id: string | undefined;
  let platform: string | undefined;
  let app_version: string | undefined;

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (key === 'event' || key === 'at') continue;
    if (key === 'client_id' && typeof value === 'string') {
      client_id = value;
      continue;
    }
    if (key === 'platform' && typeof value === 'string') {
      platform = value;
      continue;
    }
    if (key === 'app_version' && typeof value === 'string') {
      app_version = value;
      continue;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      props[key] = value;
    }
  }

  return {
    ...buildAnalyticsPayload(event, props, { client_id, platform, app_version }),
    at,
  };
}
