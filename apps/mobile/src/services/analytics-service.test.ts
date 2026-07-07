import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ANALYTICS_EVENT_NAMES,
  buildAnalyticsPayload,
  isAnalyticsEventName,
  sanitizeAnalyticsProps,
} from '@allerguide/core';

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

vi.mock('@/src/services/settings-service', () => {
  const settings = new Map<string, string>();
  return {
    getSetting: (key: string) => settings.get(key) ?? null,
    setSetting: (key: string, value: string) => {
      settings.set(key, value);
    },
  };
});

describe('analytics-events', () => {
  it('defines a closed set of event names', () => {
    expect(ANALYTICS_EVENT_NAMES).toContain('screen_view');
    expect(ANALYTICS_EVENT_NAMES).toContain('scan_completed');
    expect(ANALYTICS_EVENT_NAMES.length).toBeGreaterThanOrEqual(10);
  });

  it('strips PII-like keys from props', () => {
    const sanitized = sanitizeAnalyticsProps({
      screen: 'home',
      email: 'secret@example.com',
      login: 'user',
      profile_id: 3,
      token: 'jwt',
    });

    expect(sanitized).toEqual({ screen: 'home', profile_id: 3 });
  });

  it('builds payload with event name and timestamp', () => {
    const payload = buildAnalyticsPayload('diary_entry_saved', { entry_type: 'Симптомы' });
    expect(payload.event).toBe('diary_entry_saved');
    expect((payload as Record<string, unknown>).entry_type).toBe('Симптомы');
    expect(typeof payload.at).toBe('string');
  });

  it('validates known event names', () => {
    expect(isAnalyticsEventName('screen_view')).toBe(true);
    expect(isAnalyticsEventName('unknown_event')).toBe(false);
  });
});

describe('trackEvent integration', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('EXPO_PUBLIC_ANALYTICS_ENABLED', 'true');
    vi.stubEnv('EXPO_PUBLIC_ANALYTICS_ENDPOINT', '');
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'https://api.staging.aclearo.com');
  });

  it('ignores unknown event names', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const { trackEvent } = await import('./analytics-service');

    trackEvent('not_a_real_event', { screen: 'home' });
    expect(info).not.toHaveBeenCalled();
    info.mockRestore();
  });

  it('logs sanitized payload for allowed events', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const { initAnalytics, trackEvent } = await import('./analytics-service');

    initAnalytics();
    trackEvent('screen_view', { screen: 'diary', email: 'hidden@x.com' });

    expect(info).toHaveBeenCalled();
    const payload = info.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload?.event).toBe('screen_view');
    expect(payload?.screen).toBe('diary');
    expect(payload?.email).toBeUndefined();
    expect(payload?.client_id).toBeTruthy();
    info.mockRestore();
  });

  it('posts to API analytics endpoint by default', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as typeof fetch;

    const { initAnalytics, trackEvent } = await import('./analytics-service');
    initAnalytics();
    trackEvent('auth_login', { login_type: 'email' });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.staging.aclearo.com/api/analytics/events',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
