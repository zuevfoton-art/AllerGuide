import type { Express, Request, Response } from 'express';
import { logCaughtError } from '../lib/log-caught-error';
import { fetchGooglePlacesAutocomplete } from '../services/google-places-autocomplete';
import { fetchGooglePlacesDetails } from '../services/google-places-details';
import {
  fetchGooglePlacesNearbyMany,
  isGooglePlacesNearbyConfigured,
} from '../services/google-places-nearby';
import {
  MIN_PLACES_QUERY_LENGTH,
  parseCoordinate,
  parsePlacesCategories,
  parsePlacesLanguage,
  parsePlacesQuery,
  parsePlacesSessionToken,
} from '../services/google-places-shared';
import { fetchGooglePlacesTextSearch } from '../services/google-places-text-search';

const PLACE_ID_PATTERN = /^[A-Za-z0-9_-]{8,256}$/;

export function registerPlacesRoutes(app: Express): void {
  app.get('/api/places/nearby', async (req: Request, res: Response) => {
    if (!isGooglePlacesNearbyConfigured()) {
      res.status(503).json({ ok: false, error: 'Live map places are disabled' });
      return;
    }

    const location = parseLocation(req);
    if (!location.ok) {
      res.status(400).json({ ok: false, error: location.error });
      return;
    }

    const categories = parsePlacesCategories(req.query.categories ?? req.query.type);
    if (categories.length === 0) {
      res.status(400).json({ ok: false, error: 'Invalid place type' });
      return;
    }

    const languageCode = parsePlacesLanguage(req.query.lang);

    try {
      const places = await fetchGooglePlacesNearbyMany(
        location.latitude,
        location.longitude,
        categories,
        languageCode,
      );
      res.set({ 'Cache-Control': 'private, no-store' });
      res.json({ ok: true, places, source: 'google-places' });
    } catch (error) {
      logCaughtError('places.nearby', error, {
        latitude: location.latitude,
        longitude: location.longitude,
        categories,
      });
      res.status(statusFromUpstream(error)).json({
        ok: false,
        error: 'Unable to fetch nearby places',
      });
    }
  });

  app.get('/api/places/autocomplete', async (req: Request, res: Response) => {
    if (!isGooglePlacesNearbyConfigured()) {
      res.status(503).json({ ok: false, error: 'Live map places are disabled' });
      return;
    }

    const query = parsePlacesQuery(req.query.q);
    if (!query) {
      res.status(400).json({
        ok: false,
        error: `q must be between ${MIN_PLACES_QUERY_LENGTH} and 80 characters`,
      });
      return;
    }

    const location = parseLocation(req);
    if (!location.ok) {
      res.status(400).json({ ok: false, error: location.error });
      return;
    }

    const categories = parsePlacesCategories(req.query.categories ?? req.query.type);
    if (categories.length === 0) {
      res.status(400).json({ ok: false, error: 'Invalid place type' });
      return;
    }

    try {
      const suggestions = await fetchGooglePlacesAutocomplete({
        query,
        latitude: location.latitude,
        longitude: location.longitude,
        languageCode: parsePlacesLanguage(req.query.lang),
        sessionToken: parsePlacesSessionToken(req.query.sessionToken),
        categories,
      });
      res.set({ 'Cache-Control': 'private, no-store' });
      res.json({ ok: true, suggestions });
    } catch (error) {
      logCaughtError('places.autocomplete', error, { queryLength: query.length });
      res.status(statusFromUpstream(error)).json({
        ok: false,
        error: 'Unable to fetch place suggestions',
      });
    }
  });

  app.get('/api/places/search', async (req: Request, res: Response) => {
    if (!isGooglePlacesNearbyConfigured()) {
      res.status(503).json({ ok: false, error: 'Live map places are disabled' });
      return;
    }

    const query = parsePlacesQuery(req.query.q);
    if (!query) {
      res.status(400).json({
        ok: false,
        error: `q must be between ${MIN_PLACES_QUERY_LENGTH} and 80 characters`,
      });
      return;
    }

    const location = parseLocation(req);
    if (!location.ok) {
      res.status(400).json({ ok: false, error: location.error });
      return;
    }

    const categories = parsePlacesCategories(req.query.categories ?? req.query.type);
    if (categories.length === 0) {
      res.status(400).json({ ok: false, error: 'Invalid place type' });
      return;
    }

    try {
      const places = await fetchGooglePlacesTextSearch({
        query,
        latitude: location.latitude,
        longitude: location.longitude,
        languageCode: parsePlacesLanguage(req.query.lang),
        categories,
      });
      res.set({ 'Cache-Control': 'private, no-store' });
      res.json({ ok: true, places, source: 'google-places' });
    } catch (error) {
      logCaughtError('places.search', error, { queryLength: query.length });
      res.status(statusFromUpstream(error)).json({
        ok: false,
        error: 'Unable to search places',
      });
    }
  });

  app.get('/api/places/:placeId', async (req: Request, res: Response) => {
    if (!isGooglePlacesNearbyConfigured()) {
      res.status(503).json({ ok: false, error: 'Live map places are disabled' });
      return;
    }

    const placeId = String(req.params.placeId ?? '').trim();
    if (!PLACE_ID_PATTERN.test(placeId)) {
      res.status(400).json({ ok: false, error: 'Invalid place id' });
      return;
    }

    try {
      const place = await fetchGooglePlacesDetails({
        placeId,
        languageCode: parsePlacesLanguage(req.query.lang),
        sessionToken: parsePlacesSessionToken(req.query.sessionToken),
      });
      if (!place) {
        res.status(404).json({ ok: false, error: 'Place not found' });
        return;
      }
      res.set({ 'Cache-Control': 'private, no-store' });
      res.json({ ok: true, place });
    } catch (error) {
      logCaughtError('places.details', error, { placeIdLength: placeId.length });
      res.status(statusFromUpstream(error)).json({
        ok: false,
        error: 'Unable to fetch place details',
      });
    }
  });
}

function parseLocation(
  req: Request,
): { ok: true; latitude: number; longitude: number } | { ok: false; error: string } {
  const latitude = parseCoordinate(req.query.lat);
  const longitude = parseCoordinate(req.query.lon ?? req.query.lng);
  if (latitude === null || longitude === null) {
    return { ok: false, error: 'lat and lon are required' };
  }
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return { ok: false, error: 'Invalid coordinates' };
  }
  return { ok: true, latitude, longitude };
}

function statusFromUpstream(error: unknown): number {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('HTTP 429')) return 429;
  return 502;
}
