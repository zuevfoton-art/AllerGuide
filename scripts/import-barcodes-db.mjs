#!/usr/bin/env node
/**
 * Import barcode products from data/barcodes_db into packages/core catalog JSON.
 *
 * Usage:
 *   pnpm import:barcodes
 *   BARCODES_DB_PATH="C:\\Users\\i.zuev\\Desktop\\ИВА\\МОЕ\\AG\\barcodes_db" pnpm import:barcodes
 *   node scripts/import-barcodes-db.mjs /path/to/barcodes_db
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_SRC = path.join(ROOT, 'data', 'barcodes_db');
const OUT = path.join(ROOT, 'packages', 'core', 'src', 'data', 'barcodes-catalog.json');

const BARCODE_KEYS = ['barcode', 'ean', 'ean13', 'gtin', 'code', 'bar_code', 'штрихкод', 'штрих_код'];
const NAME_KEYS = [
  'name',
  'product_name',
  'title',
  'productname',
  'название',
  'наименование',
  'product',
];
const INGREDIENTS_KEYS = [
  'ingredients',
  'ingredients_text',
  'ingredients_text_ru',
  'composition',
  'состав',
  'ingredient_text',
  'ingredients_ru',
];
const BRAND_KEYS = ['brand', 'brands', 'бренд', 'trademark'];
const CATEGORY_KEYS = ['category', 'categories', 'категория', 'group'];

function normalizeBarcode(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length >= 8 ? digits : '';
}

function pickField(row, keys) {
  const entries = Object.entries(row);
  for (const key of keys) {
    const match = entries.find(([column]) => column.toLowerCase() === key.toLowerCase());
    if (match && match[1] != null && String(match[1]).trim()) {
      return String(match[1]).trim();
    }
  }
  return '';
}

function entryFromRow(row) {
  let barcode = normalizeBarcode(pickField(row, BARCODE_KEYS));
  if (!barcode) {
    for (const value of Object.values(row)) {
      const candidate = normalizeBarcode(value);
      if (candidate) {
        barcode = candidate;
        break;
      }
    }
  }

  const name = pickField(row, NAME_KEYS);
  const ingredients = pickField(row, INGREDIENTS_KEYS);
  const brand = pickField(row, BRAND_KEYS) || undefined;
  const category = pickField(row, CATEGORY_KEYS) || undefined;

  if (!barcode) return null;
  if (!name && !ingredients) return null;

  return {
    barcode,
    name: name || `Продукт ${barcode}`,
    ingredients: ingredients || name,
    ...(brand ? { brand } : {}),
    ...(category ? { category } : {}),
  };
}

function importSqlite(filePath) {
  const db = new DatabaseSync(filePath, { readonly: true });
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all();
  const results = [];

  for (const { name } of tables) {
    const rows = db.prepare(`SELECT * FROM "${name}"`).all();
    for (const row of rows) {
      const entry = entryFromRow(row);
      if (entry) results.push(entry);
    }
  }

  db.close();
  return results;
}

function importJson(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let items = [];

  if (Array.isArray(raw)) {
    items = raw;
  } else if (raw && typeof raw === 'object') {
    items = Object.entries(raw).map(([key, value]) => {
      if (value && typeof value === 'object') {
        return { barcode: key, ...value };
      }
      return { barcode: key, name: String(value) };
    });
  }

  return items.map((row) => entryFromRow(row)).filter(Boolean);
}

function parseCsvLine(line, separator) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === separator && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }

  values.push(current.trim());
  return values.map((value) => value.replace(/^"|"$/g, ''));
}

function importCsv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];

  const separator = lines[0].includes(';') ? ';' : ',';
  const headers = parseCsvLine(lines[0], separator);
  const results = [];

  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line, separator);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    const entry = entryFromRow(row);
    if (entry) results.push(entry);
  }

  return results;
}

function importFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.sqlite' || ext === '.db') return importSqlite(filePath);
  if (ext === '.json') return importJson(filePath);
  if (ext === '.csv') return importCsv(filePath);
  return [];
}

function importDirectory(dirPath) {
  const all = [];
  if (!fs.existsSync(dirPath)) {
    console.warn(`Directory not found: ${dirPath}`);
    return all;
  }

  const stat = fs.statSync(dirPath);
  if (stat.isFile()) {
    return importFile(dirPath);
  }

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      all.push(...importDirectory(full));
      continue;
    }

    try {
      all.push(...importFile(full));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Skip ${full}: ${message}`);
    }
  }

  return all;
}

function dedupe(entries) {
  const map = new Map();
  for (const entry of entries) {
    map.set(entry.barcode, entry);
  }
  return [...map.values()].sort((a, b) => a.barcode.localeCompare(b.barcode));
}

const src = process.argv[2] || process.env.BARCODES_DB_PATH || DEFAULT_SRC;
const entries = dedupe(importDirectory(src));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');

console.log(`Imported ${entries.length} barcode(s) from ${src}`);
console.log(`Output: ${OUT}`);

if (entries.length === 0) {
  console.warn(
    'No barcodes imported. Copy your database files into data/barcodes_db or set BARCODES_DB_PATH.',
  );
  process.exitCode = 1;
}
