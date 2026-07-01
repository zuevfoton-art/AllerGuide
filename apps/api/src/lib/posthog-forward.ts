import type { AnalyticsEventPayload } from '@allerguide/core';

export async function forwardAnalyticsToPostHog(events: AnalyticsEventPayload[]): Promise<number> {
  const apiKey = process.env.POSTHOG_API_KEY?.trim();
  if (!apiKey || !events.length) return 0;

  const host = (process.env.POSTHOG_HOST || 'https://app.posthog.com').replace(/\/$/, '');
  let forwarded = 0;

  for (const event of events) {
    const distinctId = event.client_id || 'anonymous';
    const { event: eventName, client_id: _clientId, ...properties } = event;

    const response = await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        event: eventName,
        distinct_id: distinctId,
        properties,
        timestamp: event.at,
      }),
    });

    if (response.ok) forwarded += 1;
  }

  return forwarded;
}
