import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import type { BarcodeProduct } from '@allerguide/core';
import { normalizeBarcode } from '@allerguide/core';

const SQLITE_DIR = `${FileSystem.documentDirectory}barcodes`;
const SQLITE_PATH = `${SQLITE_DIR}/catalog.sqlite`;

let catalogDb: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<boolean> | null = null;

type SqliteRow = {
  barcode: string;
  name: string;
  ingredients: string;
  brand: string | null;
  category: string | null;
};

async function copyBundledCatalogIfNeeded(): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(SQLITE_PATH);
  if (info.exists) return true;

  if (Platform.OS === 'web') {
    return false;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Asset } = require('expo-asset') as typeof import('expo-asset');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const bundled = require('../../assets/barcodes/catalog.sqlite');
    const asset = Asset.fromModule(bundled);
    await asset.downloadAsync();

    if (!asset.localUri) return false;

    await FileSystem.makeDirectoryAsync(SQLITE_DIR, { intermediates: true });
    await FileSystem.copyAsync({ from: asset.localUri, to: SQLITE_PATH });
    return true;
  } catch {
    return false;
  }
}

export async function initBarcodeSqliteCatalog(): Promise<boolean> {
  if (catalogDb) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const hasFile = await copyBundledCatalogIfNeeded();
    if (!hasFile) return false;

    catalogDb = SQLite.openDatabaseSync(SQLITE_PATH);
    return true;
  })();

  return initPromise;
}

export function lookupBarcodeInSqlite(barcode: string): BarcodeProduct | null {
  if (!catalogDb) return null;

  const normalized = normalizeBarcode(barcode);
  if (!normalized) return null;

  const row = catalogDb.getFirstSync<SqliteRow>(
    `SELECT barcode, name, ingredients, brand, category
     FROM barcode_products
     WHERE barcode = ?
     LIMIT 1`,
    [normalized],
  );

  if (!row) return null;

  return {
    barcode: row.barcode,
    name: row.name,
    ingredients: row.ingredients,
    brand: row.brand ?? undefined,
    category: row.category ?? undefined,
  };
}

export async function getBarcodeSqliteCatalogSize(): Promise<number> {
  if (!catalogDb) return 0;
  const row = catalogDb.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM barcode_products',
  );
  return row?.count ?? 0;
}

export function isBarcodeSqliteReady(): boolean {
  return catalogDb != null;
}
