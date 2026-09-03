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
    // `~` is not expanded by upload-artifact, so per-command logs are copied
    // next to the report instead.
    assert.doesNotMatch(workflow, /~\/\.maestro\/tests/);
    assert.match(workflow, /maestro-offline-maestro-logs/);
    assert.match(workflow, /maestro-staging-maestro-logs/);

    const runner = read('scripts/maestro-run-emulator.sh');
    assert.match(runner, /app-release\.apk/);
    assert.match(runner, /pm grant/);
    assert.match(runner, /autofill_service null/);
    assert.match(runner, /hide_error_dialogs 1/);
    assert.match(runner, /adb logcat/);
    assert.match(runner, /scripts\/lib\/maestro-device\.sh/);
    assert.doesNotMatch(runner, /adb shell monkey/);
    assert.match(runner, /dismiss_anr/);
    assert.match(runner, /ensure_app_foreground/);
    assert.match(runner, /during\.png/);
    assert.match(runner, /SAMPLER_GUARD/);
    assert.match(runner, /\$HOME\/\.maestro\/tests/);
    // The in-flow sampler observes only: restarting the activity mid-flow pops
    // expo-router back to the initial route (nightly 33414517311).
    const samplerLoop = runner.slice(
      runner.indexOf('while [ -f "$SAMPLER_GUARD" ]'),
      runner.indexOf('SAMPLER_PID=$!'),
    );
    assert.ok(samplerLoop.length > 0, 'sampler loop must exist');
    assert.doesNotMatch(samplerLoop, /ensure_app_foreground/);
    assert.match(samplerLoop, /capture_screen/);

    const device = read('scripts/lib/maestro-device.sh');
    assert.match(device, /screencap/);
    assert.match(device, /am start -W -n "\$ACTIVITY"/);
    assert.match(device, /Application Not Responding/);
    // Foreground must come from the resumed activity: `mCurrentFocus` keeps a
    // stale launcher line per display (nightly 33414517311).
    assert.match(device, /topResumedActivity/);
    assert.doesNotMatch(device, /launcher_is_focused/);
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
    assert.match(fill, /eraseText/);
    assert.doesNotMatch(fill, /^\s*-\s+hideKeyboard\b/m);

    const randomPhone = read('apps/mobile/.maestro/scripts/random-phone.js');
    assert.match(randomPhone, /999\$\{suffix\}/);
    assert.doesNotMatch(randomPhone, /\+7999/);

    const stagingAuth = read('apps/mobile/.maestro/flows/staging-auth-smoke.yaml');
    assert.match(stagingAuth, /id: profile-screen-title/);
    assert.match(stagingAuth, /scrollUntilVisible/);
    assert.ok(
      stagingAuth.indexOf('profile-screen-title') < stagingAuth.indexOf('id: profile-logout'),
      'staging-auth must wait for the profile hub before scrolling to logout',
    );
    assert.match(
      stagingAuth,
      /scrollUntilVisible:[\s\S]*?id: profile-logout[\s\S]*?-\s+tapOn:\s+id: profile-logout/,
    );

    for (const name of ['_offline-bootstrap.yaml', '_staging-bootstrap.yaml']) {
      const flow = read(`apps/mobile/.maestro/flows/${name}`);
      assert.match(flow, /_wait-login\.yaml/);
      assert.match(flow, /_tap-register\.yaml/);
      assert.doesNotMatch(flow, /stopApp: false/);
      assert.match(flow, /_fill-by-id\.yaml/);
      assert.ok(
        flow.includes('_complete-first-run-profile.yaml'),
        `${name} must complete first-run profile via shared subflow`,
      );
      assert.ok(
        flow.indexOf('_tap-register.yaml') < flow.indexOf('id: auth-confirm-password-input'),
        `${name} must wait for confirm field after register tap`,
      );
    }
  });

  it('applies the CSPRNG and PBKDF2 cost patches on both JS entries', () => {
    // Gradle pins entryFile to index.js, so a patch added only to entry.js
    // (package.json main) never reaches a native release bundle.
    const gradle = read('apps/mobile/android/app/build.gradle');
    assert.match(gradle, /entryFile = file\("\$\{projectRoot\}\/index\.js"\)/);

    const runtime = read('apps/mobile/src/install-runtime.ts');
    assert.match(runtime, /install-crypto-get-random-values/);
    assert.match(runtime, /install-password-hash-cost/);

    const nativeEntry = read('apps/mobile/index.js');
    assert.match(nativeEntry, /install-runtime/);
    assert.ok(
      nativeEntry.indexOf('install-runtime') < nativeEntry.indexOf('renderRootComponent'),
      'index.js must patch the runtime before rendering',
    );

    const entry = read('apps/mobile/entry.js');
    assert.match(entry, /install-runtime/);
    assert.match(entry, /expo-router\/entry/);
    assert.match(read('apps/mobile/app/_layout.tsx'), /install-runtime/);

    const pkg = JSON.parse(read('apps/mobile/package.json'));
    assert.equal(pkg.main, './entry.js');

    const polyfill = read('apps/mobile/src/polyfill-crypto-get-random-values.ts');
    assert.match(polyfill, /export function ensureCryptoGetRandomValues/);
    const install = read('apps/mobile/src/install-crypto-get-random-values.ts');
    assert.match(install, /setSecureRandomBytes/);
    assert.match(install, /expo-crypto/);
    const hashCost = read('apps/mobile/src/install-password-hash-cost.ts');
    assert.match(hashCost, /PASSWORD_HASH_ITERATIONS_INTERPRETED/);
    assert.match(hashCost, /Platform\.OS !== 'web'/);

    const profile = read('apps/mobile/.maestro/flows/_complete-first-run-profile.yaml');
    assert.match(profile, /id: condition-food/);
    assert.match(profile, /id: allergen-milk/);
    assert.ok(profile.indexOf('condition-food') < profile.indexOf('allergen-milk'));
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
