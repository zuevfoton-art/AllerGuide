import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { settings } = vi.hoisted(() => {
  const settings = new Map<string, string>();
  return { settings };
});

const secureSettings = new Map<string, string>();

vi.mock('@/src/services/settings-service', () => ({
  getSetting: (key: string) => settings.get(key) ?? null,
  setSetting: (key: string, value: string) => {
    settings.set(key, value);
  },
}));

vi.mock('@/src/services/secure-settings-service', () => ({
  getSensitiveSetting: (key: string) => secureSettings.get(key) ?? null,
  setSensitiveSettingSync: (key: string, value: string) => {
    secureSettings.set(key, value);
    settings.delete(key);
  },
}));

// Mock must be registered before backup-crypto loads settings-service.
// eslint-disable-next-line import/first
import {
  decryptBackup,
  encryptBackup,
  formatRecoveryKeyForDisplay,
  generateRecoveryKey,
  getMaestroFixtureRecoveryKey,
  getBackupPassphrase,
  hasRecoveryKey,
  isRecoveryKeyConfirmed,
  markRecoveryKeyConfirmed,
  normalizeRecoveryKey,
  setRecoveryKey,
  usesLegacyDeviceKeyOnly,
  validateRecoveryKey,
} from './backup-crypto';

const SAMPLE_KEY = 'a'.repeat(64);

beforeEach(() => {
  settings.clear();
  secureSettings.clear();
});

afterEach(() => {
  settings.clear();
  secureSettings.clear();
});

describe('recovery key format', () => {
  it('generates 64-char hex key', () => {
    const key = generateRecoveryKey();
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(validateRecoveryKey(key)).toBe(true);
  });

  it('normalizes dashed/spaced input', () => {
    const dashed = formatRecoveryKeyForDisplay(SAMPLE_KEY);
    expect(normalizeRecoveryKey(dashed)).toBe(SAMPLE_KEY);
    expect(normalizeRecoveryKey(`  ${SAMPLE_KEY.slice(0, 8)}-${SAMPLE_KEY.slice(8)}  `)).toBe(SAMPLE_KEY);
  });

  it('rejects wrong length', () => {
    expect(normalizeRecoveryKey('abc')).toBeNull();
    expect(validateRecoveryKey('g'.repeat(64))).toBe(false);
  });

  it('reads Maestro fixture key from env when valid', () => {
    vi.stubEnv('EXPO_PUBLIC_MAESTRO_TEST_RECOVERY_KEY', SAMPLE_KEY);
    expect(getMaestroFixtureRecoveryKey()).toBe(SAMPLE_KEY);
    vi.unstubAllEnvs();
    expect(getMaestroFixtureRecoveryKey()).toBeNull();
  });
});

describe('recovery key storage', () => {
  it('stores normalized key and tracks confirmation', () => {
    const display = formatRecoveryKeyForDisplay(SAMPLE_KEY);
    expect(setRecoveryKey(display)).toEqual({ ok: true });
    expect(hasRecoveryKey()).toBe(true);
    expect(isRecoveryKeyConfirmed()).toBe(false);
    markRecoveryKeyConfirmed();
    expect(isRecoveryKeyConfirmed()).toBe(true);
  });

  it('getBackupPassphrase prefers recovery key over legacy secret', () => {
    settings.set('backupSecret', 'legacy-device-secret-value-here-0123456789ab');
    setRecoveryKey(SAMPLE_KEY);
    expect(getBackupPassphrase()).toBe(SAMPLE_KEY);
  });

  it('detects legacy-only device key', () => {
    settings.set('backupSecret', 'legacy');
    expect(usesLegacyDeviceKeyOnly()).toBe(true);
    setRecoveryKey(SAMPLE_KEY);
    expect(usesLegacyDeviceKeyOnly()).toBe(false);
  });
});

describe('encryptBackup / decryptBackup', () => {
  it('roundtrips with recovery key passphrase override', async () => {
    if (!(globalThis.crypto as Crypto | undefined)?.subtle) return;

    const plaintext = '{"profiles":[]}';
    const envelope = await encryptBackup(plaintext, { passphrase: SAMPLE_KEY });
    expect(envelope).toBeTruthy();

    const decrypted = await decryptBackup(envelope!, { passphrase: SAMPLE_KEY });
    expect(decrypted).toBe(plaintext);
  });

  it('returns null on wrong recovery key', async () => {
    if (!(globalThis.crypto as Crypto | undefined)?.subtle) return;

    const envelope = await encryptBackup('secret', { passphrase: SAMPLE_KEY });
    expect(envelope).toBeTruthy();

    const wrong = 'b'.repeat(64);
    const decrypted = await decryptBackup(envelope!, { passphrase: wrong });
    expect(decrypted).toBeNull();
  });
});
