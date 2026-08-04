import type { Express, Request, Response } from 'express';
import {
  buildYandexInteractiveMapHtml,
  getYandexMapsJsApiKey,
  isYandexMapsInteractiveConfigured,
  type YandexEmbedMarker,
} from '../services/yandex-maps-embed';

function parseCoord(value: unknown): number | null {
  const n = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

function parseMarkers(raw: unknown): YandexEmbedMarker[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const row = item as Record<string, unknown>;
      const id = typeof row.id === 'string' ? row.id : null;
      const latitude = parseCoord(row.latitude ?? row.lat);
      const longitude = parseCoord(row.longitude ?? row.lng ?? row.lon);
      if (!id || latitude === null || longitude === null) return [];
      if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return [];
      return [
        {
          id,
          latitude,
          longitude,
          title: typeof row.title === 'string' ? row.title : undefined,
          color: typeof row.color === 'string' ? row.color : undefined,
        },
      ];
    });
  } catch {
    return [];
  }
}

export function registerMapsRoutes(app: Express): void {
  app.get('/api/maps/yandex-interactive', (req: Request, res: Response) => {
    if (!isYandexMapsInteractiveConfigured()) {
      res.status(503).json({ ok: false, error: 'Yandex interactive map is disabled' });
      return;
    }

    const apiKey = getYandexMapsJsApiKey();
    if (!apiKey) {
      res.status(503).json({ ok: false, error: 'Yandex Maps API key is missing' });
      return;
    }

    const latitude = parseCoord(req.query.lat);
    const longitude = parseCoord(req.query.lon ?? req.query.lng);
    if (latitude === null || longitude === null) {
      res.status(400).json({ ok: false, error: 'lat and lon are required' });
      return;
    }
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      res.status(400).json({ ok: false, error: 'Invalid coordinates' });
      return;
    }

    const zoomRaw = Number(req.query.zoom ?? 11);
    const zoom = Number.isFinite(zoomRaw) ? Math.min(18, Math.max(3, Math.round(zoomRaw))) : 11;
    const markers = parseMarkers(req.query.markers).slice(0, 40);
    const selectedId =
      typeof req.query.selectedId === 'string' && req.query.selectedId.trim()
        ? req.query.selectedId.trim()
        : null;

    const html = buildYandexInteractiveMapHtml({
      apiKey,
      latitude,
      longitude,
      zoom,
      markers,
      selectedId,
    });

    // Allow embedding from the Expo web app / WebView.
    res.removeHeader('X-Frame-Options');
    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, max-age=60',
      'Content-Security-Policy':
        "frame-ancestors 'self' http://localhost:* http://127.0.0.1:* https://*.aclearo.com https://*.expo.dev;",
    });
    res.status(200).send(html);
  });

  app.get('/api/maps/yandex-status', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      interactive: isYandexMapsInteractiveConfigured(),
    });
  });
}
