import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  mapExternalAllergenNames,
  medicineCardKey,
  toMedicineCard,
  type MedicineAgeUsage,
  type MedicineCard,
  type MedicineConfidence,
} from '@allerguide/core';

/**
 * Seeds the shared medicine catalog through the public API (`POST /api/medicines`)
 * rather than writing to Postgres directly: the endpoint owns dedupe, merging and
 * the write guard, so a re-run never downgrades a richer card.
 */

const DATA_FILE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'data',
  'medicines',
  'allergy-medicines.json',
);

const DEFAULT_API_BASE_URL = 'https://api.staging.aclearo.com';
/** `/api/medicines` shares the scan limiter: 30 requests per minute per IP. */
const DEFAULT_REQUEST_DELAY_MS = 2500;
const RETRY_AFTER_FALLBACK_MS = 60_000;
const MAX_ATTEMPTS_PER_CARD = 3;

export interface MedicineSeedEntry {
  name: string;
  activeSubstance: string;
  form?: string;
  strength?: string;
  manufacturer?: string;
  indications?: string;
  ageUsage?: MedicineAgeUsage[];
  minAgeYears?: number | null;
  ingredients?: string;
  allergenTags?: string[];
  /** Dataset metadata: prescription-only cards must not carry a dose. */
  prescriptionOnly?: boolean;
  confidence?: MedicineConfidence;
}

export interface SeedMedicinesStats {
  total: number;
  saved: number;
  failed: number;
}

export function readMedicineSeedEntries(file = DATA_FILE): MedicineSeedEntry[] {
  const parsed = JSON.parse(readFileSync(file, 'utf8')) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`Medicine dataset must be an array: ${file}`);
  }
  return parsed as MedicineSeedEntry[];
}

/** Dataset entry → catalog card. Allergen tags go through the canonical mapping. */
export function seedEntryToCard(entry: MedicineSeedEntry): MedicineCard {
  return toMedicineCard(
    {
      name: entry.name,
      activeSubstance: entry.activeSubstance,
      form: entry.form,
      strength: entry.strength,
      manufacturer: entry.manufacturer,
      indications: entry.indications,
      ageUsage: entry.ageUsage ?? [],
      minAgeYears: entry.minAgeYears ?? null,
      ingredients: entry.ingredients,
      allergenTags: entry.allergenTags?.length
        ? mapExternalAllergenNames(entry.allergenTags)
        : [],
      confidence: entry.confidence ?? 'medium',
    },
    'catalog',
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(response: Response): number {
  const raw = response.headers.get('retry-after');
  const seconds = raw == null ? Number.NaN : Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  return RETRY_AFTER_FALLBACK_MS;
}

async function postCard(
  baseUrl: string,
  writeKey: string,
  card: MedicineCard,
): Promise<{ ok: true } | { ok: false; error: string }> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_CARD; attempt += 1) {
    const response = await fetch(`${baseUrl}/api/medicines`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-medicine-write-key': writeKey,
      },
      body: JSON.stringify(card),
    });

    if (response.ok) return { ok: true };

    if (response.status === 429 && attempt < MAX_ATTEMPTS_PER_CARD) {
      const wait = retryDelayMs(response);
      console.log(`  rate limited, retry in ${Math.round(wait / 1000)}s`);
      await sleep(wait);
      continue;
    }

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: payload.error ?? `HTTP ${response.status}` };
  }

  return { ok: false, error: 'rate limited' };
}

export async function seedMedicines(options: {
  baseUrl: string;
  writeKey: string;
  entries?: MedicineSeedEntry[];
  requestDelayMs?: number;
}): Promise<SeedMedicinesStats> {
  const entries = options.entries ?? readMedicineSeedEntries();
  const delayMs = options.requestDelayMs ?? DEFAULT_REQUEST_DELAY_MS;
  const stats: SeedMedicinesStats = { total: entries.length, saved: 0, failed: 0 };

  for (const [index, entry] of entries.entries()) {
    const card = seedEntryToCard(entry);
    const result = await postCard(options.baseUrl, options.writeKey, card);

    if (result.ok) {
      stats.saved += 1;
      console.log(`[${index + 1}/${entries.length}] ${card.name} — ok`);
    } else {
      stats.failed += 1;
      console.error(`[${index + 1}/${entries.length}] ${card.name} — ${result.error}`);
    }

    if (index < entries.length - 1) await sleep(delayMs);
  }

  return stats;
}

async function main() {
  const baseUrl = (process.env.API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/+$/, '');
  const writeKey = process.env.MEDICINE_WRITE_KEY?.trim();
  if (!writeKey) {
    throw new Error('Set MEDICINE_WRITE_KEY — catalog writes require it (see Lockbox).');
  }

  const entries = readMedicineSeedEntries();
  const duplicates = findDuplicateKeys(entries);
  if (duplicates.length) {
    throw new Error(`Duplicate medicine names in the dataset: ${duplicates.join(', ')}`);
  }

  console.log(`Seeding ${entries.length} medicines into ${baseUrl}`);
  const stats = await seedMedicines({ baseUrl, writeKey, entries });
  console.log(`Done: ${stats.saved} saved, ${stats.failed} failed of ${stats.total}.`);
  if (stats.failed > 0) process.exitCode = 1;
}

export function findDuplicateKeys(entries: MedicineSeedEntry[]): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const entry of entries) {
    const key = medicineCardKey({ name: entry.name });
    if (seen.has(key)) duplicates.push(entry.name);
    seen.add(key);
  }
  return duplicates;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Medicine seeding failed:', error);
    process.exit(1);
  });
}
