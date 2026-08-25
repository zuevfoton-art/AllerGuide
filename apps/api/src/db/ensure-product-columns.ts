import { sql } from 'drizzle-orm';
import { closeDb, db } from './index';

/**
 * Idempotent repair for catalog.products when drizzle journal is ahead of the
 * live table (0005 brand/image_url missing, SELECT/import then fail).
 */
export async function ensureProductColumns(): Promise<void> {
  await db.execute(sql`
    ALTER TABLE catalog.products
    ADD COLUMN IF NOT EXISTS brand varchar(255) DEFAULT '' NOT NULL
  `);
  await db.execute(sql`
    ALTER TABLE catalog.products
    ADD COLUMN IF NOT EXISTS image_url text DEFAULT '' NOT NULL
  `);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  ensureProductColumns()
    .then(() => {
      console.log('catalog.products brand/image_url columns are present.');
    })
    .catch((error) => {
      console.error('ensure-product-columns failed:', error);
      process.exitCode = 1;
    })
    .finally(() => {
      closeDb();
    });
}
