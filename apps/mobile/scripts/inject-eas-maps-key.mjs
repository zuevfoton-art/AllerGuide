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

export function isGoogleMapsApiKey(value) {
  return typeof value === 'string' && GOOGLE_MAPS_API_KEY_PATTERN.test(value.trim());
}

export function resolveMapsApiKey(raw) {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed) return { ok: true, key: '' };
  if (!isGoogleMapsApiKey(trimmed)) return { ok: false, key: '' };
  return { ok: true, key: trimmed };
}

export function upsertGradleMapsKey(contents, key) {
  const line = `GOOGLE_MAPS_API_KEY=${key}`;
  if (/^GOOGLE_MAPS_API_KEY=/m.test(contents)) {
    return contents.replace(/^GOOGLE_MAPS_API_KEY=.*$/m, line);
  }
  const trimmed = contents.replace(/\s*$/, '');
  return `${trimmed}\n${line}\n`;
}

function main() {
  const resolved = resolveMapsApiKey(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY);
  const profile = process.env.EAS_BUILD_PROFILE ?? 'local';

  if (!resolved.ok) {
    console.error(
      `[inject-eas-maps-key] EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is not an AIza… key (profile=${profile}).`,
    );
    console.error(
      'Refusing to bake CLI/auth error text into AndroidManifest (gray Google map).',
    );
    process.exit(1);
  }

  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const gradleProperties = join(root, 'android', 'gradle.properties');
  if (existsSync(gradleProperties) && resolved.key) {
    const next = upsertGradleMapsKey(readFileSync(gradleProperties, 'utf8'), resolved.key);
    writeFileSync(gradleProperties, next);
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
