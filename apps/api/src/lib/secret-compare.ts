import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Constant-time comparison for shared secrets sent as request headers
 * (`SYNC_API_KEY`, `MEDICINE_WRITE_KEY`, dashboard/admin keys).
 *
 * The values are hashed first so the comparison is over fixed-length buffers:
 * `timingSafeEqual` throws on a length mismatch, and returning early on length
 * would itself leak the secret's length.
 */
export function secretsMatch(provided: string | undefined, expected: string | undefined): boolean {
  if (!provided || !expected) return false;

  const providedDigest = createHash('sha256').update(provided).digest();
  const expectedDigest = createHash('sha256').update(expected).digest();
  return timingSafeEqual(providedDigest, expectedDigest);
}
