import { describe, expect, it } from 'vitest';
import {
  ANALYTICS_EVENT_NAMES,
  buildAnalyticsPayload,
  isAnalyticsEventName,
  parseAnalyticsEventPayload,
  sanitizeAnalyticsProps,
} from './analytics-events';

describe('analytics-events', () => {
  it('defines a closed set of event names', () => {
    expect(ANALYTICS_EVENT_NAMES).toContain('screen_view');
    expect(ANALYTICS_EVENT_NAMES.length).toBeGreaterThanOrEqual(10);
  });

  it('strips PII-like keys from props', () => {
    expect(
      sanitizeAnalyticsProps({
        screen: 'home',
        email: 'secret@example.com',
        profile_id: 3,
      }),
    ).toEqual({ screen: 'home', profile_id: 3 });
  });

  it('parses valid inbound payloads', () => {
    const parsed = parseAnalyticsEventPayload({
      event: 'scan_completed',
      at: '2026-06-20T10:00:00.000Z',
      level: 'low',
      client_id: 'abc',
    });
    expect(parsed?.event).toBe('scan_completed');
    expect(parsed?.level).toBe('low');
    expect(parsed?.client_id).toBe('abc');
  });

  it('rejects unknown events', () => {
    expect(parseAnalyticsEventPayload({ event: 'unknown' })).toBeNull();
    expect(isAnalyticsEventName('auth_login')).toBe(true);
  });

  it('builds payload with transport meta', () => {
    const payload = buildAnalyticsPayload('diary_entry_saved', { entry_type: 'Симптомы' }, {
      client_id: 'c1',
      platform: 'ios',
    });
    expect(payload.event).toBe('diary_entry_saved');
    expect(payload.client_id).toBe('c1');
    expect(payload.entry_type).toBe('Симптомы');
  });

  it('includes GTM funnel events', () => {
    expect(isAnalyticsEventName('onboarding_completed')).toBe(true);
    expect(isAnalyticsEventName('onboarding_scenario_selected')).toBe(true);
    expect(isAnalyticsEventName('scan_dish_vision')).toBe(true);
    expect(isAnalyticsEventName('pollen_alert_sent')).toBe(true);
    expect(isAnalyticsEventName('waitlist_joined')).toBe(true);
  });
});
