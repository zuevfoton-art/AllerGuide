import type { Request, Response } from 'express';
import { getAccessTokenTtlSeconds, verifyAuthToken, type AuthTokenPayload } from './jwt';

export const ACCESS_COOKIE = 'ag_access';
export const REFRESH_COOKIE = 'ag_refresh';

const DEFAULT_REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};

  const cookies: Record<string, string> = {};
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    if (!name) continue;
    cookies[name] = decodeURIComponent(part.slice(separator + 1).trim());
  }
  return cookies;
}

export function readAccessToken(req: Request): string | null {
  const header = req.header('authorization');
  if (header?.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length).trim();
    if (token) return token;
  }
  return parseCookies(req)[ACCESS_COOKIE] || null;
}

export function readRefreshToken(req: Request): string | null {
  const bodyToken = (req.body as { refreshToken?: unknown } | undefined)?.refreshToken;
  if (typeof bodyToken === 'string' && bodyToken.trim()) return bodyToken.trim();
  return parseCookies(req)[REFRESH_COOKIE] || null;
}

export async function resolveAuthPayload(req: Request): Promise<AuthTokenPayload | null> {
  const token = readAccessToken(req);
  if (!token) return null;
  return verifyAuthToken(token);
}

export function wantsCookieSession(req: Request): boolean {
  return Boolean(req.get('origin')) || Boolean(parseCookies(req)[REFRESH_COOKIE]);
}

function isLocalhostHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}

function cookieSameSite(req: Request): 'lax' | 'none' {
  const origin = req.get('origin');
  if (!origin) return 'lax';
  try {
    const originHost = new URL(origin).hostname;
    if (originHost === req.hostname) return 'lax';
    if (isLocalhostHost(originHost) && isLocalhostHost(req.hostname)) return 'lax';
  } catch {
    return 'none';
  }
  return 'none';
}

function cookieFlags(req: Request): { secure: boolean; sameSite: 'lax' | 'none' } {
  const sameSite = cookieSameSite(req);
  return {
    sameSite,
    secure: sameSite === 'none' || process.env.NODE_ENV === 'production',
  };
}

function refreshTtlMs(): number {
  const parsed = Number(process.env.REFRESH_TOKEN_TTL_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REFRESH_TTL_MS;
}

export function setAuthCookies(
  req: Request,
  res: Response,
  tokens: { access: string; refresh: string },
): void {
  const flags = cookieFlags(req);
  res.cookie(ACCESS_COOKIE, tokens.access, {
    httpOnly: true,
    secure: flags.secure,
    sameSite: flags.sameSite,
    path: '/',
    maxAge: getAccessTokenTtlSeconds() * 1000,
  });
  res.cookie(REFRESH_COOKIE, tokens.refresh, {
    httpOnly: true,
    secure: flags.secure,
    sameSite: flags.sameSite,
    path: '/api/auth',
    maxAge: refreshTtlMs(),
  });
}

export function clearAuthCookies(req: Request, res: Response): void {
  const flags = cookieFlags(req);
  res.clearCookie(ACCESS_COOKIE, {
    path: '/',
    secure: flags.secure,
    sameSite: flags.sameSite,
  });
  res.clearCookie(REFRESH_COOKIE, {
    path: '/api/auth',
    secure: flags.secure,
    sameSite: flags.sameSite,
  });
}
