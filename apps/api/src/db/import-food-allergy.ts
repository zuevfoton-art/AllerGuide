import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { mapExternalAllergenIds } from '@allerguide/core';
import { db } from './index';
import { products } from './catalog-schema';
import type { NewProductRow } from './catalog-schema';

const DATA_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'data',
  'food-allergy',
);

/** Minimal CSV row parser that handles double-quoted fields with commas. */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields.map((field) => field.trim());
}

function readCsv(file: string): string[][] {
  return readFileSync(path.join(DATA_DIR, file), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map(parseCsvLine);
}

/**
 * Imports the alexf388/Food-Allergy-SQL-Database dataset into `products`:
 *  - allergy.csv      -> Allergy_ID -> Allergy_name
 *  - foodallergy.csv  -> Allergy_ID, food_barcode  (M:N)
 *  - foodproduct.csv  -> food_name, food_barcode
 * Each product is written with `allergenTags` = canonical allergen ids that
 * map to its barcode. Idempotent (upsert by barcode).
 */
export async function importFoodAllergyDataset() {
  const allergyNameById = new Map<string, string>();
  for (const [id, name] of readCsv('allergy.csv')) {
    if (id) allergyNameById.set(id, name);
  }

  const tagsByBarcode = new Map<string, Set<string>>();
  for (const [allergyId, barcode] of readCsv('foodallergy.csv')) {
    if (!barcode) continue;
    const name = allergyNameById.get(allergyId);
    if (!name) continue;
    if (!tagsByBarcode.has(barcode)) tagsByBarcode.set(barcode, new Set());
    tagsByBarcode.get(barcode)!.add(name);
  }

  const rows: NewProductRow[] = [];
  for (const [name, barcode] of readCsv('foodproduct.csv')) {
    if (!barcode || !name) continue;
    rows.push({
      barcode,
      name,
      ingredients: '',
      // Map dataset English allergy names to canonical ids for scanner matching.
      allergenTags: mapExternalAllergenIds([...(tagsByBarcode.get(barcode) ?? [])]),
      source: 'food-allergy-db',
    });
  }

  let imported = 0;
  // Batch upserts to keep statements small.
  const batchSize = 200;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    if (batch.length === 0) continue;
    await db
      .insert(products)
      .values(batch)
      .onConflictDoUpdate({
        target: products.barcode,
        set: {
          name: sql`excluded.name`,
          allergenTags: sql`excluded.allergen_tags`,
          source: sql`excluded.source`,
          updatedAt: new Date(),
        },
      });
    imported += batch.length;
  }

  return { allergies: allergyNameById.size, products: imported };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  importFoodAllergyDataset()
    .then((result) => {
      console.log(`Imported ${result.products} products across ${result.allergies} allergy types.`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Import failed:', error);
      process.exit(1);
    });
}
