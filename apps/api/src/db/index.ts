import postgres from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

type AppDatabase = PostgresJsDatabase<typeof schema>;

let client: postgres.Sql | null = null;
let dbInstance: AppDatabase | null = null;

function ensureDb(): AppDatabase {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured');
  }

  if (!dbInstance) {
    client = postgres(process.env.DATABASE_URL);
    dbInstance = drizzle(client, { schema });
  }

  return dbInstance;
}

export const db = new Proxy({} as AppDatabase, {
  get(_target, prop, receiver) {
    return Reflect.get(ensureDb(), prop, receiver);
  },
});

export function closeDb() {
  if (client) {
    void client.end();
    client = null;
    dbInstance = null;
  }
}
