import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const flowsDir = path.join(root, 'apps/mobile/.maestro/flows');

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
    assert.match(script, /enable_emulator_http_cleartext/);
    assert.match(script, /network_security_config/);
    assert.match(script, /10\.0\.2\.2/);
  });

  it('runs emulator flows via the helper that installs the release APK', () => {
    const workflow = read('.github/workflows/maestro-nightly.yml');
    assert.match(workflow, /maestro-run-emulator\.sh preview/);
    assert.match(workflow, /maestro-run-emulator\.sh staging/);
    assert.doesNotMatch(workflow, /app-debug\.apk/);
    assert.match(workflow, /maestro-offline-during\.png/);
    assert.match(workflow, /maestro-staging-during\.png/);
    assert.match(workflow, /maestro-login-visible\.png/);
    assert.match(workflow, /\.maestro\/tests/);

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

  it('waits for the auth hero title, then scrolls and folds IME without BACK', () => {
    const waitLogin = read('apps/mobile/.maestro/flows/_wait-login.yaml');
    assert.match(waitLogin, /id: auth-hero-title/);
    assert.match(waitLogin, /timeout: 120000/);
    assert.match(waitLogin, /takeScreenshot: maestro-login-visible/);
    const hero = read('apps/mobile/src/components/AuthForm.tsx');
    assert.match(hero, /testID="auth-hero-title"/);

    const dismissIme = read('apps/mobile/.maestro/flows/_dismiss-ime.yaml');
    assert.match(dismissIme, /id: auth-hero-title/);
    assert.doesNotMatch(dismissIme, /^\s*-\s+hideKeyboard\b/m);

    const fill = read('apps/mobile/.maestro/flows/_fill-by-id.yaml');
    assert.match(fill, /_dismiss-ime\.yaml/);
    assert.match(fill, /scrollUntilVisible/);
    assert.doesNotMatch(fill, /^\s*-\s+hideKeyboard\b/m);

    for (const name of ['_offline-bootstrap.yaml', '_staging-bootstrap.yaml']) {
      const flow = read(`apps/mobile/.maestro/flows/${name}`);
      assert.match(flow, /_wait-login\.yaml/);
      assert.match(flow, /_tap-register\.yaml/);
      assert.doesNotMatch(flow, /stopApp: false/);
      assert.match(flow, /_fill-by-id\.yaml/);
      assert.ok(
        flow.indexOf('_tap-register.yaml') < flow.indexOf('id: auth-confirm-password-input'),
        `${name} must wait for confirm field after register tap`,
      );
    }
  });

  it('polyfills crypto.getRandomValues so offline register can hash passwords', () => {
    const layout = read('apps/mobile/app/_layout.tsx');
    assert.match(layout, /ensureCryptoGetRandomValues/);
    assert.match(layout, /expo-crypto/);
    const polyfill = read('apps/mobile/src/polyfill-crypto-get-random-values.ts');
    assert.match(polyfill, /export function ensureCryptoGetRandomValues/);
  });

  it('taps register via Text testID, then RU copy while still on login', () => {
    const tapRegister = read('apps/mobile/.maestro/flows/_tap-register.yaml');
    assert.match(tapRegister, /id: auth-register-link/);
    assert.match(tapRegister, /text: "Зарегистрироваться"/);
    assert.match(tapRegister, /text: "Нет аккаунта\?"/);
    assert.match(tapRegister, /_dismiss-ime\.yaml/);
    assert.doesNotMatch(tapRegister, /^\s*-\s+hideKeyboard\b/m);

    const authForm = read('apps/mobile/src/components/AuthForm.tsx');
    assert.match(authForm, /<Text testID=\{testID\} style=\{styles\.linkText\}>/);
    assert.doesNotMatch(authForm, /<Pressable\s+testID=\{testID\}/);
  });

  it('bans hideKeyboard and the back command in every Maestro flow', () => {
    const names = fs.readdirSync(flowsDir).filter((name) => name.endsWith('.yaml'));
    assert.ok(names.includes('_dismiss-ime.yaml'));
    for (const name of names) {
      const body = fs.readFileSync(path.join(flowsDir, name), 'utf8');
      assert.doesNotMatch(body, /^\s*-\s+hideKeyboard\b/m, `${name} must not use hideKeyboard`);
      assert.doesNotMatch(body, /^\s*-\s+back\b/m, `${name} must not use the back command`);
    }
  });
});
