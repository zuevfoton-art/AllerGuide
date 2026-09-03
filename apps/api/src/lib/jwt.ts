import { SignJWT, jwtVerify } from 'jose';

const ISSUER = 'allerguide-api';
const AUDIENCE = 'allerguide-mobile';
const ACCESS_TYP = 'access';
const DEFAULT_ACCESS_TTL = '30m';
const DEFAULT_ACCESS_TTL_SECONDS = 30 * 60;

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

export function getAccessTokenTtl(): string {
  const raw = process.env.ACCESS_TOKEN_TTL?.trim();
  return raw && raw.length > 0 ? raw : DEFAULT_ACCESS_TTL;
}

export function getAccessTokenTtlSeconds(): number {
  const parsed = Number(process.env.ACCESS_TOKEN_TTL_SECONDS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ACCESS_TTL_SECONDS;
}

export async function signAuthToken(payload: AuthTokenPayload): Promise<string> {
  return new SignJWT({
    login: payload.login,
    loginType: payload.loginType,
    typ: ACCESS_TYP,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(String(payload.sub))
    .setIssuedAt()
    .setExpirationTime(getAccessTokenTtl())
    .sign(getSecret());
}

export async function verifyAuthToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    const sub = Number(payload.sub);
    if (!Number.isFinite(sub) || sub < 1 || !payload.login || !payload.loginType) return null;
    if (payload.typ != null && payload.typ !== ACCESS_TYP) return null;

    return {
      sub,
      login: String(payload.login),
      loginType: String(payload.loginType),
    };
  } catch {
    return null;
  }
}
