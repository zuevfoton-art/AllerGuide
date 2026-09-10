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
    // Under `pipefail`, `grep -q` closing the pipe early kills unzip with
    // SIGPIPE once the listing outgrows the 64K buffer, so the guard reports a
    // missing bundle on a good APK. Match a captured listing instead.
    assert.match(script, /APK_LISTING="\$\(unzip -l "\$APK"\)"/);
    assert.doesNotMatch(
      script,
      /unzip -l "\$APK"\s*\|\s*grep/,
      'do not pipe the APK listing into grep — SIGPIPE + pipefail fails the guard',
    );
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

    const stagingBackup = read('apps/mobile/.maestro/flows/staging-backup-smoke.yaml');
    assert.match(stagingBackup, /id: status-banner/);
    assert.match(stagingBackup, /Резервная копия отправлена на сервер/);
    assert.doesNotMatch(stagingBackup, /text: "Готово"/);

    const banner = read('apps/mobile/src/components/StatusBanner.tsx');
    assert.match(banner, /testID="status-banner"/);
    assert.match(banner, /testID="status-banner-dismiss"/);

    for (const name of ['_offline-bootstrap-until-home.yaml', '_staging-bootstrap-until-home.yaml']) {
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

    for (const name of ['_offline-bootstrap.yaml', '_staging-bootstrap.yaml']) {
      const flow = read(`apps/mobile/.maestro/flows/${name}`);
      const untilHome = name.replace('.yaml', '-until-home.yaml');
      assert.match(flow, new RegExp(untilHome.replace('.', '\\.')));
      assert.match(flow, /_dismiss-hints\.yaml/);
    }

    const offlineUntilHome = read('apps/mobile/.maestro/flows/_offline-bootstrap-until-home.yaml');
    assert.match(offlineUntilHome, /FIELD_VALUE: Maestro1!/);
    assert.doesNotMatch(offlineUntilHome, /FIELD_VALUE: maestro1\b/);

    const gate = read('scripts/rc-gate-check.mjs');
    assert.match(gate, /_offline-bootstrap-until-home\.yaml/);
    assert.match(gate, /_staging-bootstrap-until-home\.yaml/);

    const dismissHints = read('apps/mobile/.maestro/flows/_dismiss-hints.yaml');
    assert.match(dismissHints, /id: hint-skip/);
    assert.match(dismissHints, /id: hint-overlay/);

    const onboardingSmoke = read('apps/mobile/.maestro/flows/onboarding-smoke.yaml');
    assert.match(onboardingSmoke, /_offline-bootstrap-until-home\.yaml/);
    assert.match(onboardingSmoke, /id: hint-overlay/);
    assert.match(onboardingSmoke, /_dismiss-hints\.yaml/);
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

  it('folds diary IME via pinned editor chrome before tapping Далее', () => {
    const dismiss = read('apps/mobile/.maestro/flows/_dismiss-wizard-ime.yaml');
    assert.match(dismiss, /id: diary-editor-title/);
    assert.match(dismiss, /waitForAnimationToEnd/);
    assert.doesNotMatch(dismiss, /^\s*-\s+hideKeyboard\b/m);

    const editorModal = read('apps/mobile/src/components/DiaryEditorModal.tsx');
    assert.match(editorModal, /testID="diary-editor-title"/);
    assert.match(editorModal, /collapsable=\{false\}/);
    const dismissHelper = read('apps/mobile/src/components/diary/wizard/dismiss-diary-keyboard.ts');
    assert.match(dismissHelper, /blurTextInput/);
    assert.match(dismissHelper, /Keyboard\.dismiss/);
    assert.match(editorModal, /testID="diary-editor-footer"/);
    assert.match(editorModal, /diaryEditorScrollMaxHeight/);
    assert.doesNotMatch(
      editorModal,
      /liftStyle\s*[,}\]]/,
      'DiaryEditorModal must not apply liftStyle to the sheet',
    );

    const wizard = read('apps/mobile/src/components/DiaryWizard.tsx');
    assert.match(wizard, /DiaryEditorFooter/);
    assert.match(wizard, /testID="diary-wizard-primary"/);

    const tapPrimary = read('apps/mobile/.maestro/flows/_tap-wizard-primary.yaml');
    assert.match(tapPrimary, /_dismiss-wizard-ime\.yaml/);
    assert.match(tapPrimary, /scrollUntilVisible/);
    assert.match(tapPrimary, /id: diary-wizard-primary/);

    const fill = read('apps/mobile/.maestro/flows/_fill-wizard-field.yaml');
    assert.match(fill, /_dismiss-wizard-ime\.yaml/);
    assert.match(fill, /eraseText/);
    assert.match(fill, /waitForAnimationToEnd/);
    assert.match(tapPrimary, /enabled: true/);

    for (const name of ['diary-smoke.yaml', 'diary-dish-smoke.yaml', 'diary-photo-smoke.yaml']) {
      const flow = read(`apps/mobile/.maestro/flows/${name}`);
      assert.ok(flow.includes('_tap-wizard-primary.yaml'), `${name} must tap Далее via _tap-wizard-primary`);
      assert.ok(flow.includes('_fill-wizard-field.yaml'), `${name} must type via _fill-wizard-field`);
      assert.ok(flow.includes('diary-new-entry'), `${name} must open the entry picker from diary-new-entry`);
      assert.doesNotMatch(flow, /diary-chip-/, `${name} must not tap removed home chips`);
      assert.doesNotMatch(
        flow,
        /^\s*-\s+tapOn:\s*\n\s+id: diary-wizard-primary\s*$/m,
        `${name} must not tap diary-wizard-primary while IME may cover it`,
      );
    }

    const photo = read('apps/mobile/.maestro/flows/diary-photo-smoke.yaml');
    assert.match(photo, /id: diary-picker-skin/);
    assert.match(photo, /id: diary-photo-step/);
    assert.match(photo, /_tap-wizard-choice.yaml/);
    assert.match(photo, /CHOICE_ID: diary-choice-Слабый/);
    assert.doesNotMatch(
      photo,
      /text: "Слабый"/,
      'diary-photo-smoke must not tap itching copy while IME may cover it',
    );

    const tapChoice = read('apps/mobile/.maestro/flows/_tap-wizard-choice.yaml');
    assert.match(tapChoice, /_dismiss-wizard-ime.yaml/);
    assert.match(tapChoice, /scrollUntilVisible/);
    assert.match(tapChoice, /id: \$\{CHOICE_ID\}/);

    const stepField = read('apps/mobile/src/components/diary/wizard/DiaryStepField.tsx');
    assert.match(stepField, /diary-choice-\$\{choice\}/);
    assert.match(stepField, /diary-choice-\$\{step\.id\}/);
  });

  it('opens scanner manual input before typing молоко', () => {
    const flow = read('apps/mobile/.maestro/flows/scanner-smoke.yaml');
    assert.match(flow, /id: scanner-toggle-manual/);
    assert.match(flow, /id: scanner-input/);
    assert.match(flow, /_dismiss-scanner-ime\.yaml/);
    assert.match(flow, /id: scanner-check/);
    assert.ok(
      flow.indexOf('scanner-toggle-manual') < flow.indexOf('scanner-input'),
      'scanner-smoke must expand manual input before tapping scanner-input',
    );
    assert.doesNotMatch(flow, /^\s*-\s+hideKeyboard\b/m);

    const dismiss = read('apps/mobile/.maestro/flows/_dismiss-scanner-ime.yaml');
    assert.match(dismiss, /id: scanner-title/);
    assert.doesNotMatch(dismiss, /^\s*-\s+hideKeyboard\b/m);

    const screen = read('apps/mobile/app/(tabs)/scanner.tsx');
    assert.match(screen, /testID="scanner-toggle-manual"/);
    assert.match(screen, /testID="scanner-title"/);
    assert.match(screen, /inputTestID="scanner-input"/);
  });

  it('keeps first-run food → milk and documents pollinosis quick-pick (S1)', () => {
    const firstRun = read('apps/mobile/.maestro/flows/_complete-first-run-profile.yaml');
    assert.match(firstRun, /id: condition-food/);
    assert.match(firstRun, /id: allergen-milk/);
    assert.ok(
      firstRun.indexOf('condition-food') < firstRun.indexOf('allergen-milk'),
      'first-run must pick food before tapping allergen-milk',
    );

    const core = read('packages/core/src/condition-allergen-recommendations.ts');
    assert.match(core, /food:\s*\[\s*'milk'/);

    const picker = read('apps/mobile/src/components/AllergenPicker.tsx');
    assert.match(picker, /allergen-recommended-\$\{group\.conditionId\}/);
    assert.match(picker, /allergen-show-more-\$\{group\.conditionId\}/);
    assert.match(picker, /testID="allergen-open-catalog"/);

    const pollinosis = read('apps/mobile/.maestro/flows/profile-pollinosis-quick-pick.yaml');
    assert.match(pollinosis, /id: condition-pollinosis/);
    assert.match(pollinosis, /id: allergen-birch-pollen/);
    assert.match(pollinosis, /id: allergen-mugwort-pollen/);
    assert.match(pollinosis, /id: allergen-recommended-pollinosis/);
    assert.match(pollinosis, /id: allergen-open-catalog/);
    assert.match(pollinosis, /id: allergen-show-more-pollinosis/);
    assert.match(pollinosis, /id: allergen-poplar-pollen/);
    assert.ok(
      pollinosis.indexOf('condition-pollinosis') < pollinosis.indexOf('allergen-birch-pollen'),
    );
    assert.ok(
      pollinosis.indexOf('allergen-show-more-pollinosis') <
        pollinosis.indexOf('allergen-poplar-pollen'),
    );

    const smokeAll = read('apps/mobile/.maestro/flows/smoke-all.yaml');
    assert.doesNotMatch(
      smokeAll,
      /profile-pollinosis-quick-pick/,
      'pollinosis quick-pick must stay off smoke-all so scanner keeps the food profile',
    );
  });

  it('keeps cross-reactions add-all off smoke-all and checks SOS chips', () => {
    const flow = read('apps/mobile/.maestro/flows/profile-cross-reactions-add-all.yaml');
    assert.match(flow, /id: cross-reactions-add-all/);
    assert.match(flow, /id: allergen-milk/);
    assert.match(flow, /id: profile-save/);
    assert.match(flow, /id: sos-cross-chip-goat-milk/);
    assert.match(flow, /id: sos-cross-reactions-row/);
    const smokeAll = read('apps/mobile/.maestro/flows/smoke-all.yaml');
    assert.doesNotMatch(
      smokeAll,
      /profile-cross-reactions-add-all/,
      'cross-reactions add-all must stay off smoke-all so scanner keeps the food profile',
    );
  });

  it('opens profile-edit before tapping profile-delete, then leaves the hub without BACK', () => {
    const flow = read('apps/mobile/.maestro/flows/sos-no-profile-smoke.yaml');
    assert.match(flow, /id: profile-list-item-0/);
    assert.match(flow, /id: profile-edit-title/);
    assert.match(
      flow,
      /scrollUntilVisible:[\s\S]*?id: profile-delete[\s\S]*?-\s+tapOn:\s+id: profile-delete/,
    );
    assert.match(flow, /text: "Удалить"/);
    assert.match(flow, /id: screen-header-back/);
    assert.match(flow, /id: tab-sos/);
    assert.ok(
      flow.indexOf('id: profile-list-item-0') < flow.indexOf('id: profile-delete'),
      'sos-no-profile-smoke must open the hub row before tapping profile-delete',
    );
    assert.ok(
      flow.indexOf('id: profile-edit-title') < flow.indexOf('id: profile-delete'),
      'sos-no-profile-smoke must wait for profile-edit before scrolling to delete',
    );
    assert.ok(
      flow.indexOf('id: profile-delete') < flow.indexOf('id: screen-header-back'),
      'sos-no-profile-smoke must delete before leaving the hub',
    );
    assert.ok(
      flow.indexOf('id: screen-header-back') < flow.indexOf('id: tab-sos'),
      'sos-no-profile-smoke must leave the hub via screen-header-back before tab-sos',
    );

    const hub = read('apps/mobile/app/profile.tsx');
    assert.match(hub, /testID=\{`profile-list-item-\$\{index\}`\}/);
    assert.doesNotMatch(hub, /testID="profile-delete"/);

    const edit = read('apps/mobile/app/profile-edit.tsx');
    assert.match(edit, /titleTestID="profile-edit-title"/);
    assert.match(edit, /testID="profile-delete"/);
    assert.match(read('apps/mobile/src/components/ScreenHeader.tsx'), /testID="screen-header-back"/);
  });

  it('folds profile IME via hub title before tapping profile-save-number', () => {
    const flow = read('apps/mobile/.maestro/flows/settings-smoke.yaml');
    assert.match(flow, /_tap-profile-save-number\.yaml/);
    assert.match(flow, /scrollUntilVisible:[\s\S]*?id: profile-emergency-number/);
    assert.doesNotMatch(
      flow,
      /^\s*-\s+tapOn:\s*\n\s+id: profile-save-number\s*$/m,
      'settings-smoke must not tap profile-save-number while IME may cover it',
    );

    const tapSave = read('apps/mobile/.maestro/flows/_tap-profile-save-number.yaml');
    assert.match(tapSave, /_dismiss-profile-ime\.yaml/);
    assert.match(tapSave, /scrollUntilVisible/);
    assert.match(tapSave, /id: profile-save-number/);

    const dismiss = read('apps/mobile/.maestro/flows/_dismiss-profile-ime.yaml');
    assert.match(dismiss, /id: profile-screen-title/);
    assert.doesNotMatch(dismiss, /^\s*-\s+hideKeyboard\b/m);

    const hub = read('apps/mobile/app/profile.tsx');
    assert.match(hub, /titleTestID="profile-screen-title"/);
    assert.match(hub, /pinnedTop=\{/);
    assert.match(hub, /testID="profile-save-number"/);
    assert.match(hub, /testID="profile-emergency-number"/);

    const header = read('apps/mobile/src/components/ScreenHeader.tsx');
    assert.match(header, /collapsable=\{false\}/);
  });

  it('bans hideKeyboard and the back command in every Maestro flow', () => {
    const names = fs.readdirSync(flowsDir).filter((name) => name.endsWith('.yaml'));
    assert.ok(names.includes('_dismiss-ime.yaml'));
    assert.ok(names.includes('_dismiss-hints.yaml'));
    for (const name of names) {
      const body = fs.readFileSync(path.join(flowsDir, name), 'utf8');
      assert.doesNotMatch(body, /^\s*-\s+hideKeyboard\b/m, `${name} must not use hideKeyboard`);
      assert.doesNotMatch(body, /^\s*-\s+back\b/m, `${name} must not use the back command`);
    }
  });
});
