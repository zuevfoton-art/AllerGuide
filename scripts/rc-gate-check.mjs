#!/usr/bin/env node
/**
 * P2.8 — automated Release Candidate gate checks (local + CI).
 *
 * Usage:
 *   node scripts/rc-gate-check.mjs           # full gate (typecheck, lint, test, docs)
 *   node scripts/rc-gate-check.mjs --quick  # skip pnpm test (faster pre-push)
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const quick = process.argv.includes('--quick');

const failures = [];
const warnings = [];

function log(msg) {
  console.log(`[rc-gate] ${msg}`);
}

function runStep(label, command, args, options = {}) {
  log(`→ ${label}`);
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    shell: false,
    ...options,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    failures.push(`${label} failed (exit ${result.status ?? 1})`);
  }
}

function requireFile(relativePath, { optional = false } = {}) {
  const full = path.join(root, relativePath);
  if (fs.existsSync(full)) return true;
  const msg = `Missing required file: ${relativePath}`;
  if (optional) {
    warnings.push(msg);
    return false;
  }
  failures.push(msg);
  return false;
}

function parseCriticalOpen(markdown) {
  const summary = markdown.match(
    /\|\s*Severity\s*\|\s*Open\s*\|[\s\S]*?\|\s*Critical\s*\|\s*(\d+)\s*\|/i,
  );
  if (summary) return Number(summary[1]);

  const row = markdown.match(/^\|\s*Critical\s*\|\s*(\d+)\s*\|/im);
  return row ? Number(row[1]) : null;
}

function checkSecurityAuditDocs() {
  const docs = ['docs/security-audit-mobile.md', 'docs/security-audit-api.md'];

  for (const relativePath of docs) {
    if (!requireFile(relativePath)) continue;
    const critical = parseCriticalOpen(fs.readFileSync(path.join(root, relativePath), 'utf8'));
    if (critical == null) {
      warnings.push(`${relativePath}: could not parse Critical open count`);
    } else if (critical > 0) {
      failures.push(`${relativePath}: ${critical} critical finding(s) open`);
    } else {
      log(`${relativePath}: 0 critical open`);
    }
  }
}

function checkMaestroFlows() {
  const flowsDir = path.join(root, 'apps/mobile/.maestro/flows');
  if (!fs.existsSync(flowsDir)) {
    failures.push('Maestro flows directory missing');
    return;
  }
  const smokeFlows = fs
    .readdirSync(flowsDir)
    .filter((name) => name.endsWith('-smoke.yaml') || name === 'smoke-all.yaml');
  if (smokeFlows.length < 5) {
    failures.push(`Expected ≥5 Maestro smoke flows, found ${smokeFlows.length}`);
  } else {
    log(`Maestro smoke flows: ${smokeFlows.length}`);
  }

  const buildScript = fs.readFileSync(path.join(root, 'scripts/maestro-build-apk.sh'), 'utf8');
  if (!buildScript.includes('gradlew assembleRelease')) {
    failures.push('scripts/maestro-build-apk.sh must run gradlew assembleRelease (embedded JS, no Metro)');
  }
  if (buildScript.includes('gradlew assembleDebug')) {
    failures.push('scripts/maestro-build-apk.sh still calls gradlew assembleDebug (nightly cannot load JS)');
  }

  const workflow = fs.readFileSync(path.join(root, '.github/workflows/maestro-nightly.yml'), 'utf8');
  if (!workflow.includes('maestro-run-emulator.sh')) {
    failures.push('maestro-nightly.yml must run scripts/maestro-run-emulator.sh');
  }
  if (workflow.includes('app-debug.apk')) {
    failures.push('maestro-nightly.yml still installs app-debug.apk');
  }

  const runner = fs.readFileSync(path.join(root, 'scripts/maestro-run-emulator.sh'), 'utf8');
  if (!runner.includes('app-release.apk')) {
    failures.push('scripts/maestro-run-emulator.sh must install app-release.apk');
  }
  if (!runner.includes('pm grant')) {
    failures.push('scripts/maestro-run-emulator.sh must pre-grant runtime permissions');
  }
  if (runner.includes('adb shell monkey')) {
    failures.push('scripts/maestro-run-emulator.sh must not use monkey (ANRs Pixel Launcher)');
  }
  if (!runner.includes('am start') || !runner.includes('dismiss_anr')) {
    failures.push('scripts/maestro-run-emulator.sh must am start + dismiss ANR');
  }
  if (!runner.includes('Application Not Responding') || !runner.includes('ensure_app_foreground')) {
    failures.push('scripts/maestro-run-emulator.sh must detect Application Not Responding and restore MainActivity');
  }
  if (!runner.includes('during.png')) {
    failures.push('scripts/maestro-run-emulator.sh must capture *-during.png before Maestro exits');
  }
  if (!workflow.includes('during.png')) {
    failures.push('maestro-nightly.yml must upload *-during.png in-flow screenshots');
  }
  if (!workflow.includes('maestro-login-visible.png') || !workflow.includes('.maestro/tests')) {
    failures.push('maestro-nightly.yml must upload maestro-login-visible.png and ~/.maestro/tests');
  }

  const waitLogin = fs.readFileSync(path.join(flowsDir, '_wait-login.yaml'), 'utf8');
  if (!waitLogin.includes('auth-hero-title')) {
    failures.push('_wait-login.yaml must wait for auth-hero-title (above the fold)');
  }

  const dismissIme = path.join(flowsDir, '_dismiss-ime.yaml');
  if (!fs.existsSync(dismissIme)) {
    failures.push('_dismiss-ime.yaml missing (fold IME without BACK)');
  } else {
    const dismissBody = fs.readFileSync(dismissIme, 'utf8');
    if (!dismissBody.includes('auth-hero-title')) {
      failures.push('_dismiss-ime.yaml must tap auth-hero-title (not hideKeyboard/BACK)');
    }
  }

  const fillById = fs.readFileSync(path.join(flowsDir, '_fill-by-id.yaml'), 'utf8');
  if (!fillById.includes('_dismiss-ime.yaml') || !fillById.includes('scrollUntilVisible')) {
    failures.push('_fill-by-id.yaml must _dismiss-ime.yaml + scrollUntilVisible');
  }

  for (const name of fs.readdirSync(flowsDir).filter((file) => file.endsWith('.yaml'))) {
    const body = fs.readFileSync(path.join(flowsDir, name), 'utf8');
    if (/^\s*-\s+hideKeyboard\b/m.test(body)) {
      failures.push(`${name}: hideKeyboard sends BACK and pops /login — use _dismiss-ime.yaml`);
    }
    if (/^\s*-\s+back\b/m.test(body)) {
      failures.push(`${name}: Maestro back command is banned (same as hideKeyboard on Android)`);
    }
  }

  for (const name of ['_offline-bootstrap.yaml', '_staging-bootstrap.yaml']) {
    const flow = fs.readFileSync(path.join(flowsDir, name), 'utf8');
    if (!flow.includes('_wait-login.yaml')) {
      failures.push(`${name}: must run _wait-login.yaml`);
    }
    if (!flow.includes('_tap-register.yaml')) {
      failures.push(`${name}: must tap register via _tap-register.yaml`);
    }
    if (flow.includes('stopApp: false')) {
      failures.push(`${name}: must not re-launchApp after clearState (masked hideKeyboard BACK)`);
    }
    if (!flow.includes('_fill-by-id.yaml')) {
      failures.push(`${name}: must fill auth fields via _fill-by-id.yaml`);
    }
    const tapThenConfirm =
      flow.includes('_tap-register.yaml') &&
      flow.indexOf('_tap-register.yaml') < flow.indexOf('id: auth-confirm-password-input');
    if (!tapThenConfirm) {
      failures.push(`${name}: must wait for auth-confirm-password-input after register tap`);
    }
  }

  const tapRegister = fs.readFileSync(path.join(flowsDir, '_tap-register.yaml'), 'utf8');
  if (!tapRegister.includes('auth-register-link') || !tapRegister.includes('Зарегистрироваться')) {
    failures.push('_tap-register.yaml must tap auth-register-link then RU register copy');
  }
}

async function checkStagingHealth() {
  const url = process.env.STAGING_API_URL?.replace(/\/$/, '');
  if (!url) {
    warnings.push('STAGING_API_URL unset — skipping staging health check');
    return;
  }

  try {
    const response = await fetch(`${url}/api/health`);
    const body = await response.json();
    if (!response.ok || body.ok === false) {
      failures.push(`Staging health check failed: HTTP ${response.status}`);
      return;
    }
    log(`Staging health OK (${url})`);
  } catch (error) {
    failures.push(
      `Staging health check error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function checkSoakLogStarted() {
  const soakPath = path.join(root, 'docs/staging-soak-log.md');
  if (!fs.existsSync(soakPath)) {
    failures.push('Missing docs/staging-soak-log.md');
    return;
  }
  const content = fs.readFileSync(soakPath, 'utf8');
  const blocked = /\*\*Status:\s*BLOCKED\*\*/i.test(content);
  if (blocked) {
    log('staging-soak-log.md: Status BLOCKED (manual G3/G5/G7 not signed off)');
    return;
  }
  if (content.includes('_YYYY-MM-DD_')) {
    warnings.push('staging-soak-log.md: set soak start/end dates when RC soak begins');
  }
}

// --- automated quality gate ---
runStep('typecheck', 'pnpm', ['typecheck']);
runStep('lint', 'pnpm', ['lint']);

if (!quick) {
  runStep('test', 'pnpm', ['test']);
  runStep('mobile test gate', 'node', ['scripts/mobile-test-gate.mjs']);
}

// --- Phase 2 artifact checks ---
requireFile('docs/phase-2-run.md');
requireFile('docs/qa-checklist.md');
requireFile('docs/maestro.md');
requireFile('docs/rc-gate.md');
requireFile('docs/analytics-staging.md');
requireFile('docs/performance-cold-start.md', { optional: true });
requireFile('docs/performance-api-infra.md', { optional: true });
requireFile('docs/performance-web-store.md', { optional: true });

checkMaestroFlows();
runStep('maestro CI invariants', 'node', ['--test', 'scripts/maestro-ci-check.test.mjs']);
checkSecurityAuditDocs();
checkSoakLogStarted();

await checkStagingHealth();

console.log('');
if (warnings.length) {
  console.log('[rc-gate] warnings:');
  for (const warning of warnings) console.log(`  ⚠ ${warning}`);
}

if (failures.length) {
  console.error('[rc-gate] FAILED:');
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

console.log('[rc-gate] PASSED — automated RC gate checks OK');
if (warnings.length) {
  console.log('[rc-gate] Resolve warnings before Phase 2 milestone sign-off.');
}
process.exit(0);
