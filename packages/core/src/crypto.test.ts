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
});
