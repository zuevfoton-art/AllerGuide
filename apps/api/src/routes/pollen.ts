import type { Express, Request, Response } from 'express';
import {
  isGooglePollenMapType,
  parsePollenHeatmapTileCoordinates,
} from '@allerguide/core';
import { logCaughtError } from '../lib/log-caught-error';
import {
  fetchGooglePollenHeatmapTile,
  isGooglePollenHeatmapConfigured,
} from '../services/google-pollen-heatmap';

const PNG_CONTENT_TYPE = 'image/png';

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
}
