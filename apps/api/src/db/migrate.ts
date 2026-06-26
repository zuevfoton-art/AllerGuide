import { runMigrations } from './run-migrations';

/**
 * CLI entrypoint: `pnpm --filter api db:migrate`
 * Runs Drizzle migrations against the configured database.
 * Migrations are also run automatically at API startup (src/index.ts).
 */
runMigrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
