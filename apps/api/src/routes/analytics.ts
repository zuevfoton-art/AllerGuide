import type { Express, Request, Response } from 'express';
import { parseAnalyticsEventPayload } from '@allerguide/core';
import {
  buildAnalyticsDashboard,
  ingestAnalyticsEvents,
  normalizeAnalyticsBody,
} from '../lib/analytics-store';
import { forwardAnalyticsToPostHog } from '../lib/posthog-forward';
import { logCaughtError } from '../lib/log-caught-error';

function analyticsEnabled(): boolean {
  return process.env.ANALYTICS_INGEST_ENABLED !== 'false';
}

function dashboardEnabled(): boolean {
  return process.env.ANALYTICS_DASHBOARD_ENABLED === 'true';
}

function dashboardAuthorized(req: Request): boolean {
  const configuredKey = process.env.ANALYTICS_DASHBOARD_KEY?.trim();
  if (!configuredKey) return false;
  return req.header('x-analytics-dashboard-key') === configuredKey;
}

export function registerAnalyticsRoutes(app: Express) {
  app.post('/api/analytics/events', async (req: Request, res: Response) => {
    if (!analyticsEnabled()) {
      res.status(503).json({ ok: false, error: 'Analytics ingest disabled' });
      return;
    }

    const rawItems = normalizeAnalyticsBody(req.body);
    if (!rawItems.length) {
      res.status(400).json({ ok: false, error: 'No analytics events provided' });
      return;
    }

    const parsed = rawItems
      .map((item) => parseAnalyticsEventPayload(item))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (!parsed.length) {
      res.status(400).json({ ok: false, error: 'Invalid analytics payload' });
      return;
    }

    const accepted = ingestAnalyticsEvents(parsed);
    void forwardAnalyticsToPostHog(parsed).catch((error) => {
      logCaughtError('analytics.forwardToPostHog', error);
    });

    res.json({ ok: true, accepted });
  });

  app.get('/api/analytics/dashboard', (req: Request, res: Response) => {
    if (!dashboardEnabled()) {
      res.status(404).json({ ok: false, error: 'Dashboard disabled' });
      return;
    }

    if (!dashboardAuthorized(req)) {
      res.status(401).json({ ok: false, error: 'Unauthorized' });
      return;
    }

    const daysRaw = Number(req.query.days ?? 7);
    const days = Number.isFinite(daysRaw) ? Math.min(30, Math.max(1, daysRaw)) : 7;

    res.json({
      ok: true,
      dashboard: buildAnalyticsDashboard(days),
    });
  });
}
