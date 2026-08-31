import { describe, expect, it } from 'vitest';
import { getSecureRandomBytes, setSecureRandomBytes } from './secure-random';

function withCrypto(value: unknown, run: () => void): void {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value,
  });
  try {
    run();
  } finally {
    if (original) {
      Object.defineProperty(globalThis, 'crypto', original);
    } else {
      Reflect.deleteProperty(globalThis, 'crypto');
    }
  }
}

describe('getSecureRandomBytes', () => {
  it('uses the injected implementation when set', () => {
    setSecureRandomBytes((length) => new Uint8Array(length).fill(3));
    try {
      expect(Array.from(getSecureRandomBytes(4))).toEqual([3, 3, 3, 3]);
    } finally {
      setSecureRandomBytes(null);
    }
  });

  it('falls back to Web Crypto when no impl is injected', () => {
    setSecureRandomBytes(null);
    const bytes = getSecureRandomBytes(8);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(8);
  });

  it('throws the Hermes error when crypto is missing and nothing is injected', () => {
    setSecureRandomBytes(null);
    withCrypto(undefined, () => {
      expect(() => getSecureRandomBytes(4)).toThrow('crypto.getRandomValues must be defined');
    });
  });

  it('reads globalThis.crypto at call time, not import time', () => {
    setSecureRandomBytes(null);
    withCrypto(undefined, () => {
      expect(() => getSecureRandomBytes(1)).toThrow('crypto.getRandomValues must be defined');
    });
    withCrypto(
      {
        getRandomValues: (array: Uint8Array) => {
          array.fill(7);
          return array;
        },
      },
      () => {
        expect(Array.from(getSecureRandomBytes(3))).toEqual([7, 7, 7]);
      },
    );
  });
});
