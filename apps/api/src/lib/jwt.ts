import { SignJWT, jwtVerify } from 'jose';

const ISSUER = 'allerguide-api';
const AUDIENCE = 'allerguide-mobile';

export interface AuthTokenPayload {
  sub: number;
  login: string;
  loginType: string;
}

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return new TextEncoder().encode(secret);
}

export async function signAuthToken(payload: AuthTokenPayload): Promise<string> {
  return new SignJWT({
    login: payload.login,
    loginType: payload.loginType,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(String(payload.sub))
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

export async function verifyAuthToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    const sub = Number(payload.sub);
    if (!sub || !payload.login || !payload.loginType) return null;

    return {
      sub,
      login: String(payload.login),
      loginType: String(payload.loginType),
    };
  } catch {
    return null;
  }
}
