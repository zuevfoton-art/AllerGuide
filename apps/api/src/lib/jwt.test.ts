import { afterEach, describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';
import { signAuthToken, verifyAuthToken } from './jwt';

const SECRET = 'test-secret-key-at-least-32-characters-long';

afterEach(() => {
  delete process.env.ACCESS_TOKEN_TTL;
});

describe('access JWT', () => {
  it('round-trips a short-lived access token', async () => {
    process.env.JWT_SECRET = SECRET;
    const token = await signAuthToken({ sub: 9, login: 'a@b.c', loginType: 'email' });
    const payload = await verifyAuthToken(token);
    expect(payload).toEqual({ sub: 9, login: 'a@b.c', loginType: 'email' });
  });

  it('rejects a token with a non-access typ', async () => {
    process.env.JWT_SECRET = SECRET;
    const token = await new SignJWT({ login: 'a@b.c', loginType: 'email', typ: 'refresh' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer('allerguide-api')
      .setAudience('allerguide-mobile')
      .setSubject('9')
      .setIssuedAt()
      .setExpirationTime('30m')
      .sign(new TextEncoder().encode(SECRET));

    expect(await verifyAuthToken(token)).toBeNull();
  });
});
