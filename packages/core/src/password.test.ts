import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('hashes and verifies with pbkdf2 format', async () => {
    const stored = await hashPassword('secret123');
    expect(stored.startsWith('pbkdf2-sha256:')).toBe(true);

    const result = await verifyPassword('secret123', stored);
    expect(result.valid).toBe(true);
    expect(result.upgradedHash).toBeUndefined();
  });

  it('rejects wrong password', async () => {
    const stored = await hashPassword('secret123');
    const result = await verifyPassword('wrong', stored);
    expect(result.valid).toBe(false);
  });

  it('migrates legacy sha256 hashes', async () => {
    const { sha256 } = await import('@noble/hashes/sha2');
    const { bytesToHex } = await import('@noble/hashes/utils');
    const legacy = bytesToHex(sha256(new TextEncoder().encode('allerguide:secret123')));
    const result = await verifyPassword('secret123', legacy);
    expect(result.valid).toBe(true);
    expect(result.upgradedHash?.startsWith('pbkdf2-sha256:')).toBe(true);
  });
});
