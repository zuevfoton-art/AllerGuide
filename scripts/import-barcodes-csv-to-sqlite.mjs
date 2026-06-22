#!/usr/bin/env node
/**
 * Stream a large CSV into SQLite for offline barcode lookup in the mobile app.
 *
 * Usage:
 *   pnpm import:barcodes:sqlite path/to/barcodes.csv
 *   BARCODES_CSV_PATH="C:\\path\\barcodes.csv" pnpm import:barcodes:sqlite
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_OUT = path.join(ROOT, 'apps', 'mobile', 'assets', 'barcodes', 'catalog.sqlite');

const BARCODE_KEYS = ['barcode', 'ean', 'ean13', 'gtin', 'code', 'bar_code', 'штрихкод', 'штрих_код'];
const NAME_KEYS = ['name', 'product_name', 'title', 'productname', 'название', 'наименование', 'product'];
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
  const brand = pickField(row, BRAND_KEYS) || null;
  const category = pickField(row, CATEGORY_KEYS) || null;

  if (!barcode) return null;
  if (!name && !ingredients) return null;

  return {
    barcode,
    name: name || `Продукт ${barcode}`,
    ingredients: ingredients || name,
    brand,
    category,
  };
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

function createCatalogDatabase(outPath) {
  if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

  const db = new DatabaseSync(outPath);
  db.exec(`
    PRAGMA journal_mode = OFF;
    PRAGMA synchronous = OFF;
    CREATE TABLE barcode_products (
      barcode TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      ingredients TEXT NOT NULL,
      brand TEXT,
      category TEXT
    );
  `);
  return db;
}

async function importCsvToSqlite(csvPath, outPath) {
  const db = createCatalogDatabase(outPath);
  const insert = db.prepare(`
    INSERT OR REPLACE INTO barcode_products (barcode, name, ingredients, brand, category)
    VALUES (?, ?, ?, ?, ?)
  `);

  const stream = fs.createReadStream(csvPath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let headers = null;
  let separator = ',';
  let imported = 0;
  let skipped = 0;
  let lineNo = 0;

  db.exec('BEGIN');

  for await (const rawLine of rl) {
    const line = rawLine.replace(/^\uFEFF/, '').trim();
    if (!line) continue;
    lineNo += 1;

    if (!headers) {
      separator = line.includes(';') ? ';' : ',';
      headers = parseCsvLine(line, separator);
      continue;
    }

    const values = parseCsvLine(line, separator);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    const entry = entryFromRow(row);

    if (!entry) {
      skipped += 1;
      continue;
    }

    insert.run(entry.barcode, entry.name, entry.ingredients, entry.brand, entry.category);
    imported += 1;

    if (imported % 5000 === 0) {
      db.exec('COMMIT');
      db.exec('BEGIN');
      console.log(`Imported ${imported.toLocaleString()} rows...`);
    }
  }

  db.exec('COMMIT');
  db.exec('VACUUM');
  db.close();

  return { imported, skipped, lineNo };
}

const csvPath = process.argv[2] || process.env.BARCODES_CSV_PATH;
const outPath = process.argv[3] || process.env.BARCODES_SQLITE_OUT || DEFAULT_OUT;

if (!csvPath) {
  console.error('Usage: pnpm import:barcodes:sqlite <path/to/file.csv> [output.sqlite]');
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.error(`CSV file not found: ${csvPath}`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });

const stats = fs.statSync(csvPath);
console.log(`Source CSV: ${csvPath} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
console.log(`Output SQLite: ${outPath}`);

const { imported, skipped, lineNo } = await importCsvToSqlite(csvPath, outPath);
const outStats = fs.statSync(outPath);

console.log(`Done. Imported ${imported.toLocaleString()} products, skipped ${skipped.toLocaleString()} rows.`);
console.log(`SQLite size: ${(outStats.size / 1024 / 1024).toFixed(1)} MB`);
console.log(`Processed ${lineNo.toLocaleString()} CSV lines.`);

if (imported === 0) {
  console.error('No rows imported. Check CSV headers: barcode/ean, name, ingredients/состав');
  process.exit(1);
}
