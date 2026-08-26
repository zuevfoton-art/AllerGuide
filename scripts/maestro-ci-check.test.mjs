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
    assert.match(workflow, /maestro-offline-during\.png/);
    assert.match(workflow, /maestro-staging-during\.png/);

    const runner = read('scripts/maestro-run-emulator.sh');
    assert.match(runner, /app-release\.apk/);
    assert.match(runner, /pm grant/);
    assert.match(runner, /adb logcat/);
    assert.match(runner, /screencap/);
    assert.match(runner, /am start -W -n "\$ACTIVITY"/);
    assert.doesNotMatch(runner, /adb shell monkey/);
    assert.match(runner, /dismiss_anr/);
    assert.match(runner, /Application Not Responding/);
    assert.match(runner, /ensure_app_foreground/);
    assert.match(runner, /during\.png/);
    assert.match(runner, /SAMPLER_GUARD/);
  });

  it('waits for the auth hero title, then scrolls+hides IME for fields', () => {
    const waitLogin = read('apps/mobile/.maestro/flows/_wait-login.yaml');
    assert.match(waitLogin, /id: auth-hero-title/);
    assert.match(waitLogin, /timeout: 120000/);
    assert.match(waitLogin, /takeScreenshot: maestro-login-visible/);
    const hero = read('apps/mobile/src/components/AuthForm.tsx');
    assert.match(hero, /testID="auth-hero-title"/);

    const fill = read('apps/mobile/.maestro/flows/_fill-by-id.yaml');
    assert.match(fill, /hideKeyboard/);
    assert.match(fill, /scrollUntilVisible/);

    for (const name of ['_offline-bootstrap.yaml', '_staging-bootstrap.yaml']) {
      const flow = read(`apps/mobile/.maestro/flows/${name}`);
      assert.match(flow, /_wait-login\.yaml/);
      assert.match(flow, /_tap-register\.yaml/);
      assert.match(flow, /stopApp: false/);
      assert.match(flow, /_fill-by-id\.yaml/);
      assert.match(flow, /auth-confirm-password-input/);
    }
  });

  it('taps register via Text testID, then RU copy while still on login', () => {
    const tapRegister = read('apps/mobile/.maestro/flows/_tap-register.yaml');
    assert.match(tapRegister, /id: auth-register-link/);
    assert.match(tapRegister, /text: "Зарегистрироваться"/);
    assert.match(tapRegister, /text: "Нет аккаунта\?"/);

    const authForm = read('apps/mobile/src/components/AuthForm.tsx');
    assert.match(authForm, /<Text testID=\{testID\} style=\{styles\.linkText\}>/);
    assert.doesNotMatch(authForm, /<Pressable\s+testID=\{testID\}/);
  });
});
