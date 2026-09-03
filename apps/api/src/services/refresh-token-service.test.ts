import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __resetRefreshTokenMemoryForTests,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeRefreshTokensForUser,
} from './refresh-token-service';

describe('refresh token memory store', () => {
  beforeEach(() => {
    delete process.env.DATABASE_URL;
    __resetRefreshTokenMemoryForTests();
  });

  afterEach(() => {
    __resetRefreshTokenMemoryForTests();
  });

  it('rotates a valid token and rejects reuse', async () => {
    const raw = await issueRefreshToken(7);
    const first = await rotateRefreshToken(raw);
    expect(first).toEqual({ userId: 7 });
    expect(await rotateRefreshToken(raw)).toBeNull();
  });

  it('revokes every token for the user when a revoked token is reused', async () => {
    const stolen = await issueRefreshToken(7);
    const sibling = await issueRefreshToken(7);
    expect(await rotateRefreshToken(stolen)).toEqual({ userId: 7 });
    expect(await rotateRefreshToken(stolen)).toBeNull();
    expect(await rotateRefreshToken(sibling)).toBeNull();
  });

  it('revokes a single token', async () => {
    const raw = await issueRefreshToken(3);
    await revokeRefreshToken(raw);
    expect(await rotateRefreshToken(raw)).toBeNull();
  });

  it('revokes every token for a user', async () => {
    const a = await issueRefreshToken(4);
    const b = await issueRefreshToken(4);
    await revokeRefreshTokensForUser(4);
    expect(await rotateRefreshToken(a)).toBeNull();
    expect(await rotateRefreshToken(b)).toBeNull();
  });
});
