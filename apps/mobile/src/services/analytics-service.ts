import {
  buildAnalyticsPayload,
  isAnalyticsEventName,
  type AnalyticsEventName,
  type AnalyticsEventProps,
} from './analytics-events';

let analyticsEnabled = false;

export function initAnalytics() {
  analyticsEnabled = process.env.EXPO_PUBLIC_ANALYTICS_ENABLED === 'true';
}

export function isAnalyticsEnabled(): boolean {
  return analyticsEnabled;
}

export function trackEvent(name: string, props?: AnalyticsEventProps) {
  if (!analyticsEnabled) return;
  if (!isAnalyticsEventName(name)) return;

  const payload = buildAnalyticsPayload(name as AnalyticsEventName, props);
  console.info('[analytics]', payload);

  const endpoint = process.env.EXPO_PUBLIC_ANALYTICS_ENDPOINT;
  if (!endpoint) return;

  void fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => undefined);
}

export function trackScreen(screen: string) {
  trackEvent('screen_view', { screen });
}
