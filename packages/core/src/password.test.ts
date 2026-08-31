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

  it('uses an injected CSPRNG when Web Crypto is unavailable', async () => {
    const { setSecureRandomBytes } = await import('./secure-random');
    const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: undefined,
    });
    setSecureRandomBytes((length) => {
      const bytes = new Uint8Array(length);
      for (let i = 0; i < length; i += 1) bytes[i] = i + 1;
      return bytes;
    });
    try {
      const stored = await hashPassword('secret123');
      expect(stored.startsWith('pbkdf2-sha256:')).toBe(true);
      const verified = await verifyPassword('secret123', stored);
      expect(verified.valid).toBe(true);
    } finally {
      setSecureRandomBytes(null);
      if (original) {
        Object.defineProperty(globalThis, 'crypto', original);
      } else {
        Reflect.deleteProperty(globalThis, 'crypto');
      }
    }
  });
});
