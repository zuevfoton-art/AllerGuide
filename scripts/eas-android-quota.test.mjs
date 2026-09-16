import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts/eas-android-quota.sh');
const workflow = path.join(root, '.github/workflows/eas-staging-android.yml');

const QUOTA_LOG = `✔ Uploaded to EAS
✔ Computed project fingerprint
This account has used its Android builds from the Free plan this month, which will reset in 14 days (on Thu Oct 01 2026). Upgrade your plan for more builds with shorter wait times and longer timeouts, and to run more builds concurrently with a subscription plan. https://expo.dev/accounts/zuevfoton2/settings/billing
    Error: build command failed.
`;

const GRADLE_FAIL_LOG = `✔ Uploaded to EAS
Gradle build failed with unknown error. See logs for more information.
    Error: build command failed.
`;

function run(args, logText) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eas-quota-'));
  const logFile = path.join(dir, 'eas.log');
  if (logText !== null) {
    fs.writeFileSync(logFile, logText);
  }
  const resolvedArgs = args.map((arg) => (arg === '__LOG__' ? logFile : arg));
  const result = spawnSync('bash', [script, ...resolvedArgs], {
    cwd: root,
    encoding: 'utf8',
  });
  fs.rmSync(dir, { recursive: true, force: true });
  return result;
}

describe('eas-android-quota.sh', () => {
  it('detects Expo Free-plan Android quota from eas-cli 22 output', () => {
    const result = run(['is-quota', '__LOG__'], QUOTA_LOG);
    assert.equal(result.status, 0, result.stderr);
  });

  it('does not treat a Gradle cloud failure as quota', () => {
    const result = run(['is-quota', '__LOG__'], GRADLE_FAIL_LOG);
    assert.equal(result.status, 1, result.stdout);
  });

  it('apply skips (exit 0) when eas-cli failed only on Free-plan quota', () => {
    const result = run(['apply', '1', '__LOG__'], QUOTA_LOG);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Free-plan monthly quota/);
    assert.match(result.stdout, /staging-apk-gradle/);
    assert.doesNotMatch(result.stdout, /::error::/);
  });

  it('apply preserves a non-quota eas-cli failure', () => {
    const result = run(['apply', '1', '__LOG__'], GRADLE_FAIL_LOG);
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stdout, /not a Free-plan quota skip/);
    assert.doesNotMatch(result.stdout, /::warning::/);
  });

  it('apply is a no-op when eas-cli succeeded', () => {
    const result = run(['apply', '0', '__LOG__'], QUOTA_LOG);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '');
  });

  it('apply fails closed when the log file is missing', () => {
    const result = spawnSync('bash', [script, 'apply', '1', '/tmp/eas-android-quota-missing.log'], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stdout, /not a Free-plan quota skip/);
  });
});

describe('eas-staging-android.yml quota skip', () => {
  it('classifies eas-cli through eas-android-quota.sh and captures PIPESTATUS', () => {
    const yaml = fs.readFileSync(workflow, 'utf8');
    assert.match(yaml, /eas-android-quota\.sh" apply/);
    assert.match(yaml, /PIPESTATUS\[0\]/);
    assert.match(yaml, /tee \/tmp\/eas-android\.log/);
    assert.match(yaml, /set \+e/);
  });
});
