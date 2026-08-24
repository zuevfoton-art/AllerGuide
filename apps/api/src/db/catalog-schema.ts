import type { MedicineAgeUsage } from '@allerguide/core';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * `catalog` database (Postgres schema) — global reference data shared by all
 * users: the allergen taxonomy, cross-reactions, the product/barcode
 * catalog, and crowd-sourced medicine cards. User-specific data lives in
 * the separate `profile` schema.
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

/**
 * Shared medicine cards recognized from package photos.
 * Deduped by `normalized_name`. No user id and no photo payload.
 */
export const medicines = catalogSchema.table(
  'medicines',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    normalizedName: varchar('normalized_name', { length: 255 }).notNull(),
    name: text('name').notNull(),
    activeSubstance: text('active_substance').notNull().default(''),
    form: varchar('form', { length: 128 }).notNull().default(''),
    strength: varchar('strength', { length: 128 }).notNull().default(''),
    manufacturer: varchar('manufacturer', { length: 255 }).notNull().default(''),
    indications: text('indications').notNull().default(''),
    ageUsage: jsonb('age_usage').$type<MedicineAgeUsage[]>().notNull().default([]),
    minAgeYears: integer('min_age_years'),
    ingredients: text('ingredients').notNull().default(''),
    allergenTags: jsonb('allergen_tags').$type<string[]>().notNull().default([]),
    aliases: jsonb('aliases').$type<string[]>().notNull().default([]),
    source: varchar('source', { length: 32 }).notNull().default('vision'),
    confidence: varchar('confidence', { length: 16 }).notNull().default('low'),
    recognitions: integer('recognitions').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('medicines_normalized_name_uidx').on(table.normalizedName),
    index('medicines_source_idx').on(table.source),
  ],
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

/**
 * Curated marketplace cards (Yandex Market + OTC pharmacy).
 * Draft until a human sets allergen ids. Never store user data here.
 */
export const marketProducts = catalogSchema.table(
  'market_products',
  {
    id: varchar('id', { length: 128 }).primaryKey(),
    provider: varchar('provider', { length: 32 }).notNull(),
    providerSku: varchar('provider_sku', { length: 128 }).notNull().default(''),
    title: text('title').notNull(),
    why: text('why').notNull().default(''),
    imageUrl: text('image_url').notNull().default(''),
    icon: varchar('icon', { length: 64 }).notNull().default('basket'),
    category: varchar('category', { length: 32 }).notNull(),
    kind: varchar('kind', { length: 16 }).notNull().default('regular'),
    colorKey: varchar('color_key', { length: 16 }).notNull().default('accent'),
    forAllergenIds: jsonb('for_allergen_ids').$type<string[]>().notNull().default([]),
    containsAllergenIds: jsonb('contains_allergen_ids').$type<string[]>().notNull().default([]),
    moderationStatus: varchar('moderation_status', { length: 16 }).notNull().default('draft'),
    prescriptionOnly: boolean('prescription_only').notNull().default(false),
    showPrice: boolean('show_price').notNull().default(true),
    priceRub: integer('price_rub'),
    refreshedAt: timestamp('refreshed_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('market_products_provider_sku_uidx').on(table.provider, table.providerSku),
    index('market_products_status_idx').on(table.moderationStatus),
    index('market_products_category_idx').on(table.category),
    index('market_products_kind_idx').on(table.kind),
  ],
);

export const marketOffers = catalogSchema.table(
  'market_offers',
  {
    id: varchar('id', { length: 128 }).primaryKey(),
    productId: varchar('product_id', { length: 128 }).notNull(),
    merchant: varchar('merchant', { length: 32 }).notNull(),
    url: text('url').notNull(),
    sku: varchar('sku', { length: 128 }),
    erid: varchar('erid', { length: 128 }),
    priceRub: integer('price_rub'),
    photoUrl: text('photo_url'),
    inStock: boolean('in_stock').notNull().default(true),
    refreshedAt: timestamp('refreshed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('market_offers_product_idx').on(table.productId),
    index('market_offers_merchant_idx').on(table.merchant),
  ],
);

export type AllergenRow = typeof allergens.$inferSelect;
export type NewAllergenRow = typeof allergens.$inferInsert;
export type CrossReactionRow = typeof crossReactions.$inferSelect;
export type ProductRow = typeof products.$inferSelect;
export type NewProductRow = typeof products.$inferInsert;
export type MedicineRow = typeof medicines.$inferSelect;
export type NewMedicineRow = typeof medicines.$inferInsert;
export type MarketProductRow = typeof marketProducts.$inferSelect;
export type NewMarketProductRow = typeof marketProducts.$inferInsert;
export type MarketOfferRow = typeof marketOffers.$inferSelect;
export type NewMarketOfferRow = typeof marketOffers.$inferInsert;
