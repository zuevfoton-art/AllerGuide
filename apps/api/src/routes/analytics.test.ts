import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { resetAnalyticsStoreForTests } from '../lib/analytics-store';

describe('analytics routes', () => {
  beforeEach(() => {
    resetAnalyticsStoreForTests();
    process.env.ANALYTICS_INGEST_ENABLED = 'true';
    process.env.ANALYTICS_DASHBOARD_ENABLED = 'true';
    process.env.ANALYTICS_DASHBOARD_KEY = 'dashboard-secret';
  });

  it('accepts a single analytics event', async () => {
    const app = await createApp();
    const response = await request(app).post('/api/analytics/events').send({
      event: 'screen_view',
      at: '2026-06-20T10:00:00.000Z',
      screen: '/home',
      client_id: 'client-1',
      platform: 'android',
    });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.accepted).toBe(1);
  });

  it('rejects invalid events', async () => {
    const app = await createApp();
    const response = await request(app).post('/api/analytics/events').send({
      event: 'not_allowed',
      screen: '/home',
    });

    expect(response.status).toBe(400);
  });

  it('returns dashboard aggregates when dashboard key is provided', async () => {
    process.env.ANALYTICS_DASHBOARD_KEY = 'dashboard-secret';
    const app = await createApp();

    await request(app).post('/api/analytics/events').send({
      events: [
        { event: 'screen_view', screen: '/home', client_id: 'c1', platform: 'ios' },
        { event: 'scan_completed', level: 'low', client_id: 'c1', platform: 'ios' },
      ],
    });

    const dashboard = await request(app)
      .get('/api/analytics/dashboard?days=7')
      .set('x-analytics-dashboard-key', 'dashboard-secret');
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.dashboard.totalEvents).toBe(2);
    expect(dashboard.body.dashboard.topEvents.length).toBeGreaterThan(0);
  });

  it('rejects dashboard without key when enabled', async () => {
    process.env.ANALYTICS_DASHBOARD_KEY = 'dashboard-secret';
    const app = await createApp();
    const response = await request(app).get('/api/analytics/dashboard');
    expect(response.status).toBe(401);
  });

  it('hides dashboard when disabled', async () => {
    process.env.ANALYTICS_DASHBOARD_ENABLED = 'false';
    const app = await createApp();
    const response = await request(app).get('/api/analytics/dashboard');
    expect(response.status).toBe(404);
  });
});
