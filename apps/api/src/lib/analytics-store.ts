import {
  buildAnalyticsPayload,
  isAnalyticsEventName,
  type AnalyticsEventPayload,
} from '@allerguide/core';

const MAX_EVENTS = 10_000;
const events: AnalyticsEventPayload[] = [];

export function ingestAnalyticsEvents(incoming: AnalyticsEventPayload[]): number {
  let accepted = 0;
  for (const item of incoming) {
    if (!isAnalyticsEventName(item.event)) continue;
    events.push(item);
    accepted += 1;
  }

  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }

  return accepted;
}

export function listAnalyticsEvents(limit = 100): AnalyticsEventPayload[] {
  return events.slice(-limit).reverse();
}

export function buildAnalyticsDashboard(days = 7) {
  const cutoff = Date.now() - days * 86_400_000;
  const recent = events.filter((item) => new Date(item.at).getTime() >= cutoff);

  const byEvent: Record<string, number> = {};
  const byScreen: Record<string, number> = {};
  const byPlatform: Record<string, number> = {};

  for (const item of recent) {
    byEvent[item.event] = (byEvent[item.event] ?? 0) + 1;
    if (item.event === 'screen_view' && typeof item.screen === 'string') {
      byScreen[item.screen] = (byScreen[item.screen] ?? 0) + 1;
    }
    if (typeof item.platform === 'string') {
      byPlatform[item.platform] = (byPlatform[item.platform] ?? 0) + 1;
    }
  }

  const topEvents = Object.entries(byEvent)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 12)
    .map(([event, count]) => ({ event, count }));

  const topScreens = Object.entries(byScreen)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 12)
    .map(([screen, count]) => ({ screen, count }));

  return {
    days,
    totalEvents: recent.length,
    uniqueClients: new Set(recent.map((item) => item.client_id).filter(Boolean)).size,
    topEvents,
    topScreens,
    byPlatform,
    recent: recent.slice(-20).reverse(),
  };
}

export function resetAnalyticsStoreForTests() {
  events.length = 0;
}

export function normalizeAnalyticsBody(body: unknown): AnalyticsEventPayload[] {
  if (Array.isArray(body)) {
    return body
      .map((item) => (typeof item === 'object' && item && 'event' in item ? (item as AnalyticsEventPayload) : null))
      .filter((item): item is AnalyticsEventPayload => Boolean(item));
  }

  if (body && typeof body === 'object' && 'events' in body && Array.isArray((body as { events: unknown }).events)) {
    return normalizeAnalyticsBody((body as { events: unknown[] }).events);
  }

  if (body && typeof body === 'object' && 'event' in body) {
    return [body as AnalyticsEventPayload];
  }

  return [];
}

export { buildAnalyticsPayload };
