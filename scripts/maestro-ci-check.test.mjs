import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Maestro nightly CI invariants', () => {
  it('builds a release APK with an embedded JS bundle check', () => {
    const script = read('scripts/maestro-build-apk.sh');
    assert.match(script, /gradlew assembleRelease/);
    assert.doesNotMatch(script, /gradlew assembleDebug/);
    assert.match(script, /app-release\.apk/);
    assert.match(script, /NODE_ENV=production/);
    assert.match(script, /unzip -l "\$APK"/);
    assert.match(script, /missing the embedded JS bundle/);
  });

  it('installs the release APK in both nightly jobs', () => {
    const workflow = read('.github/workflows/maestro-nightly.yml');
    const installs = workflow.match(/adb install -r \S+/g) ?? [];
    assert.equal(installs.length, 2, `expected 2 adb install lines, got ${installs.join(', ')}`);
    for (const line of installs) {
      assert.match(line, /app-release\.apk/);
      assert.doesNotMatch(line, /app-debug\.apk/);
    }
  });

  it('waits for login then scrolls to the register link', () => {
    for (const name of ['_offline-bootstrap.yaml', '_staging-bootstrap.yaml']) {
      const flow = read(`apps/mobile/.maestro/flows/${name}`);
      assert.match(flow, /id: auth-login-input/);
      assert.match(flow, /scrollUntilVisible/);
      assert.match(flow, /id: auth-register-link/);
      assert.match(flow, /timeout: 90000/);
    }
  });
});
