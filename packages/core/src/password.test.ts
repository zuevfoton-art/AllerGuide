import { afterEach, describe, expect, it } from 'vitest';
import {
  PASSWORD_HASH_ITERATIONS_INTERPRETED,
  PASSWORD_HASH_ITERATIONS_JIT,
  getPasswordHashIterations,
  hashPassword,
  setPasswordHashIterations,
  verifyPassword,
} from './password';

describe('password hash cost', () => {
  afterEach(() => {
    setPasswordHashIterations(PASSWORD_HASH_ITERATIONS_JIT);
  });

  it('defaults to the OWASP cost for JIT runtimes', () => {
    expect(getPasswordHashIterations()).toBe(PASSWORD_HASH_ITERATIONS_JIT);
  });

  it('writes the configured cost into the stored hash', async () => {
    setPasswordHashIterations(PASSWORD_HASH_ITERATIONS_INTERPRETED);
    const stored = await hashPassword('secret123');
    expect(stored.split(':')[1]).toBe(String(PASSWORD_HASH_ITERATIONS_INTERPRETED));
  });

  it('rejects a non-positive cost', () => {
    expect(() => setPasswordHashIterations(0)).toThrow(/positive integer/);
    expect(() => setPasswordHashIterations(1.5)).toThrow(/positive integer/);
  });

  it('verifies a hash written at another cost and re-hashes at the configured one', async () => {
    setPasswordHashIterations(PASSWORD_HASH_ITERATIONS_INTERPRETED);
    const stored = await hashPassword('secret123');

    setPasswordHashIterations(20_000);
    const result = await verifyPassword('secret123', stored);

    expect(result.valid).toBe(true);
    expect(result.upgradedHash?.split(':')[1]).toBe('20000');
  });
});

describe('password hashing', () => {
  afterEach(() => {
    setPasswordHashIterations(PASSWORD_HASH_ITERATIONS_JIT);
  });

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
