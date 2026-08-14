import type { Express, Request, Response } from 'express';
import {
  isGoogleAirQualityMapType,
  parsePollenHeatmapTileCoordinates,
} from '@allerguide/core';
import { logCaughtError } from '../lib/log-caught-error';
import {
  fetchGoogleAirQualityCurrent,
  fetchGoogleAirQualityHeatmapTile,
  isGoogleAirQualityConfigured,
} from '../services/google-air-quality';

const PNG_CONTENT_TYPE = 'image/png';
const SUPPORTED_LANGUAGES = new Set(['ru', 'en', 'es', 'fr', 'de', 'it']);

export function registerAirQualityRoutes(app: Express): void {
  app.get('/api/air-quality/current', async (req: Request, res: Response) => {
    if (!isGoogleAirQualityConfigured()) {
      res.status(503).json({ ok: false, error: 'Air quality is disabled' });
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

    const langRaw = typeof req.query.lang === 'string' ? req.query.lang.toLowerCase() : '';
    const languageCode = SUPPORTED_LANGUAGES.has(langRaw) ? langRaw : 'ru';

    try {
      const airQuality = await fetchGoogleAirQualityCurrent(latitude, longitude, languageCode);
      res.set({ 'Cache-Control': 'private, max-age=600' });
      res.json({ ok: true, airQuality });
    } catch (error) {
      logCaughtError('airQuality.current', error, { latitude, longitude });
      res.status(502).json({ ok: false, error: 'Unable to fetch air quality' });
    }
  });

  app.get(
    '/api/air-quality/heatmap/:mapType/:zoom/:x/:y',
    async (req: Request, res: Response) => {
      if (!isGoogleAirQualityConfigured()) {
        res.status(503).json({ ok: false, error: 'Air quality is disabled' });
        return;
      }

      const mapType = String(req.params.mapType ?? '');
      if (!isGoogleAirQualityMapType(mapType)) {
        res.status(400).json({ ok: false, error: 'Invalid air quality heatmap type' });
        return;
      }

      const coordinates = parsePollenHeatmapTileCoordinates(
        String(req.params.zoom ?? ''),
        String(req.params.x ?? ''),
        String(req.params.y ?? ''),
      );
      if (!coordinates) {
        res.status(400).json({ ok: false, error: 'Invalid heatmap tile coordinates' });
        return;
      }

      try {
        const upstreamResponse = await fetchGoogleAirQualityHeatmapTile(
          mapType,
          coordinates.zoom,
          coordinates.x,
          coordinates.y,
        );
        if (!upstreamResponse.ok) {
          res.status(upstreamResponse.status === 404 ? 404 : 502).json({
            ok: false,
            error: 'Air quality heatmap tile is unavailable',
          });
          return;
        }

        const contentType = upstreamResponse.headers.get('content-type') ?? '';
        if (!contentType.startsWith(PNG_CONTENT_TYPE)) {
          res.status(502).json({ ok: false, error: 'Unexpected air quality tile response' });
          return;
        }

        const tile = Buffer.from(await upstreamResponse.arrayBuffer());
        res.set({
          'Content-Type': PNG_CONTENT_TYPE,
          'Cache-Control': 'private, no-store',
          'Cross-Origin-Resource-Policy': 'cross-origin',
          'Content-Length': String(tile.byteLength),
        });
        res.send(tile);
      } catch (error) {
        logCaughtError('airQuality.heatmap', error, { mapType, ...coordinates });
        res.status(502).json({ ok: false, error: 'Unable to fetch air quality tile' });
      }
    },
  );
}

function parseCoord(raw: unknown): number | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}
