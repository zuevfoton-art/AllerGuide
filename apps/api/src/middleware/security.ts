import type { NextFunction, Request, Response } from 'express';
import type { CorsOptions } from 'cors';
import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';

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

/** Coarse per-IP limiter applied to every request. */
export function createGlobalRateLimiter(): RateLimitRequestHandler {
  if (rateLimitDisabled()) return passthrough;
  return rateLimit({
    windowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: parseNumber(process.env.RATE_LIMIT_MAX, 300),
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: 'Too many requests' },
  });
}

/** Stricter limiter for credential endpoints to slow brute-force attempts. */
export function createAuthRateLimiter(): RateLimitRequestHandler {
  if (rateLimitDisabled()) return passthrough;
  return rateLimit({
    windowMs: parseNumber(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: parseNumber(process.env.AUTH_RATE_LIMIT_MAX, 30),
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: 'Too many authentication attempts' },
  });
}

/** Limiter for the AI scan endpoint (LLM calls are expensive). */
export function createScanRateLimiter(): RateLimitRequestHandler {
  if (rateLimitDisabled()) return passthrough;
  return rateLimit({
    windowMs: parseNumber(process.env.SCAN_RATE_LIMIT_WINDOW_MS, 60 * 1000),
    max: parseNumber(process.env.SCAN_RATE_LIMIT_MAX, 30),
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: 'Too many scan requests' },
  });
}

/** Limiter for voice transcription (Whisper calls). */
export function createTranscribeRateLimiter(): RateLimitRequestHandler {
  if (rateLimitDisabled()) return passthrough;
  return rateLimit({
    windowMs: parseNumber(process.env.TRANSCRIBE_RATE_LIMIT_WINDOW_MS, 60 * 1000),
    max: parseNumber(process.env.TRANSCRIBE_RATE_LIMIT_MAX, 20),
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: 'Too many transcription requests' },
  });
}
