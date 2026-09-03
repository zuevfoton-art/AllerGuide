/**
 * Production must not reflect arbitrary browser origins: that would let any
 * site make credentialed requests once httpOnly auth cookies exist.
 */
export function assertCorsPolicy(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV !== 'production') return;
  const allowlist = (env.CORS_ORIGINS ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (allowlist.length > 0) return;

  throw new Error('CORS_ORIGINS must be set in production');
}
