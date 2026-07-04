/**
 * Export approved alias feedback terms for manual merge into @allerguide/core allergen-aliases.
 * Run: pnpm --filter api db:merge-approved-aliases
 */
import { eq } from 'drizzle-orm';
import { db, closeDb } from './index';
import { aliasFeedback } from './catalog-schema';

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const rows = await db
    .select()
    .from(aliasFeedback)
    .where(eq(aliasFeedback.status, 'approved'))
    .orderBy(aliasFeedback.createdAt);

  const payload = rows.map((row) => ({
    term: row.term,
    suggestedAllergenId: row.suggestedAllergenId,
    context: row.context,
    approvedAt: row.createdAt?.toISOString(),
  }));

  console.log(JSON.stringify(payload, null, 2));
  await closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
