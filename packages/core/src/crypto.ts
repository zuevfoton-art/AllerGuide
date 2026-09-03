/**
 * Per-user backup encryption (AES-256-GCM + PBKDF2-SHA256).
 * Prefers Web Crypto when `crypto.subtle` exists (browsers, Expo web, Node).
 * Falls back to `@noble/ciphers` + `@noble/hashes` on Hermes / React Native,
 * where SubtleCrypto is absent. Envelope format is identical on both paths
 * so web and native can restore each other's backups.
 */
import { gcm } from '@noble/ciphers/aes';
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha2';
import { getSecureRandomBytes } from './secure-random';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const AES_KEY_BYTES = 32;
const GCM_IV_BYTES = 12;
const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;

export interface EncryptedEnvelope {
  alg: 'AES-GCM';
  kdf: 'PBKDF2';
  iter: number;
  salt: string;
  iv: string;
  ct: string;
}

function hasSubtleCrypto(): boolean {
  const subtle = (globalThis.crypto as Crypto | undefined)?.subtle;
  return typeof subtle?.importKey === 'function' && typeof subtle?.deriveKey === 'function';
}

/** True when a CSPRNG is available (Web Crypto or expo-crypto via `setSecureRandomBytes`). */
export function isEncryptionAvailable(): boolean {
  try {
    getSecureRandomBytes(1);
    return true;
  } catch {
    return false;
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function deriveKeyBytes(passphrase: string, salt: Uint8Array, iterations: number): Uint8Array {
  return pbkdf2(sha256, encoder.encode(passphrase), salt, {
    c: iterations,
    dkLen: AES_KEY_BYTES,
  });
}

async function deriveSubtleKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase) as BufferSource,
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function encryptWithNoble(plaintext: string, passphrase: string): string {
  const salt = getSecureRandomBytes(SALT_BYTES);
  const iv = getSecureRandomBytes(GCM_IV_BYTES);
  const key = deriveKeyBytes(passphrase, salt, PBKDF2_ITERATIONS);
  const ciphertext = gcm(key, iv).encrypt(encoder.encode(plaintext));

  const envelope: EncryptedEnvelope = {
    alg: 'AES-GCM',
    kdf: 'PBKDF2',
    iter: PBKDF2_ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ct: toBase64(ciphertext),
  };
  return JSON.stringify(envelope);
}

function decryptWithNoble(envelope: EncryptedEnvelope, passphrase: string): string | null {
  try {
    const salt = fromBase64(envelope.salt);
    const iv = fromBase64(envelope.iv);
    const ciphertext = fromBase64(envelope.ct);
    const key = deriveKeyBytes(passphrase, salt, envelope.iter);
    return decoder.decode(gcm(key, iv).decrypt(ciphertext));
  } catch {
    return null;
  }
}

async function encryptWithSubtle(plaintext: string, passphrase: string): Promise<string> {
  const salt = getSecureRandomBytes(SALT_BYTES);
  const iv = getSecureRandomBytes(GCM_IV_BYTES);
  const key = await deriveSubtleKey(passphrase, salt, PBKDF2_ITERATIONS);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    encoder.encode(plaintext) as BufferSource,
  );

  const envelope: EncryptedEnvelope = {
    alg: 'AES-GCM',
    kdf: 'PBKDF2',
    iter: PBKDF2_ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ct: toBase64(new Uint8Array(ciphertext)),
  };
  return JSON.stringify(envelope);
}

async function decryptWithSubtle(
  envelope: EncryptedEnvelope,
  passphrase: string,
): Promise<string | null> {
  try {
    const salt = fromBase64(envelope.salt);
    const iv = fromBase64(envelope.iv);
    const ciphertext = fromBase64(envelope.ct);
    const key = await deriveSubtleKey(passphrase, salt, envelope.iter);
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ciphertext as BufferSource,
    );
    return decoder.decode(plaintext);
  } catch {
    return null;
  }
}

export async function encryptString(plaintext: string, passphrase: string): Promise<string> {
  if (!isEncryptionAvailable()) {
    throw new Error('Backup encryption requires a CSPRNG');
  }
  if (hasSubtleCrypto()) {
    return encryptWithSubtle(plaintext, passphrase);
  }
  return encryptWithNoble(plaintext, passphrase);
}

export async function decryptString(
  envelopeRaw: string,
  passphrase: string,
): Promise<string | null> {
  try {
    const envelope = JSON.parse(envelopeRaw) as EncryptedEnvelope;
    if (envelope.alg !== 'AES-GCM') return null;

    if (hasSubtleCrypto()) {
      const fromSubtle = await decryptWithSubtle(envelope, passphrase);
      if (fromSubtle !== null) return fromSubtle;
    }
    return decryptWithNoble(envelope, passphrase);
  } catch {
    return null;
  }
}

export function isEncryptedEnvelope(raw: string): boolean {
  try {
    const parsed = JSON.parse(raw) as Partial<EncryptedEnvelope>;
    return (
      parsed?.alg === 'AES-GCM' &&
      parsed.kdf === 'PBKDF2' &&
      typeof parsed.iter === 'number' &&
      Number.isFinite(parsed.iter) &&
      parsed.iter > 0 &&
      typeof parsed.salt === 'string' &&
      parsed.salt.length > 0 &&
      typeof parsed.iv === 'string' &&
      parsed.iv.length > 0 &&
      typeof parsed.ct === 'string' &&
      parsed.ct.length > 0
    );
  } catch {
    return false;
  }
}
