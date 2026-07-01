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
 * Strict CORS in production: when CORS_ORIGINS is set (comma-separated allowlist)
 * only those origins are accepted. Requests without an Origin header (mobile apps,
 * curl, server-to-server) are always allowed. When CORS_ORIGINS is unset we fall
 * back to reflecting the request origin, which is convenient for local development.
 */
export function buildCorsOptions(): CorsOptions {
  const allowlist = parseList(process.env.CORS_ORIGINS);

  if (allowlist.length === 0) {
    return { origin: true, credentials: true };
  }

  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowlist.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin not allowed by CORS'));
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

/** Install global/auth/scan rate limiters (Redis-backed when REDIS_URL is set). */
export async function installRateLimiters(app: Express): Promise<void> {
  app.use(await createGlobalRateLimiter());
  app.use('/api/auth', await createAuthRateLimiter());
  app.use('/api/scan', await createScanRateLimiter());
}
