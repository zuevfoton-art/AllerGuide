import { DISH_CATALOG } from '@allerguide/core';
import { closeDb } from './index';
import { upsertBundledDish } from '../services/dish-catalog-store';

export async function seedDishes(): Promise<{ count: number }> {
  for (const recipe of DISH_CATALOG) {
    await upsertBundledDish(recipe);
  }
  return { count: DISH_CATALOG.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedDishes()
    .then((result) => {
      console.log(`Seeded ${result.count} bundled dishes.`);
    })
    .catch((error) => {
      console.error('db:seed-dishes failed:', error);
      process.exitCode = 1;
    })
    .finally(() => {
      closeDb();
    });
}
