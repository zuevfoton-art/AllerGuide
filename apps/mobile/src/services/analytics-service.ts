type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

let analyticsEnabled = false;

export function initAnalytics() {
  analyticsEnabled = process.env.EXPO_PUBLIC_ANALYTICS_ENABLED === 'true';
}

export function trackEvent(name: string, props?: AnalyticsProps) {
  if (!analyticsEnabled) return;

  const payload = { event: name, at: new Date().toISOString(), ...props };
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
