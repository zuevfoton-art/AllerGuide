import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { buildConnectionOptions, resolveMigrationUrl } from './config';
import { prepareReplitAuthBeforeMigrate } from './replit-bootstrap';

const SCHEMA_REPAIRS = [
  `ALTER TABLE profile.profiles ADD COLUMN IF NOT EXISTS allergy_confirmations text NOT NULL DEFAULT '{}'`,
];

export async function runMigrations(): Promise<void> {
  const url = resolveMigrationUrl();
  if (!url) {
    console.log('No DATABASE_URL configured — skipping migrations.');
    return;
  }

  const migrationsFolder = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    'drizzle',
  );

  const client = postgres(url, { ...buildConnectionOptions(), max: 1 });

  try {
    await client.unsafe(`CREATE SCHEMA IF NOT EXISTS public`);
    await client.unsafe(`SET search_path TO public`);

    await prepareReplitAuthBeforeMigrate(client);

    console.log(`Running migrations from ${migrationsFolder} ...`);
    const db = drizzle(client);
    await migrate(db, { migrationsFolder });
    console.log('Migrations applied successfully.');
  } catch (err) {
    console.error('Drizzle migrate error (continuing with schema repairs):', err);
  }

  for (const sql of SCHEMA_REPAIRS) {
    try {
      await client.unsafe(sql);
      console.log('Schema repair applied:', sql.slice(0, 60));
    } catch (err) {
      console.error('Schema repair failed:', sql.slice(0, 60), err);
    }
  }

  await client.end();
}
