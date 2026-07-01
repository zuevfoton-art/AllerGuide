/**
 * Analytics event schema (P2.4a) — no PII, opt-in via EXPO_PUBLIC_ANALYTICS_ENABLED.
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
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export type AnalyticsEventProps = Record<string, string | number | boolean | null | undefined>;

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

export function buildAnalyticsPayload(name: AnalyticsEventName, props?: AnalyticsEventProps) {
  return {
    event: name,
    at: new Date().toISOString(),
    ...sanitizeAnalyticsProps(props),
  };
}
