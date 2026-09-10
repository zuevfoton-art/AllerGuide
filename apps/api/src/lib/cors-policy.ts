/**
 * Production must not reflect arbitrary browser origins: that would let any
 * site make credentialed requests once httpOnly auth cookies exist.
 */
export function parseCorsOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  return (env.CORS_ORIGINS ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * CORS and cookie-authenticated mutations share this allowlist. Missing Origin
 * is treated as a non-browser client (native, curl) and is allowed.
 */
export function isAllowedCorsOrigin(
  origin: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!origin) return true;
  const allowlist = parseCorsOrigins(env);
  if (allowlist.length === 0) return env.NODE_ENV !== 'production';
  return allowlist.includes(origin);
}

export function assertCorsPolicy(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV !== 'production') return;
  if (parseCorsOrigins(env).length > 0) return;
  throw new Error('CORS_ORIGINS must be set in production');
}
