import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { buildConnectionOptions, resolveMigrationUrl } from './config';
import { prepareReplitAuthBeforeMigrate } from './replit-bootstrap';

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
  } finally {
    await client.end();
  }
}
