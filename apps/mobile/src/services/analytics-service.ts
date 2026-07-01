import { Platform } from 'react-native';
import {
  buildAnalyticsPayload,
  isAnalyticsEventName,
  type AnalyticsEventName,
  type AnalyticsEventProps,
} from '@allerguide/core';
import { getSetting, setSetting } from '@/src/services/settings-service';

const CLIENT_ID_KEY = 'analyticsClientId';
let analyticsEnabled = false;
let clientId: string | null = null;

function resolveAnalyticsEndpoint(): string | undefined {
  const explicit = process.env.EXPO_PUBLIC_ANALYTICS_ENDPOINT?.trim();
  if (explicit) return explicit;

  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (apiUrl) return `${apiUrl.replace(/\/$/, '')}/api/analytics/events`;

  return undefined;
}

function getOrCreateClientId(): string {
  if (clientId) return clientId;
  const stored = getSetting(CLIENT_ID_KEY);
  if (stored) {
    clientId = stored;
    return stored;
  }

  const generated = `ag-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  setSetting(CLIENT_ID_KEY, generated);
  clientId = generated;
  return generated;
}

function transportMeta() {
  return {
    client_id: getOrCreateClientId(),
    platform: Platform.OS,
    app_version: process.env.EXPO_PUBLIC_APP_VERSION,
  };
}

export function initAnalytics() {
  analyticsEnabled = process.env.EXPO_PUBLIC_ANALYTICS_ENABLED === 'true';
  if (analyticsEnabled) {
    getOrCreateClientId();
  }
}

export function isAnalyticsEnabled(): boolean {
  return analyticsEnabled;
}

export function resolveAnalyticsEndpointForTests(): string | undefined {
  return resolveAnalyticsEndpoint();
}

async function sendPayload(payload: ReturnType<typeof buildAnalyticsPayload>) {
  const endpoint = resolveAnalyticsEndpoint();
  if (!endpoint) return;

  await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => undefined);
}

export function trackEvent(name: string, props?: AnalyticsEventProps) {
  if (!analyticsEnabled) return;
  if (!isAnalyticsEventName(name)) return;

  const payload = buildAnalyticsPayload(name as AnalyticsEventName, props, transportMeta());
  console.info('[analytics]', payload);
  void sendPayload(payload);
}

export function trackScreen(screen: string) {
  trackEvent('screen_view', { screen });
}

/** @internal test helper */
export function __resetAnalyticsForTests() {
  analyticsEnabled = false;
  clientId = null;
}
