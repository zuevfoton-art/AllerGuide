import { decryptString, encryptString, isEncryptionAvailable } from '@allerguide/core';
import { getSetting, setSetting } from '@/src/services/settings-service';

const BACKUP_SECRET_KEY = 'backupSecret';

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  const webCrypto = (globalThis as { crypto?: Crypto }).crypto;
  if (webCrypto?.getRandomValues) {
    webCrypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Device-held backup key. Cloud backups are encrypted with this secret so the
 * server only ever stores ciphertext (zero-knowledge). NOTE: the key currently
 * lives on the device only — same-device restore works, but cross-device restore
 * needs key escrow / a password-derived key (tracked as a follow-up).
 */
export function getBackupPassphrase(): string {
  let secret = getSetting(BACKUP_SECRET_KEY);
  if (!secret) {
    secret = randomHex(32);
    setSetting(BACKUP_SECRET_KEY, secret);
  }
  return secret;
}

export { isEncryptionAvailable };

export async function encryptBackup(plaintext: string): Promise<string | null> {
  if (!isEncryptionAvailable()) return null;
  try {
    return await encryptString(plaintext, getBackupPassphrase());
  } catch {
    return null;
  }
}

export async function decryptBackup(envelope: string): Promise<string | null> {
  if (!isEncryptionAvailable()) return null;
  return decryptString(envelope, getBackupPassphrase());
}
