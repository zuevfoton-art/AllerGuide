#!/usr/bin/env node
/**
 * Fail when apps/mobile trackEvent() names drift from ANALYTICS_EVENT_NAMES,
 * or when call-site props use ANALYTICS_FORBIDDEN_KEYS.
 *
 * Usage: node scripts/check-analytics-taxonomy.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const taxonomyPath = path.join(root, 'packages/core/src/analytics-events.ts');
const scanRoot = path.join(root, 'apps/mobile');

const SKIP_DIR = new Set(['node_modules', 'android', 'ios', 'dist', '.expo', 'coverage']);
const SKIP_FILE = /\.test\.(ts|tsx)$/;

function readStringArray(source, exportName) {
  const match = source.match(
    new RegExp(`export const ${exportName} = \\[([\\s\\S]*?)\\] as const`),
  );
  if (!match) {
    throw new Error(`${exportName} not found in ${path.relative(root, taxonomyPath)}`);
  }
  return [...match[1].matchAll(/'([a-zA-Z][a-zA-Z0-9_]*)'/g)].map((item) => item[1]);
}

function walk(dir, acc = []) {
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

function readBalanced(source, start, openChar, closeChar) {
  let depth = 0;
  let i = start;
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
    if (!inDouble && !inTemplate && ch === "'" ) {
      inSingle = !inSingle;
    } else if (!inSingle && !inTemplate && ch === '"') {
      inDouble = !inDouble;
    } else if (!inSingle && !inDouble && ch === '`') {
      inTemplate = !inTemplate;
    } else if (!inSingle && !inDouble && !inTemplate) {
      if (ch === openChar) depth += 1;
      if (ch === closeChar) {
        depth -= 1;
        if (depth === 0) return { text: source.slice(start + 1, i), end: i + 1 };
      }
    }
    i += 1;
  }
  return null;
}

function splitTopLevelArgs(argsText) {
  const args = [];
  let last = 0;
  let depthParen = 0;
  let depthBrace = 0;
  let depthBracket = 0;
  let inSingle = false;
  let inDouble = false;
  let escape = false;
  for (let i = 0; i < argsText.length; i += 1) {
    const ch = argsText[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\' && (inSingle || inDouble)) {
      escape = true;
      continue;
    }
    if (!inDouble && ch === "'") {
      inSingle = !inSingle;
      continue;
    }
    if (!inSingle && ch === '"') {
      inDouble = !inDouble;
      continue;
    }
    if (inSingle || inDouble) continue;
    if (ch === '(') depthParen += 1;
    else if (ch === ')') depthParen -= 1;
    else if (ch === '{') depthBrace += 1;
    else if (ch === '}') depthBrace -= 1;
    else if (ch === '[') depthBracket += 1;
    else if (ch === ']') depthBracket -= 1;
    else if (ch === ',' && depthParen === 0 && depthBrace === 0 && depthBracket === 0) {
      args.push(argsText.slice(last, i).trim());
      last = i + 1;
    }
  }
  const tail = argsText.slice(last).trim();
  if (tail) args.push(tail);
  return args;
}

function objectLiteralKeys(arg) {
  const trimmed = arg.trim();
  if (!trimmed.startsWith('{')) return [];
  const body = trimmed.slice(1, trimmed.endsWith('}') ? -1 : undefined);
  const keys = [];
  let i = 0;
  while (i < body.length) {
    while (i < body.length && /\s/.test(body[i])) i += 1;
    if (i >= body.length) break;
    if (body.startsWith('//', i)) {
      const nl = body.indexOf('\n', i);
      i = nl === -1 ? body.length : nl + 1;
      continue;
    }
    if (body.startsWith('/*', i)) {
      const end = body.indexOf('*/', i + 2);
      i = end === -1 ? body.length : end + 2;
      continue;
    }
    if (body[i] === '"' || body[i] === "'") {
      const quote = body[i];
      const close = body.indexOf(quote, i + 1);
      if (close === -1) break;
      keys.push(body.slice(i + 1, close));
      i = close + 1;
    } else if (/[A-Za-z_$]/.test(body[i])) {
      const start = i;
      i += 1;
      while (i < body.length && /[A-Za-z0-9_$]/.test(body[i])) i += 1;
      keys.push(body.slice(start, i));
    } else if (body[i] === '.' && body[i + 1] === '.' && body[i + 2] === '.') {
      i += 3;
    } else {
      i += 1;
      continue;
    }
    while (i < body.length && /\s/.test(body[i])) i += 1;
    if (body[i] === ':') {
      i += 1;
      let depthBrace = 0;
      let depthParen = 0;
      let depthBracket = 0;
      let inSingle = false;
      let inDouble = false;
      let escape = false;
      while (i < body.length) {
        const ch = body[i];
        if (escape) {
          escape = false;
          i += 1;
          continue;
        }
        if (ch === '\\' && (inSingle || inDouble)) {
          escape = true;
          i += 1;
          continue;
        }
        if (!inDouble && ch === "'") inSingle = !inSingle;
        else if (!inSingle && ch === '"') inDouble = !inDouble;
        else if (!inSingle && !inDouble) {
          if (ch === '{') depthBrace += 1;
          else if (ch === '}') {
            if (depthBrace === 0 && depthParen === 0 && depthBracket === 0) break;
            depthBrace -= 1;
          } else if (ch === '(') depthParen += 1;
          else if (ch === ')') depthParen -= 1;
          else if (ch === '[') depthBracket += 1;
          else if (ch === ']') depthBracket -= 1;
          else if (ch === ',' && depthBrace === 0 && depthParen === 0 && depthBracket === 0) {
            i += 1;
            break;
          }
        }
        i += 1;
      }
    } else if (body[i] === ',' || body[i] === '}') {
      if (body[i] === ',') i += 1;
    }
  }
  return keys;
}

function lineNumber(source, index) {
  return source.slice(0, index).split('\n').length;
}

function findTrackEventCalls(source) {
  const calls = [];
  const re = /\btrackEvent\s*\(/g;
  let match;
  while ((match = re.exec(source))) {
    const parsed = readBalanced(source, match.index + match[0].length - 1, '(', ')');
    if (!parsed) continue;
    const args = splitTopLevelArgs(parsed.text);
    const nameMatch = args[0]?.match(/^['"]([A-Za-z][A-Za-z0-9_]*)['"]$/);
    calls.push({
      index: match.index,
      line: lineNumber(source, match.index),
      name: nameMatch ? nameMatch[1] : null,
      keys: args[1] ? objectLiteralKeys(args[1]) : [],
    });
  }
  return calls;
}

const taxonomySource = fs.readFileSync(taxonomyPath, 'utf8');
const eventNames = new Set(readStringArray(taxonomySource, 'ANALYTICS_EVENT_NAMES'));
const forbiddenKeys = readStringArray(taxonomySource, 'ANALYTICS_FORBIDDEN_KEYS').map((key) =>
  key.toLowerCase(),
);

const files = walk(scanRoot);
const unknown = [];
const piiHits = [];
const emitted = new Set();

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  if (!source.includes('trackEvent')) continue;
  const rel = path.relative(root, file);
  for (const call of findTrackEventCalls(source)) {
    if (!call.name) continue;
    emitted.add(call.name);
    if (!eventNames.has(call.name)) {
      unknown.push(`${rel}:${call.line}: unknown event '${call.name}'`);
    }
    for (const key of call.keys) {
      const lower = key.toLowerCase();
      if (forbiddenKeys.some((forbidden) => lower.includes(forbidden))) {
        piiHits.push(`${rel}:${call.line}: forbidden prop '${key}' on '${call.name}'`);
      }
    }
  }
}

const unused = [...eventNames].filter((name) => !emitted.has(name)).sort();

if (unused.length) {
  console.warn(`[analytics-taxonomy] unused taxonomy names (not emitted in apps/mobile): ${unused.join(', ')}`);
}

if (unknown.length || piiHits.length) {
  console.error('[analytics-taxonomy] FAILED');
  for (const item of unknown) console.error(`  ✗ ${item}`);
  for (const item of piiHits) console.error(`  ✗ ${item}`);
  process.exit(1);
}

console.log(
  `[analytics-taxonomy] OK — ${emitted.size} emitted names match ${eventNames.size} taxonomy events`,
);
process.exit(0);
