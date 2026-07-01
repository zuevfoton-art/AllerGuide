#!/usr/bin/env node
/**
 * P2.2d — fail CI when mobile unit test count drops below the Phase 2 gate.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MIN_TESTS = 30;
const mobileDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'mobile');

const result = spawnSync('pnpm', ['vitest', 'run'], {
  cwd: mobileDir,
  encoding: 'utf8',
  shell: false,
});

process.stdout.write(result.stdout ?? '');
process.stderr.write(result.stderr ?? '');

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
const match = output.match(/Tests\s+(\d+)\s+passed/);
const count = match ? Number(match[1]) : 0;

if (!Number.isFinite(count) || count < MIN_TESTS) {
  console.error(`[mobile-test-gate] expected ≥${MIN_TESTS} passing tests, got ${count || 'unknown'}`);
  process.exit(1);
}

console.log(`[mobile-test-gate] OK — ${count} tests (min ${MIN_TESTS})`);
