import { and, eq, ilike, or, sql } from 'drizzle-orm';
import {
  DISH_CATALOG,
  DISH_COMPONENTS_BY_ID,
  normalizeSearchText,
  rankLocalDishSuggestions,
  type DishSuggestion,
} from '@allerguide/core';
import { db, readDb } from '../db';
import { dishes, type DishRow } from '../db/catalog-schema';

const DEFAULT_SEARCH_LIMIT = 12;
const DISH_TRGM_SIMILARITY_THRESHOLD = 0.3;

export function dishRowToSuggestion(row: DishRow): DishSuggestion {
  return {
    id: row.id,
    name: row.name,
    source: 'catalog',
    score: 70,
    ingredientsPreview: row.ingredients,
  };
}

export function bundledDishSuggestions(query: string, limit = DEFAULT_SEARCH_LIMIT): DishSuggestion[] {
  return rankLocalDishSuggestions(query, limit);
}

export async function searchDishes(query: string, limit = DEFAULT_SEARCH_LIMIT): Promise<DishSuggestion[]> {
  const normalized = normalizeSearchText(query);
  if (normalized.length < 2) return [];

  const escaped = query.replace(/[%_\\]/g, '\\$&');
  const contains = `%${escaped}%`;
  const aliasContains = sql`exists (
    select 1
    from jsonb_array_elements_text(${dishes.aliases}) as alias_name
    where alias_name ilike ${contains}
  )`;
  const similarity = sql`greatest(
    similarity(${dishes.name}, ${query}),
    similarity(${dishes.normalizedName}, ${normalized}),
    coalesce((
      select max(similarity(alias_name, ${query}))
      from jsonb_array_elements_text(${dishes.aliases}) as alias_name
    ), 0)
  )`;

  const rows = await readDb
    .select()
    .from(dishes)
    .where(
      and(
        eq(dishes.status, 'published'),
        or(
          ilike(dishes.name, contains),
          ilike(dishes.normalizedName, `%${normalized}%`),
          aliasContains,
          sql`${similarity} >= ${DISH_TRGM_SIMILARITY_THRESHOLD}`,
        ),
      ),
    )
    .orderBy(sql`${similarity} desc`, dishes.name)
    .limit(limit);

  const published = rows.filter((row) => row.status === 'published');
  if (published.length > 0) return published.map(dishRowToSuggestion);
  return bundledDishSuggestions(query, limit);
}

export async function upsertBundledDish(recipe: (typeof DISH_CATALOG)[number]): Promise<void> {
  const name = recipe.names[0];
  const normalizedName = normalizeSearchText(name);
  const allergenTags = recipe.components
    .map((item) => item.allergenId)
    .filter((id): id is string => Boolean(id));
  const ingredients = recipe.components
    .map((item) => DISH_COMPONENTS_BY_ID[item.id]?.nameRu ?? item.nameRu)
    .join(', ');

  await db
    .insert(dishes)
    .values({
      id: recipe.id,
      name,
      normalizedName,
      aliases: recipe.names.slice(1),
      components: recipe.components.map((item) => item.id),
      ingredients,
      allergenTags,
      cuisine: recipe.cuisine ?? '',
      source: 'bundled',
      status: 'published',
      confidence: 'high',
    })
    .onConflictDoUpdate({
      target: dishes.id,
      set: {
        name,
        normalizedName,
        aliases: recipe.names.slice(1),
        components: recipe.components.map((item) => item.id),
        ingredients,
        allergenTags,
        cuisine: recipe.cuisine ?? '',
        source: 'bundled',
        status: 'published',
        updatedAt: new Date(),
      },
    });
}
