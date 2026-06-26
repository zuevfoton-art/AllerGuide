import { ALLERGENS, CROSS_REACTIONS } from '@allerguide/core';
import { db } from './index';
import { allergens, crossReactions } from './catalog-schema';

/**
 * Seeds the global allergen reference tables from the canonical static taxonomy
 * in `@allerguide/core`. Idempotent (upsert), safe to re-run.
 */
export async function seedAllergens() {
  for (const allergen of ALLERGENS) {
    await db
      .insert(allergens)
      .values({
        id: allergen.id,
        name: allergen.name,
        category: allergen.category,
        popular: allergen.popular,
        keywords: allergen.keywords,
      })
      .onConflictDoUpdate({
        target: allergens.id,
        set: {
          name: allergen.name,
          category: allergen.category,
          popular: allergen.popular,
          keywords: allergen.keywords,
        },
      });
  }

  for (const reaction of CROSS_REACTIONS) {
    await db
      .insert(crossReactions)
      .values(reaction)
      .onConflictDoUpdate({
        target: [crossReactions.fromId, crossReactions.toId],
        set: { note: reaction.note },
      });
  }

  return { allergens: ALLERGENS.length, crossReactions: CROSS_REACTIONS.length };
}

// Allow running directly: `tsx src/db/seed-allergens.ts`
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAllergens()
    .then((result) => {
      console.log(`Seeded ${result.allergens} allergens, ${result.crossReactions} cross-reactions.`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}
