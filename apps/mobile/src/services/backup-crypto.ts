import { decryptString, encryptString, isEncryptionAvailable } from '@allerguide/core';
import { getSetting } from '@/src/services/settings-service';
import { getSensitiveSetting, setSensitiveSettingSync } from '@/src/services/secure-settings-service';

/** Legacy device-only secret (pre–recovery-key). Migrated in P1.3e. */
const LEGACY_BACKUP_SECRET_KEY = 'backupSecret';

/** Normalized 64-char hex recovery key (32 bytes). */
const RECOVERY_KEY_SETTING = 'recoveryKey';

/** User acknowledged saving the key (`true` / absent). */
const RECOVERY_KEY_CONFIRMED_SETTING = 'recoveryKeyConfirmed';

const RECOVERY_KEY_BYTE_LENGTH = 32;
const RECOVERY_KEY_HEX_LENGTH = RECOVERY_KEY_BYTE_LENGTH * 2;
const DISPLAY_GROUP_LENGTH = 8;

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
 * Strip separators/spaces and validate 32-byte hex recovery key.
 * Returns lowercase normalized form or null when invalid.
 */
export function normalizeRecoveryKey(input: string): string | null {
  const normalized = input.replace(/[\s-]/g, '').toLowerCase();
  if (!/^[0-9a-f]+$/.test(normalized)) return null;
  if (normalized.length !== RECOVERY_KEY_HEX_LENGTH) return null;
  return normalized;
}

export function validateRecoveryKey(input: string): boolean {
  return normalizeRecoveryKey(input) != null;
}

/** Human-readable groups: `abcd1234-ef567890-...` (8×8 hex). */
export function formatRecoveryKeyForDisplay(normalizedKey: string): string {
  const key = normalizeRecoveryKey(normalizedKey);
  if (!key) return normalizedKey;
  const groups: string[] = [];
  for (let i = 0; i < key.length; i += DISPLAY_GROUP_LENGTH) {
    groups.push(key.slice(i, i + DISPLAY_GROUP_LENGTH));
  }
  return groups.join('-');
}

/**
 * Generate a new recovery key (does not persist — caller shows UX then `setRecoveryKey`).
 */
export function generateRecoveryKey(): string {
  return randomHex(RECOVERY_KEY_BYTE_LENGTH);
}

/** Fixed key for Maestro staging E2E when `EXPO_PUBLIC_MAESTRO_TEST_RECOVERY_KEY` is set (staging CI only). */
export function getMaestroFixtureRecoveryKey(): string | null {
  const raw = process.env.EXPO_PUBLIC_MAESTRO_TEST_RECOVERY_KEY;
  if (!raw) return null;
  return normalizeRecoveryKey(raw);
}

export function hasRecoveryKey(): boolean {
  return getStoredRecoveryKey() != null;
}

export function getStoredRecoveryKey(): string | null {
  const raw = getSensitiveSetting(RECOVERY_KEY_SETTING) ?? getSetting(RECOVERY_KEY_SETTING);
  if (!raw) return null;
  return normalizeRecoveryKey(raw);
}

export function setRecoveryKey(input: string): { ok: true } | { ok: false; error: string } {
  const normalized = normalizeRecoveryKey(input);
  if (!normalized) {
    return { ok: false, error: 'invalid_recovery_key' };
  }
  setSensitiveSettingSync(RECOVERY_KEY_SETTING, normalized);
  setSensitiveSettingSync(RECOVERY_KEY_CONFIRMED_SETTING, 'false');
  return { ok: true };
}

export function markRecoveryKeyConfirmed(): void {
  if (!hasRecoveryKey()) return;
  setSensitiveSettingSync(RECOVERY_KEY_CONFIRMED_SETTING, 'true');
}

export function isRecoveryKeyConfirmed(): boolean {
  return (
    getSensitiveSetting(RECOVERY_KEY_CONFIRMED_SETTING) === 'true' ||
    getSetting(RECOVERY_KEY_CONFIRMED_SETTING) === 'true'
  );
}

/** Device had auto-generated backupSecret before recovery-key rollout. */
export function usesLegacyDeviceKeyOnly(): boolean {
  return Boolean(getSensitiveSetting(LEGACY_BACKUP_SECRET_KEY) ?? getSetting(LEGACY_BACKUP_SECRET_KEY)) && !hasRecoveryKey();
}

/**
 * Passphrase for AES-GCM backup encryption.
 * Prefers user recovery key; falls back to legacy device-only secret.
 */
export function getBackupPassphrase(): string {
  const recovery = getStoredRecoveryKey();
  if (recovery) return recovery;

  let secret = getSensitiveSetting(LEGACY_BACKUP_SECRET_KEY) ?? getSetting(LEGACY_BACKUP_SECRET_KEY);
  if (!secret) {
    secret = randomHex(RECOVERY_KEY_BYTE_LENGTH);
    setSensitiveSettingSync(LEGACY_BACKUP_SECRET_KEY, secret);
  }
  return secret;
}

export { isEncryptionAvailable };

export async function encryptBackup(
  plaintext: string,
  options?: { passphrase?: string },
): Promise<string | null> {
  if (!isEncryptionAvailable()) return null;
  try {
    const passphrase = options?.passphrase ?? getBackupPassphrase();
    return await encryptString(plaintext, passphrase);
  } catch {
    return null;
  }
}

export async function decryptBackup(
  envelope: string,
  options?: { passphrase?: string },
): Promise<string | null> {
  if (!isEncryptionAvailable()) return null;
  const passphrase = options?.passphrase ?? getBackupPassphrase();
  return decryptString(envelope, passphrase);
}
