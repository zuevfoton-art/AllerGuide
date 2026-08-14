import type { Express, Request, Response } from 'express';
import { logCaughtError } from '../lib/log-caught-error';
import {
  fetchGooglePlacesNearby,
  isGooglePlacesNearbyConfigured,
  parseCoordinate,
  parsePlacesNearbyType,
  type GooglePlacesNearbyType,
} from '../services/google-places-nearby';

const DEFAULT_TYPES: GooglePlacesNearbyType[] = ['restaurant', 'cafe', 'medical', 'pharmacy'];

export function registerPlacesRoutes(app: Express): void {
  app.get('/api/places/nearby', async (req: Request, res: Response) => {
    if (!isGooglePlacesNearbyConfigured()) {
      res.status(503).json({ ok: false, error: 'Live map places are disabled' });
      return;
    }

    const latitude = parseCoordinate(req.query.lat);
    const longitude = parseCoordinate(req.query.lon ?? req.query.lng);
    if (latitude === null || longitude === null) {
      res.status(400).json({ ok: false, error: 'lat and lon are required' });
      return;
    }
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      res.status(400).json({ ok: false, error: 'Invalid coordinates' });
      return;
    }

    const typeParam = typeof req.query.type === 'string' ? req.query.type : '';
    const types: GooglePlacesNearbyType[] = typeParam
      ? (() => {
          const parsed = parsePlacesNearbyType(typeParam);
          return parsed ? [parsed] : [];
        })()
      : DEFAULT_TYPES;

    if (types.length === 0) {
      res.status(400).json({ ok: false, error: 'Invalid place type' });
      return;
    }

    try {
      const batches = await Promise.all(
        types.map((type) => fetchGooglePlacesNearby(latitude, longitude, type)),
      );
      const places = batches.flat();
      res.set({ 'Cache-Control': 'private, max-age=300' });
      res.json({ ok: true, places });
    } catch (error) {
      logCaughtError('places.nearby', error, { latitude, longitude, types });
      res.status(502).json({ ok: false, error: 'Unable to fetch nearby places' });
    }
  });
}
