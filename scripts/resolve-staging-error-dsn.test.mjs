import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts/resolve-staging-error-dsn.sh');
const VALID_DSN = 'https://publickey@errors.staging.aclearo.com/1';
const ALIAS_DSN = 'https://legacykey@errors.staging.aclearo.com/9';

function parseEnvFile(contents) {
  const out = {};
  const lines = contents.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const heredoc = line.match(/^([A-Z0-9_]+)<<EOF$/);
    if (heredoc) {
      out[heredoc[1]] = lines[i + 1] ?? '';
      i += 2;
      continue;
    }
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    out[line.slice(0, eq)] = line.slice(eq + 1);
  }
  return out;
}

function runResolver(env) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'error-dsn-'));
  const githubEnv = path.join(dir, 'github.env');
  fs.writeFileSync(githubEnv, '');
  const emptyEas = path.join(dir, 'eas.json');
  if (!env.RESOLVE_STAGING_ERROR_DSN_EAS_JSON) {
    fs.writeFileSync(emptyEas, JSON.stringify({ build: { staging: { env: {} } } }));
  }
  const result = spawnSync('bash', [script], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      EXPO_TOKEN: '',
      EXPO_PUBLIC_ERROR_DSN: '',
      EXPO_PUBLIC_SENTRY_DSN: '',
      RESOLVE_STAGING_ERROR_DSN_EAS_GET: '',
      RESOLVE_STAGING_ERROR_DSN_EAS_JSON: emptyEas,
      GITHUB_ENV: githubEnv,
      ...env,
    },
  });
  const parsed = parseEnvFile(fs.readFileSync(githubEnv, 'utf8'));
  fs.rmSync(dir, { recursive: true, force: true });
  return { result, parsed };
}

describe('resolve-staging-error-dsn.sh', () => {
  it('bakes a valid GitHub secret DSN without printing it', () => {
    const { result, parsed } = runResolver({
      EXPO_PUBLIC_ERROR_DSN: VALID_DSN,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(parsed.EXPO_PUBLIC_ERROR_DSN, VALID_DSN);
    assert.equal(parsed.EXPO_PUBLIC_SENTRY_DSN, VALID_DSN);
    assert.equal(parsed.STAGING_ERROR_DSN_SOURCE, 'github-secret:EXPO_PUBLIC_ERROR_DSN');
    assert.equal(parsed.STAGING_ERROR_DSN_HOST, 'errors.staging.aclearo.com');
    assert.match(result.stdout, /Crash ingest enabled/);
    assert.doesNotMatch(result.stdout, /publickey/);
    assert.doesNotMatch(result.stderr, /publickey/);
  });

  it('prefers EXPO_PUBLIC_ERROR_DSN over the Sentry-named alias', () => {
    const { result, parsed } = runResolver({
      EXPO_PUBLIC_ERROR_DSN: VALID_DSN,
      EXPO_PUBLIC_SENTRY_DSN: ALIAS_DSN,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(parsed.EXPO_PUBLIC_ERROR_DSN, VALID_DSN);
    assert.equal(parsed.STAGING_ERROR_DSN_SOURCE, 'github-secret:EXPO_PUBLIC_ERROR_DSN');
  });

  it('accepts the Sentry-named alias when the preferred name is empty', () => {
    const { result, parsed } = runResolver({
      EXPO_PUBLIC_SENTRY_DSN: ALIAS_DSN,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(parsed.EXPO_PUBLIC_ERROR_DSN, ALIAS_DSN);
    assert.equal(parsed.STAGING_ERROR_DSN_SOURCE, 'github-secret:EXPO_PUBLIC_SENTRY_DSN');
  });

  it('refuses sentry.io and still assembles without a DSN', () => {
    const { result, parsed } = runResolver({
      EXPO_PUBLIC_ERROR_DSN: 'https://example@sentry.io/1',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(parsed.EXPO_PUBLIC_ERROR_DSN, '');
    assert.equal(parsed.STAGING_ERROR_DSN_SOURCE, 'none');
    assert.match(result.stdout, /not a self-hosted GlitchTip DSN/);
    assert.match(result.stdout, /No valid EXPO_PUBLIC_ERROR_DSN/);
  });

  it('refuses http and origin-only values', () => {
    for (const bad of [
      'http://key@errors.staging.aclearo.com/1',
      'https://errors.staging.aclearo.com/1',
      'https://key@errors.staging.aclearo.com/',
    ]) {
      const { result, parsed } = runResolver({ EXPO_PUBLIC_ERROR_DSN: bad });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(parsed.STAGING_ERROR_DSN_SOURCE, 'none');
    }
  });

  it('falls back to EAS preview when the GitHub secret is missing', () => {
    const helper = fs.mkdtempSync(path.join(os.tmpdir(), 'eas-dsn-'));
    const easGet = path.join(helper, 'eas-get');
    fs.writeFileSync(
      easGet,
      `#!/usr/bin/env bash
set -euo pipefail
if [ "\$1" = preview ] && [ "\$2" = EXPO_PUBLIC_ERROR_DSN ]; then
  printf '%s\\n' '${VALID_DSN}'
  exit 0
fi
echo "missing" >&2
exit 1
`,
    );
    fs.chmodSync(easGet, 0o755);
    const { result, parsed } = runResolver({
      RESOLVE_STAGING_ERROR_DSN_EAS_GET: easGet,
    });
    fs.rmSync(helper, { recursive: true, force: true });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(parsed.EXPO_PUBLIC_ERROR_DSN, VALID_DSN);
    assert.equal(parsed.STAGING_ERROR_DSN_SOURCE, 'eas:preview:EXPO_PUBLIC_ERROR_DSN');
  });

  it('falls back to eas.json staging.env when secrets and EAS env:get are empty', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eas-json-dsn-'));
    const easJson = path.join(dir, 'eas.json');
    fs.writeFileSync(
      easJson,
      JSON.stringify({
        build: {
          staging: { env: { EXPO_PUBLIC_ERROR_DSN: VALID_DSN } },
        },
      }),
    );
    const { result, parsed } = runResolver({
      RESOLVE_STAGING_ERROR_DSN_EAS_JSON: easJson,
    });
    fs.rmSync(dir, { recursive: true, force: true });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(parsed.EXPO_PUBLIC_ERROR_DSN, VALID_DSN);
    assert.equal(parsed.STAGING_ERROR_DSN_SOURCE, 'eas.json:staging.env:EXPO_PUBLIC_ERROR_DSN');
  });
});
