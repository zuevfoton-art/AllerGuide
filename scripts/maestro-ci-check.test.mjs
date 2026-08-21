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

  it('runs emulator flows via the helper that installs the release APK', () => {
    const workflow = read('.github/workflows/maestro-nightly.yml');
    assert.match(workflow, /maestro-run-emulator\.sh preview/);
    assert.match(workflow, /maestro-run-emulator\.sh staging/);
    assert.doesNotMatch(workflow, /app-debug\.apk/);

    const runner = read('scripts/maestro-run-emulator.sh');
    assert.match(runner, /app-release\.apk/);
    assert.match(runner, /pm grant/);
    assert.match(runner, /adb logcat/);
  });

  it('waits for auth chrome above the fold, then scrolls+hides IME for fields', () => {
    const waitLogin = read('apps/mobile/.maestro/flows/_wait-login.yaml');
    assert.match(waitLogin, /id: auth-mode-phone/);
    assert.match(waitLogin, /timeout: 120000/);

    const fill = read('apps/mobile/.maestro/flows/_fill-by-id.yaml');
    assert.match(fill, /hideKeyboard/);
    assert.match(fill, /scrollUntilVisible/);

    for (const name of ['_offline-bootstrap.yaml', '_staging-bootstrap.yaml']) {
      const flow = read(`apps/mobile/.maestro/flows/${name}`);
      assert.match(flow, /_wait-login\.yaml/);
      assert.match(flow, /_fill-by-id\.yaml/);
      assert.match(flow, /auth-confirm-password-input/);
    }
  });
});
