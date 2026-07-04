import {
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * `catalog` database (Postgres schema) — global reference data shared by all
 * users: the allergen taxonomy, cross-reactions, and the product/barcode
 * catalog. User-specific data lives in the separate `profile` schema.
 */
export const catalogSchema = pgSchema('catalog');

/**
 * Global allergen reference catalog. Seeded from `@allerguide/core`
 * (`ALLERGENS`) so the static taxonomy and the database stay in sync.
 */
export const allergens = catalogSchema.table('allergens', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  category: varchar('category', { length: 32 }).notNull(),
  popular: boolean('popular').notNull().default(false),
  keywords: jsonb('keywords').$type<string[]>().notNull().default([]),
});

/** Pairwise cross-reaction notes (seeded from `CROSS_REACTIONS`). */
export const crossReactions = catalogSchema.table(
  'cross_reactions',
  {
    fromId: varchar('from_id', { length: 64 }).notNull(),
    toId: varchar('to_id', { length: 64 }).notNull(),
    note: text('note').notNull(),
  },
  (table) => [primaryKey({ columns: [table.fromId, table.toId] })],
);

/**
 * Product catalog keyed by barcode. Populated from imported datasets and/or a
 * write-through cache over Open Food Facts. `allergenTags` is the set of
 * canonical allergen ids detected for the product.
 */
export const products = catalogSchema.table(
  'products',
  {
    barcode: varchar('barcode', { length: 64 }).primaryKey(),
    name: text('name').notNull(),
    brand: varchar('brand', { length: 255 }).notNull().default(''),
    imageUrl: text('image_url').notNull().default(''),
    ingredients: text('ingredients').notNull().default(''),
    allergenTags: jsonb('allergen_tags').$type<string[]>().notNull().default([]),
    traceTags: jsonb('trace_tags').$type<string[]>().notNull().default([]),
    source: varchar('source', { length: 32 }).notNull().default('manual'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('products_source_idx').on(table.source)],
);

/** Crowdsourced alias terms for scanner keyword enrichment (D.5 persistence). */
export const aliasFeedback = catalogSchema.table(
  'alias_feedback',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    term: varchar('term', { length: 255 }).notNull(),
    suggestedAllergenId: varchar('suggested_allergen_id', { length: 64 }),
    context: text('context'),
    profileId: integer('profile_id'),
    scanInput: text('scan_input'),
    status: varchar('status', { length: 32 }).notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('alias_feedback_status_idx').on(table.status)],
);

export type AllergenRow = typeof allergens.$inferSelect;
export type NewAllergenRow = typeof allergens.$inferInsert;
export type CrossReactionRow = typeof crossReactions.$inferSelect;
export type ProductRow = typeof products.$inferSelect;
export type NewProductRow = typeof products.$inferInsert;
