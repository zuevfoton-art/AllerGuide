#!/usr/bin/env node
/**
 * EAS post-install: keep the native Android Maps key in sync with the JS bundle.
 * Committed android/ uses Gradle manifestPlaceholders (not expo prebuild).
 * An invalid EXPO_PUBLIC_GOOGLE_MAPS_API_KEY (CLI error text) becomes a gray map.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GOOGLE_MAPS_API_KEY_PATTERN = /^AIza[0-9A-Za-z_-]{20,}$/;
const DOT_ENV_FILES = ['.env', '.env.local', '.env.preview', '.env.eas'];

export function isGoogleMapsApiKey(value) {
  return typeof value === 'string' && GOOGLE_MAPS_API_KEY_PATTERN.test(value.trim());
}

export function resolveMapsApiKey(raw) {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed) return { ok: true, key: '' };
  if (!isGoogleMapsApiKey(trimmed)) return { ok: false, key: '' };
  return { ok: true, key: trimmed };
}

/** First EXPO_PUBLIC_GOOGLE_MAPS_API_KEY assignment in a dotenv file. */
export function parseDotEnvMapsKey(contents) {
  if (typeof contents !== 'string') return '';
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^(?:export\s+)?EXPO_PUBLIC_GOOGLE_MAPS_API_KEY\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    let value = match[1].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value.trim();
  }
  return '';
}

/**
 * EAS Environments often write the Maps key to `.env` without exporting it to
 * Gradle's process env. Prefer a non-empty shell value, then dotenv files.
 *
 * @param {object} sources
 * @param {string | null | undefined} [sources.envValue]
 * @param {string[]} [sources.dotEnvContents]
 */
export function resolveMapsApiKeyFromSources(sources) {
  const envValue = sources?.envValue;
  const dotEnvContents = sources?.dotEnvContents ?? [];
  const trimmedEnv = typeof envValue === 'string' ? envValue.trim() : '';
  if (trimmedEnv) return resolveMapsApiKey(trimmedEnv);
  for (const contents of dotEnvContents) {
    const fromFile = parseDotEnvMapsKey(contents);
    if (fromFile) return resolveMapsApiKey(fromFile);
  }
  return resolveMapsApiKey('');
}

export function upsertGradleMapsKey(contents, key) {
  const line = `GOOGLE_MAPS_API_KEY=${key}`;
  if (/^GOOGLE_MAPS_API_KEY=/m.test(contents)) {
    return contents.replace(/^GOOGLE_MAPS_API_KEY=.*$/m, line);
  }
  const trimmed = contents.replace(/\s*$/, '');
  return `${trimmed}\n${line}\n`;
}

function readDotEnvContents(root) {
  return DOT_ENV_FILES.flatMap((name) => {
    const filePath = join(root, name);
    return existsSync(filePath) ? [readFileSync(filePath, 'utf8')] : [];
  });
}

function writeGradleMapsKey(root, key) {
  const gradleProperties = join(root, 'android', 'gradle.properties');
  if (!existsSync(gradleProperties) || !key) return false;
  const next = upsertGradleMapsKey(readFileSync(gradleProperties, 'utf8'), key);
  writeFileSync(gradleProperties, next);
  return true;
}

function main() {
  const printOnly = process.argv.includes('--print');
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const resolved = resolveMapsApiKeyFromSources({
    envValue: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    dotEnvContents: readDotEnvContents(root),
  });
  const profile = process.env.EAS_BUILD_PROFILE ?? 'local';

  if (!resolved.ok) {
    if (printOnly) {
      process.stderr.write(
        `[inject-eas-maps-key] EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is not an AIza… key (profile=${profile}).\n`,
      );
    } else {
      console.error(
        `[inject-eas-maps-key] EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is not an AIza… key (profile=${profile}).`,
      );
      console.error(
        'Refusing to bake CLI/auth error text into AndroidManifest (gray Google map).',
      );
    }
    process.exit(1);
  }

  const wrote = writeGradleMapsKey(root, resolved.key);
  if (printOnly) {
    process.stdout.write(resolved.key);
    return;
  }

  if (wrote) {
    console.log('[inject-eas-maps-key] Wrote GOOGLE_MAPS_API_KEY to android/gradle.properties');
  } else if (!resolved.key) {
    console.warn(
      `[inject-eas-maps-key] No Maps key (profile=${profile}); native Google basemap off, Yandex fallback.`,
    );
  }
}

const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  main();
}
