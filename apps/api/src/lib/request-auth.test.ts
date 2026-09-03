import { describe, expect, it } from 'vitest';
import type { Request } from 'express';
import { parseCookies, readAccessToken, readRefreshToken, wantsCookieSession } from './request-auth';

function fakeReq(init: { cookie?: string; authorization?: string; origin?: string; body?: unknown }): Request {
  return {
    headers: {
      cookie: init.cookie,
      authorization: init.authorization,
    },
    header(name: string) {
      if (name.toLowerCase() === 'authorization') return init.authorization;
      if (name.toLowerCase() === 'cookie') return init.cookie;
      if (name.toLowerCase() === 'origin') return init.origin;
      return undefined;
    },
    get(name: string) {
      if (name.toLowerCase() === 'origin') return init.origin;
      return undefined;
    },
    body: init.body ?? {},
  } as unknown as Request;
}

describe('request-auth helpers', () => {
  it('reads the access token from a Bearer header first', () => {
    const req = fakeReq({
      authorization: 'Bearer header-jwt',
      cookie: 'ag_access=cookie-jwt',
    });
    expect(readAccessToken(req)).toBe('header-jwt');
  });

  it('falls back to the httpOnly access cookie', () => {
    const req = fakeReq({ cookie: 'ag_access=cookie-jwt; ag_refresh=r1' });
    expect(readAccessToken(req)).toBe('cookie-jwt');
    expect(parseCookies(req).ag_refresh).toBe('r1');
  });

  it('prefers a refresh token in the body over the cookie', () => {
    const req = fakeReq({ cookie: 'ag_refresh=cookie-r', body: { refreshToken: 'body-r' } });
    expect(readRefreshToken(req)).toBe('body-r');
  });

  it('treats a browser Origin as a cookie session', () => {
    expect(wantsCookieSession(fakeReq({ origin: 'http://localhost:5000' }))).toBe(true);
    expect(wantsCookieSession(fakeReq({}))).toBe(false);
  });
});
