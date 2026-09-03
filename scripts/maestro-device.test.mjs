import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const helpers = path.join(root, 'scripts/lib/maestro-device.sh');

/** Two focus lines with a stale launcher entry — nightly 33414517311. */
const APP_RESUMED_WITH_STALE_LAUNCHER_FOCUS = `=== window ===
  mCurrentFocus=Window{ea69e07 u0 com.google.android.apps.nexuslauncher/com.google.android.apps.nexuslauncher.NexusLauncherActivity}
  mCurrentFocus=Window{8f90f17 u0 com.aclearo.app/com.aclearo.app.MainActivity}
=== activities ===
    topResumedActivity=ActivityRecord{5fa76ec u0 com.aclearo.app/.MainActivity t13}`;

const LAUNCHER_RESUMED = `=== window ===
  mCurrentFocus=Window{7216bcb u0 com.google.android.apps.nexuslauncher/com.google.android.apps.nexuslauncher.NexusLauncherActivity}
=== activities ===
    topResumedActivity=ActivityRecord{a71eb6 u0 com.google.android.apps.nexuslauncher/.NexusLauncherActivity t9}`;

const ANR_OVER_APP = `=== window ===
  Application Not Responding: com.google.android.apps.nexuslauncher
  mCurrentFocus=Window{8f90f17 u0 com.aclearo.app/com.aclearo.app.MainActivity}
=== activities ===
    topResumedActivity=ActivityRecord{5fa76ec u0 com.aclearo.app/.MainActivity t13}`;

/**
 * Run one helper against a fake `adb` that replays a canned dumpsys state and
 * logs every invocation, so assertions can check which commands were issued.
 */
function runHelper(helperCall, dumpsys) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'maestro-device-'));
  const [windowSection, activitiesSection] = dumpsys.split('=== activities ===');
  fs.writeFileSync(path.join(dir, 'window.txt'), windowSection.replace('=== window ===', ''));
  fs.writeFileSync(path.join(dir, 'activities.txt'), activitiesSection);

  const fakeAdb = path.join(dir, 'adb');
  fs.writeFileSync(
    fakeAdb,
    `#!/usr/bin/env bash
echo "$*" >> "${dir}/calls.txt"
case "$*" in
  *"dumpsys window"*) cat "${dir}/window.txt" ;;
  *"dumpsys activity activities"*) cat "${dir}/activities.txt" ;;
esac
exit 0
`,
    { mode: 0o755 },
  );

  const script = `
set -euo pipefail
PACKAGE='com.aclearo.app'
ACTIVITY='com.aclearo.app/.MainActivity'
ANR_WAIT_X=540
ANR_WAIT_Y=1359
. "${helpers}"
${helperCall}
`;
  const stdout = execFileSync('bash', ['-c', script], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}` },
  });

  const callsFile = path.join(dir, 'calls.txt');
  const calls = fs.existsSync(callsFile) ? fs.readFileSync(callsFile, 'utf8').split('\n') : [];
  return { stdout, calls };
}

function startedActivity(calls) {
  return calls.some((call) => call.includes('am start'));
}

describe('maestro device helpers', () => {
  it('treats the app as foreground when it is the resumed activity', () => {
    const { stdout } = runHelper(
      'if app_is_foreground; then echo FOREGROUND; else echo BACKGROUND; fi',
      APP_RESUMED_WITH_STALE_LAUNCHER_FOCUS,
    );
    assert.match(stdout, /FOREGROUND/);
  });

  it('does not restart the activity while the app is resumed', () => {
    const { calls } = runHelper('ensure_app_foreground', APP_RESUMED_WITH_STALE_LAUNCHER_FOCUS);
    assert.equal(
      startedActivity(calls),
      false,
      'am start mid-flow re-delivers the launch intent and resets expo-router',
    );
  });

  it('restarts the activity when the launcher is resumed', () => {
    const { calls, stdout } = runHelper('ensure_app_foreground', LAUNCHER_RESUMED);
    assert.equal(startedActivity(calls), true);
    assert.doesNotMatch(stdout, /FOREGROUND/);
  });

  it('taps Wait when an ANR dialog covers the resumed app', () => {
    const { calls } = runHelper('dismiss_anr', ANR_OVER_APP);
    assert.ok(
      calls.some((call) => call.includes('input tap 540 1359')),
      'ANR dialog must be dismissed with Wait',
    );
  });
});
