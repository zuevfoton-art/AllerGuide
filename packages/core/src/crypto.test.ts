import { describe, expect, it } from 'vitest';
import {
  decryptString,
  encryptString,
  isEncryptedEnvelope,
  isEncryptionAvailable,
} from './crypto';

describe('per-user backup crypto', () => {
  it('reports availability in the test (Node) runtime', () => {
    expect(isEncryptionAvailable()).toBe(true);
  });

  it('round-trips a payload with the correct passphrase', async () => {
    const plaintext = JSON.stringify({ profiles: [{ id: 1, name: 'Анна' }] });
    const envelope = await encryptString(plaintext, 'correct horse battery');

    expect(isEncryptedEnvelope(envelope)).toBe(true);
    expect(isEncryptedEnvelope(JSON.stringify({ alg: 'AES-GCM', ct: 'deadbeef' }))).toBe(false);
    expect(envelope).not.toContain('Анна');

    const decrypted = await decryptString(envelope, 'correct horse battery');
    expect(decrypted).toBe(plaintext);
  });

  it('fails to decrypt with the wrong passphrase', async () => {
    const envelope = await encryptString('secret', 'passphrase-a');
    const decrypted = await decryptString(envelope, 'passphrase-b');
    expect(decrypted).toBeNull();
  });

  it('produces different ciphertext for repeated encryptions (random IV/salt)', async () => {
    const a = await encryptString('same', 'key');
    const b = await encryptString('same', 'key');
    expect(a).not.toBe(b);
  });

  it('round-trips via noble when SubtleCrypto is missing', async () => {
    const cryptoObj = globalThis.crypto as Crypto;
    const original = cryptoObj.subtle;
    Object.defineProperty(cryptoObj, 'subtle', { configurable: true, value: undefined });
    try {
      const envelope = await encryptString('native-path', 'passphrase');
      expect(isEncryptedEnvelope(envelope)).toBe(true);
      expect(envelope).not.toContain('native-path');
      expect(await decryptString(envelope, 'passphrase')).toBe('native-path');
    } finally {
      Object.defineProperty(cryptoObj, 'subtle', { configurable: true, value: original });
    }
  });

  it('decrypts a Web Crypto envelope after SubtleCrypto is removed', async () => {
    const envelope = await encryptString('cross-runtime', 'shared-key');
    const cryptoObj = globalThis.crypto as Crypto;
    const original = cryptoObj.subtle;
    Object.defineProperty(cryptoObj, 'subtle', { configurable: true, value: undefined });
    try {
      expect(await decryptString(envelope, 'shared-key')).toBe('cross-runtime');
    } finally {
      Object.defineProperty(cryptoObj, 'subtle', { configurable: true, value: original });
    }
  });
});
