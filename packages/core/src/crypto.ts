/**
 * Per-user backup encryption using the Web Crypto API (AES-256-GCM with a
 * PBKDF2-derived key). Available in browsers, Expo web and Node 20+. On React
 * Native `crypto.subtle` is not present by default, so callers must check
 * `isEncryptionAvailable()` and fall back (e.g. plaintext over TLS or a polyfill).
 */
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export interface EncryptedEnvelope {
  alg: 'AES-GCM';
  kdf: 'PBKDF2';
  iter: number;
  salt: string;
  iv: string;
  ct: string;
}

export function isEncryptionAvailable(): boolean {
  const subtle = (globalThis.crypto as Crypto | undefined)?.subtle;
  return typeof subtle?.importKey === 'function' && typeof subtle?.deriveKey === 'function';
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

async function deriveKey(
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

export async function encryptString(plaintext: string, passphrase: string): Promise<string> {
  const iterations = 100_000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, iterations);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    encoder.encode(plaintext) as BufferSource,
  );

  const envelope: EncryptedEnvelope = {
    alg: 'AES-GCM',
    kdf: 'PBKDF2',
    iter: iterations,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ct: toBase64(new Uint8Array(ciphertext)),
  };

  return JSON.stringify(envelope);
}

export async function decryptString(
  envelopeRaw: string,
  passphrase: string,
): Promise<string | null> {
  try {
    const envelope = JSON.parse(envelopeRaw) as EncryptedEnvelope;
    if (envelope.alg !== 'AES-GCM') return null;

    const salt = fromBase64(envelope.salt);
    const iv = fromBase64(envelope.iv);
    const ciphertext = fromBase64(envelope.ct);
    const key = await deriveKey(passphrase, salt, envelope.iter);

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

export function isEncryptedEnvelope(raw: string): boolean {
  try {
    const parsed = JSON.parse(raw) as Partial<EncryptedEnvelope>;
    return parsed?.alg === 'AES-GCM' && typeof parsed.ct === 'string';
  } catch {
    return false;
  }
}
