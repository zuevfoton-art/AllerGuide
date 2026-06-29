import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { buildConnectionOptions, resolveMigrationUrl } from './config';
import { prepareReplitAuthBeforeMigrate } from './replit-bootstrap';

/**
 * Applies versioned SQL migrations from ./drizzle.
 * Use this instead of `drizzle-kit push` for production: migrations are
 * generated with `pnpm --filter api db:generate`, committed to git, and
 * applied deterministically here.
 *
 * Runs against the DIRECT (unpooled) connection on Neon — migrations are not
 * compatible with PgBouncer transaction pooling.
 */
async function main() {
  const url = resolveMigrationUrl();
  if (!url) {
    throw new Error('DIRECT_DATABASE_URL or DATABASE_URL is not configured');
  }

  const migrationsFolder = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    'drizzle',
  );

  const client = postgres(url, { ...buildConnectionOptions(), max: 1 });
  const db = drizzle(client);

  await prepareReplitAuthBeforeMigrate(client);

  console.log(`Running migrations from ${migrationsFolder} ...`);
  await migrate(db, { migrationsFolder });
  console.log('Migrations applied successfully.');

  await client.end();
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
