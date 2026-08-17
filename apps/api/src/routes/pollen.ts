import type { Express, Request, Response } from 'express';
import {
  isGooglePollenMapType,
  parsePollenHeatmapTileCoordinates,
  summarizeGooglePlantCoverage,
} from '@allerguide/core';
import { logCaughtError } from '../lib/log-caught-error';
import {
  fetchGooglePollenHeatmapTile,
  isGooglePollenHeatmapConfigured,
} from '../services/google-pollen-heatmap';
import {
  fetchGooglePollenForecast,
  isGooglePollenForecastConfigured,
} from '../services/google-pollen-forecast';
import {
  fetchPollenSpeciesSamples,
  isPollenSpeciesHeatmapConfigured,
  parseSpeciesSamplesQuery,
} from '../services/google-pollen-species-samples';

const PNG_CONTENT_TYPE = 'image/png';
const SUPPORTED_FORECAST_LANGUAGES = new Set(['ru', 'en', 'es', 'fr', 'de', 'it']);

export function registerPollenRoutes(app: Express): void {
  app.get(
    '/api/pollen/heatmap/:mapType/:zoom/:x/:y',
    async (req: Request, res: Response) => {
      if (!isGooglePollenHeatmapConfigured()) {
        res.status(503).json({ ok: false, error: 'Pollen heatmap is disabled' });
        return;
      }

      const mapType = String(req.params.mapType ?? '');
      if (!isGooglePollenMapType(mapType)) {
        res.status(400).json({ ok: false, error: 'Invalid pollen heatmap type' });
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
        const upstreamResponse = await fetchGooglePollenHeatmapTile(
          mapType,
          coordinates.zoom,
          coordinates.x,
          coordinates.y,
        );
        if (!upstreamResponse.ok) {
          res.status(upstreamResponse.status === 404 ? 404 : 502).json({
            ok: false,
            error: 'Pollen heatmap tile is unavailable',
          });
          return;
        }

        const contentType = upstreamResponse.headers.get('content-type') ?? '';
        if (!contentType.startsWith(PNG_CONTENT_TYPE)) {
          res.status(502).json({ ok: false, error: 'Unexpected pollen tile response' });
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
        logCaughtError('pollen.heatmap', error, { mapType, ...coordinates });
        res.status(502).json({ ok: false, error: 'Unable to fetch pollen heatmap tile' });
      }
    },
  );

  app.get('/api/pollen/forecast', async (req: Request, res: Response) => {
    // Same CORP as heatmap tiles: Expo web must read typeIndexes to hide empty TREE overlays.
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    if (!isGooglePollenForecastConfigured()) {
      res.status(503).json({ ok: false, error: 'Pollen forecast is disabled' });
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
    const languageCode = SUPPORTED_FORECAST_LANGUAGES.has(langRaw) ? langRaw : 'en';

    try {
      const forecast = await fetchGooglePollenForecast(latitude, longitude, languageCode);
      const today = forecast.days[0];
      if (today) {
        const coverage = summarizeGooglePlantCoverage(today.plantCoverage);
        console.info('[pollen.forecast] plantCoverage', {
          latitude,
          longitude,
          languageCode,
          regionCode: forecast.regionCode,
          date: today.date,
          withIndex: coverage.withIndex,
          withoutIndex: coverage.withoutIndex,
          treeSpecies: coverage.treeSpecies,
        });
      }
      res.set({ 'Cache-Control': 'private, max-age=600' });
      res.json({ ok: true, forecast });
    } catch (error) {
      logCaughtError('pollen.forecast', error, { latitude, longitude });
      res.status(502).json({ ok: false, error: 'Unable to fetch pollen forecast' });
    }
  });

  app.get('/api/pollen/species-samples', async (req: Request, res: Response) => {
    if (!isPollenSpeciesHeatmapConfigured()) {
      res.status(503).json({ ok: false, error: 'Pollen species heatmap is disabled' });
      return;
    }

    const parsed = parseSpeciesSamplesQuery(req.query as Record<string, unknown>);
    if (!parsed.ok) {
      res.status(400).json({ ok: false, error: parsed.error });
      return;
    }

    try {
      const result = await fetchPollenSpeciesSamples(parsed);
      res.set({ 'Cache-Control': 'private, no-store' });
      res.json({
        ok: true,
        ...result,
        attribution: 'Includes data from Google Maps',
        derived: true,
      });
    } catch (error) {
      logCaughtError('pollen.speciesSamples', error, {
        taxonId: parsed.taxonId,
        zoom: parsed.zoom,
      });
      res.status(502).json({ ok: false, error: 'Unable to fetch species samples' });
    }
  });
}

function parseCoord(raw: unknown): number | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}
