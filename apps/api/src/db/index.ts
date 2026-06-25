import postgres from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import { buildConnectionOptions, resolveReadUrl, resolveRuntimeUrl } from './config';

type AppDatabase = PostgresJsDatabase<typeof schema>;

let primaryClient: postgres.Sql | null = null;
let readClient: postgres.Sql | null = null;
let primaryDb: AppDatabase | null = null;
let readDbInstance: AppDatabase | null = null;

function ensurePrimary(): AppDatabase {
  const url = resolveRuntimeUrl();
  if (!url) {
    throw new Error('DATABASE_URL is not configured');
  }

  if (!primaryDb) {
    primaryClient = postgres(url, buildConnectionOptions());
    primaryDb = drizzle(primaryClient, { schema });
  }

  return primaryDb;
}

function ensureRead(): AppDatabase {
  const readUrl = resolveReadUrl();
  // No replica configured -> read from the primary.
  if (!readUrl) return ensurePrimary();

  if (!readDbInstance) {
    readClient = postgres(readUrl, buildConnectionOptions());
    readDbInstance = drizzle(readClient, { schema });
  }

  return readDbInstance;
}

/** Primary (read/write) database. Use for all writes. */
export const db = new Proxy({} as AppDatabase, {
  get(_target, prop, receiver) {
    return Reflect.get(ensurePrimary(), prop, receiver);
  },
});

/**
 * Read database. Routes to a read replica when `READ_DATABASE_URL` is set,
 * otherwise falls back to the primary. Use for read-only queries only
 * (replica data may lag the primary).
 */
export const readDb = new Proxy({} as AppDatabase, {
  get(_target, prop, receiver) {
    return Reflect.get(ensureRead(), prop, receiver);
  },
});

export function closeDb() {
  if (primaryClient) {
    void primaryClient.end();
    primaryClient = null;
    primaryDb = null;
  }
  if (readClient) {
    void readClient.end();
    readClient = null;
    readDbInstance = null;
  }
}
