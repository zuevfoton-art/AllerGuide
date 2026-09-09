#!/usr/bin/env node
/**
 * Fail when mobile UI files introduce literal fontSize/lineHeight or ad-hoc
 * title StyleSheet keys that are not on the gradual-migration allowlist.
 *
 * Usage: node scripts/check-design-tokens.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const allowlistPath = path.join(root, 'scripts/design-token-allowlist.json');
const scanRoots = [
  path.join(root, 'apps/mobile/app'),
  path.join(root, 'apps/mobile/src/components'),
];

const SKIP_DIR = new Set(['node_modules', 'android', 'ios', 'dist', '.expo', 'coverage']);
const SKIP_FILE = /\.test\.(ts|tsx)$/;

const LITERAL_RE = /\b(?:fontSize|lineHeight):\s*\d+/g;
const TITLE_KEY_RE = /^\s*(title|cardTitle|sectionTitle|heading)\s*:/gm;
const CARD_TITLE_USAGE_RE = /\bui\.cardTitle\b/g;
const HEX_RE = /#[0-9A-Fa-f]{3,8}\b/g;
const RGBA_RE = /rgba?\(\s*\d+[\d\s,./]+\)/g;
const DUAL_CALM_RE = /#2563EB|#1D4ED8|#3B82F6|#EFF4FF|#DBEAFE|#0C4A6E|#BFDBFE|#93C5FD|#1E40AF/gi;

function extractStyleSheetBodies(source) {
  const bodies = [];
  const marker = 'StyleSheet.create(';
  let from = 0;
  while (from < source.length) {
    const start = source.indexOf(marker, from);
    if (start === -1) break;
    const open = start + marker.length - 1;
    let depth = 0;
    let i = open;
    let inSingle = false;
    let inDouble = false;
    let inTemplate = false;
    let escape = false;
    while (i < source.length) {
      const ch = source[i];
      if (escape) {
        escape = false;
        i += 1;
        continue;
      }
      if (ch === '\\' && (inSingle || inDouble || inTemplate)) {
        escape = true;
        i += 1;
        continue;
      }
      if (!inDouble && !inTemplate && ch === "'") inSingle = !inSingle;
      else if (!inSingle && !inTemplate && ch === '"') inDouble = !inDouble;
      else if (!inSingle && !inDouble && ch === '`') inTemplate = !inTemplate;
      else if (!inSingle && !inDouble && !inTemplate) {
        if (ch === '(') depth += 1;
        if (ch === ')') {
          depth -= 1;
          if (depth === 0) {
            bodies.push(source.slice(open + 1, i));
            from = i + 1;
            break;
          }
        }
      }
      i += 1;
    }
    if (i >= source.length) break;
  }
  return bodies;
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR.has(entry.name) || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, acc);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name) || SKIP_FILE.test(entry.name)) continue;
    acc.push(full);
  }
  return acc;
}

function loadAllowlist() {
  const raw = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
  return {
    literals: new Set(raw.literals ?? []),
    titleKeys: new Set(raw.titleKeys ?? []),
    cardTitleUsage: new Set(raw.cardTitleUsage ?? []),
    atmosphereHex: new Set(raw.atmosphereHex ?? []),
    legacyHex: new Set(raw.legacyHex ?? []),
  };
}

function rel(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

const allow = loadAllowlist();
const files = scanRoots.flatMap((dir) => walk(dir));
const failures = [];

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const relative = rel(file);

  const literals = source.match(LITERAL_RE) ?? [];
  if (literals.length && !allow.literals.has(relative)) {
    failures.push(`${relative}: literal fontSize/lineHeight (${literals.length}) — use fontSizes / lineHeights`);
  }

  const titleKeys = extractStyleSheetBodies(source).flatMap((body) => body.match(TITLE_KEY_RE) ?? []);
  if (titleKeys.length && !allow.titleKeys.has(relative)) {
    failures.push(`${relative}: local StyleSheet key ${titleKeys.join(', ').trim()} — use CardTitle / ui.sectionTitle / ui.feedTitle`);
  }

  const cardTitle = source.match(CARD_TITLE_USAGE_RE) ?? [];
  if (cardTitle.length && !allow.cardTitleUsage.has(relative)) {
    failures.push(`${relative}: ui.cardTitle is a 12px micro-label — use CardTitle for card headers`);
  }

  const dualCalm = source.match(DUAL_CALM_RE) ?? [];
  if (dualCalm.length) {
    failures.push(`${relative}: Dual Calm banlist fill (${[...new Set(dualCalm)].join(', ')})`);
  }

  const hex = [...(source.match(HEX_RE) ?? []), ...(source.match(RGBA_RE) ?? [])];
  if (
    hex.length &&
    !allow.atmosphereHex.has(relative) &&
    !allow.legacyHex.has(relative)
  ) {
    failures.push(
      `${relative}: raw hex/rgba (${hex.length}) — atmosphere only (N10) or theme.colors.*`,
    );
  }
}

if (failures.length) {
  console.error('[check:design-tokens] FAILED');
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

console.log(`[check:design-tokens] OK (${files.length} files)`);
