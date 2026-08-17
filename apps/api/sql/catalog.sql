-- =====================================================================
-- AllerGuide — "catalog" database (global reference data)
-- =====================================================================
-- Standalone, human-readable definition of the catalog schema.
-- The application manages this via Drizzle migrations (apps/api/drizzle/);
-- this file mirrors that schema for reference / portability.
--
-- Shared by all users: the allergen taxonomy, cross-reactions, and the
-- product/barcode catalog. Per-user data lives in the "profile" database
-- (profile.sql).
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE SCHEMA IF NOT EXISTS catalog;

-- Allergen taxonomy (seeded from @allerguide/core) -------------------
CREATE TABLE IF NOT EXISTS catalog.allergens (
    id       varchar(64)  PRIMARY KEY,           -- 'milk', 'peanut', ...
    name     varchar(128) NOT NULL,              -- RU display name
    category varchar(32)  NOT NULL,              -- food | environmental | medication | insect
    popular  boolean      NOT NULL DEFAULT false,
    keywords jsonb        NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS allergens_keywords ON catalog.allergens USING gin (keywords jsonb_path_ops);

-- Cross-reactions ----------------------------------------------------
CREATE TABLE IF NOT EXISTS catalog.cross_reactions (
    from_id varchar(64) NOT NULL,
    to_id   varchar(64) NOT NULL,
    note    text NOT NULL,
    PRIMARY KEY (from_id, to_id)
);

-- Product / barcode catalog ------------------------------------------
CREATE TABLE IF NOT EXISTS catalog.products (
    barcode       varchar(64) PRIMARY KEY,
    name          text NOT NULL,
    ingredients   text NOT NULL DEFAULT '',
    allergen_tags jsonb NOT NULL DEFAULT '[]'::jsonb,   -- canonical RU allergen names
    source        varchar(32) NOT NULL DEFAULT 'manual',-- food-allergy-db | openfoodfacts | manual
    updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Indexed search ------------------------------------------------------
CREATE INDEX IF NOT EXISTS products_source_idx      ON catalog.products (source);
CREATE INDEX IF NOT EXISTS products_name_trgm       ON catalog.products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_ingredients_fts ON catalog.products USING gin (to_tsvector('russian', ingredients));
CREATE INDEX IF NOT EXISTS products_allergen_tags   ON catalog.products USING gin (allergen_tags jsonb_path_ops);

-- Shared medicine cards (package photo recognition, no user id / no photo) --
CREATE TABLE IF NOT EXISTS catalog.medicines (
    id               varchar(64)  PRIMARY KEY,
    normalized_name  varchar(255) NOT NULL,
    name             text         NOT NULL,
    active_substance text         NOT NULL DEFAULT '',
    form             varchar(128) NOT NULL DEFAULT '',
    strength         varchar(128) NOT NULL DEFAULT '',
    manufacturer     varchar(255) NOT NULL DEFAULT '',
    indications      text         NOT NULL DEFAULT '',
    age_usage        jsonb        NOT NULL DEFAULT '[]'::jsonb,
    min_age_years    integer,
    ingredients      text         NOT NULL DEFAULT '',
    allergen_tags    jsonb        NOT NULL DEFAULT '[]'::jsonb,
    source           varchar(32)  NOT NULL DEFAULT 'vision',
    confidence       varchar(16)  NOT NULL DEFAULT 'low',
    recognitions     integer      NOT NULL DEFAULT 1,
    created_at       timestamptz  NOT NULL DEFAULT now(),
    updated_at       timestamptz  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS medicines_normalized_name_uidx ON catalog.medicines (normalized_name);
CREATE INDEX IF NOT EXISTS medicines_source_idx ON catalog.medicines (source);
CREATE INDEX IF NOT EXISTS medicines_name_trgm ON catalog.medicines USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS medicines_substance_trgm ON catalog.medicines USING gin (active_substance gin_trgm_ops);
CREATE INDEX IF NOT EXISTS medicines_allergen_tags ON catalog.medicines USING gin (allergen_tags jsonb_path_ops);
