import type { Express, NextFunction, Request, Response } from 'express';
import type { CorsOptions } from 'cors';
import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import { createRedisRateLimitStore } from '../lib/rate-limit-store';

function parseList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Strict CORS: when CORS_ORIGINS is set, only those origins are accepted.
 * Requests without Origin (native apps, curl) are allowed. Production must
 * set CORS_ORIGINS (see assertCorsPolicy); an empty allowlist there denies
 * browser origins instead of reflecting them.
 */
export function buildCorsOptions(env: NodeJS.ProcessEnv = process.env): CorsOptions {
  const allowlist = parseList(env.CORS_ORIGINS);

  if (allowlist.length === 0) {
    if (env.NODE_ENV === 'production') {
      return {
        credentials: true,
        origin(_origin, callback) {
          callback(null, false);
        },
      };
    }
    return { origin: true, credentials: true };
  }

  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowlist.includes(origin)) {
        callback(null, true);
        return;
      }
      // Deny without throwing — cors package turns Error into HTTP 500.
      callback(null, false);
    },
  };
}

function rateLimitDisabled(): boolean {
  return process.env.RATE_LIMIT_DISABLED === 'true';
}

const passthrough = ((_req: Request, _res: Response, next: NextFunction) => {
  next();
}) as unknown as RateLimitRequestHandler;

async function buildLimiter(
  prefix: string,
  config: { windowMs: number; max: number; message: string },
): Promise<RateLimitRequestHandler> {
  if (rateLimitDisabled()) return passthrough;

  const store = await createRedisRateLimitStore(prefix);
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: config.message },
    ...(store ? { store } : {}),
  });
}

/** Coarse per-IP limiter applied to every request. */
export async function createGlobalRateLimiter(): Promise<RateLimitRequestHandler> {
  return buildLimiter('global', {
    windowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: parseNumber(process.env.RATE_LIMIT_MAX, 300),
    message: 'Too many requests',
  });
}

/** Stricter limiter for credential endpoints to slow brute-force attempts. */
export async function createAuthRateLimiter(): Promise<RateLimitRequestHandler> {
  return buildLimiter('auth', {
    windowMs: parseNumber(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: parseNumber(process.env.AUTH_RATE_LIMIT_MAX, 30),
    message: 'Too many authentication attempts',
  });
}

/** Limiter for the AI scan endpoint (LLM calls are expensive). */
export async function createScanRateLimiter(): Promise<RateLimitRequestHandler> {
  return buildLimiter('scan', {
    windowMs: parseNumber(process.env.SCAN_RATE_LIMIT_WINDOW_MS, 60 * 1000),
    max: parseNumber(process.env.SCAN_RATE_LIMIT_MAX, 30),
    message: 'Too many scan requests',
  });
}

/** Dedicated limiter for bursty, billable Google Pollen tile requests. */
export async function createPollenRateLimiter(): Promise<RateLimitRequestHandler> {
  return buildLimiter('pollen', {
    windowMs: parseNumber(process.env.POLLEN_RATE_LIMIT_WINDOW_MS, 60 * 1000),
    max: parseNumber(process.env.POLLEN_RATE_LIMIT_MAX, 120),
    message: 'Too many pollen tile requests',
  });
}

/** Dedicated limiter for Google Places Nearby / Text / Details (billable). */
export async function createPlacesRateLimiter(): Promise<RateLimitRequestHandler> {
  return buildLimiter('places', {
    windowMs: parseNumber(process.env.PLACES_RATE_LIMIT_WINDOW_MS, 60 * 1000),
    max: parseNumber(process.env.PLACES_RATE_LIMIT_MAX, 60),
    message: 'Too many places requests',
  });
}

/** Tighter limiter for Autocomplete (New) keystroke traffic. */
export async function createPlacesAutocompleteRateLimiter(): Promise<RateLimitRequestHandler> {
  return buildLimiter('places-autocomplete', {
    windowMs: parseNumber(process.env.PLACES_AUTOCOMPLETE_RATE_LIMIT_WINDOW_MS, 60 * 1000),
    max: parseNumber(process.env.PLACES_AUTOCOMPLETE_RATE_LIMIT_MAX, 30),
    message: 'Too many place suggestion requests',
  });
}

/** Limiter for Yandex JS embed HTML (keyed map loads). */
export async function createMapsRateLimiter(): Promise<RateLimitRequestHandler> {
  return buildLimiter('maps', {
    windowMs: parseNumber(process.env.MAPS_RATE_LIMIT_WINDOW_MS, 60 * 1000),
    max: parseNumber(process.env.MAPS_RATE_LIMIT_MAX, 60),
    message: 'Too many map embed requests',
  });
}

/** Limiter for unauthenticated analytics ingest. */
export async function createAnalyticsRateLimiter(): Promise<RateLimitRequestHandler> {
  return buildLimiter('analytics', {
    windowMs: parseNumber(process.env.ANALYTICS_RATE_LIMIT_WINDOW_MS, 60 * 1000),
    max: parseNumber(process.env.ANALYTICS_RATE_LIMIT_MAX, 60),
    message: 'Too many analytics requests',
  });
}

/** Limiter for public alias-feedback writes. */
export async function createAliasFeedbackRateLimiter(): Promise<RateLimitRequestHandler> {
  return buildLimiter('alias-feedback', {
    windowMs: parseNumber(process.env.ALIAS_FEEDBACK_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: parseNumber(process.env.ALIAS_FEEDBACK_RATE_LIMIT_MAX, 20),
    message: 'Too many alias feedback requests',
  });
}

/** Install endpoint rate limiters (Redis-backed when REDIS_URL is set). */
export async function installRateLimiters(app: Express): Promise<void> {
  app.use(await createGlobalRateLimiter());
  app.use('/api/auth', await createAuthRateLimiter());
  const scanLimiter = await createScanRateLimiter();
  app.use('/api/scan', scanLimiter);
  app.use('/api/ocr', scanLimiter);
  app.use('/api/dishes', scanLimiter);
  app.use('/api/medicines', scanLimiter);
  app.use('/api/pollen', await createPollenRateLimiter());
  // Air quality shares the pollen limiter profile (forecast + tile traffic).
  app.use('/api/air-quality', await createPollenRateLimiter());
  app.use('/api/places/autocomplete', await createPlacesAutocompleteRateLimiter());
  app.use('/api/places', await createPlacesRateLimiter());
  app.use('/api/maps', await createMapsRateLimiter());
  app.use('/api/analytics', await createAnalyticsRateLimiter());
  app.use('/api/alias-feedback', await createAliasFeedbackRateLimiter());
}
