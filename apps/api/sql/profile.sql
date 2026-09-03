-- =====================================================================
-- AllerGuide — "profile" database (per-user data)
-- =====================================================================
-- Standalone, human-readable definition of the user/profile schema.
-- The application manages this via Drizzle migrations (apps/api/drizzle/);
-- this file mirrors that schema for reference / portability.
--
-- Everything tied to a specific user lives here: account, profiles, diary,
-- scan results, emergency contacts, SOS notes and the cloud backup blob.
-- Global reference data lives in the separate "catalog" database (catalog.sql).
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS profile;

-- Accounts (mobile JWT auth) -----------------------------------------
CREATE TABLE IF NOT EXISTS profile.app_users (
    id            serial PRIMARY KEY,
    login         varchar(255) NOT NULL UNIQUE,
    login_type    varchar(16)  NOT NULL,        -- 'email' | 'phone'
    password_hash varchar(512) NOT NULL,
    created_at    timestamptz  NOT NULL DEFAULT now(),
    updated_at    timestamptz  NOT NULL DEFAULT now()
);

-- Allergy profiles (self / child) ------------------------------------
CREATE TABLE IF NOT EXISTS profile.profiles (
    id         serial PRIMARY KEY,
    user_id    integer NOT NULL REFERENCES profile.app_users(id) ON DELETE CASCADE,
    name       varchar(255) NOT NULL,
    birth_year integer,
    type       varchar(16)  NOT NULL,           -- 'self' | 'child'
    allergies  text NOT NULL DEFAULT '[]',      -- JSON array of allergen names
    allergy_confirmations text NOT NULL DEFAULT '{}', -- JSON map allergenId → confirmation source
    created_at timestamptz  NOT NULL DEFAULT now(),
    updated_at timestamptz  NOT NULL DEFAULT now()
);

-- Diary entries ------------------------------------------------------
CREATE TABLE IF NOT EXISTS profile.diary_entries (
    id         serial PRIMARY KEY,
    user_id    integer NOT NULL REFERENCES profile.app_users(id) ON DELETE CASCADE,
    profile_id integer NOT NULL,
    type       varchar(32) NOT NULL,
    details    text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz                       -- soft delete for sync
);
CREATE INDEX IF NOT EXISTS diary_user_profile_idx ON profile.diary_entries (user_id, profile_id);
CREATE INDEX IF NOT EXISTS diary_created_idx       ON profile.diary_entries (created_at);

-- Scan results (history) ---------------------------------------------
CREATE TABLE IF NOT EXISTS profile.scan_history (
    id           serial PRIMARY KEY,
    user_id      integer NOT NULL REFERENCES profile.app_users(id) ON DELETE CASCADE,
    profile_id   integer NOT NULL,
    mode         varchar(16) NOT NULL,           -- product | menu | medicine | cosmetics
    input        text NOT NULL DEFAULT '',
    verdict      text NOT NULL DEFAULT '',
    matches      jsonb NOT NULL DEFAULT '[]'::jsonb,
    level        varchar(16) NOT NULL,           -- low | medium | high
    product_name text,
    source       varchar(16) NOT NULL,           -- manual | barcode | openfoodfacts | ocr | llm
    created_at   timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS scan_user_profile_idx ON profile.scan_history (user_id, profile_id);
CREATE INDEX IF NOT EXISTS scan_created_idx       ON profile.scan_history (created_at);

-- Emergency contacts -------------------------------------------------
CREATE TABLE IF NOT EXISTS profile.emergency_contacts (
    id         serial PRIMARY KEY,
    user_id    integer NOT NULL REFERENCES profile.app_users(id) ON DELETE CASCADE,
    profile_id integer NOT NULL,
    name       varchar(255) NOT NULL,
    phone      varchar(64)  NOT NULL,
    relation   varchar(32)  NOT NULL
);
CREATE INDEX IF NOT EXISTS contacts_user_profile_idx ON profile.emergency_contacts (user_id, profile_id);

-- SOS notes (one per profile) ----------------------------------------
CREATE TABLE IF NOT EXISTS profile.profile_sos (
    profile_id integer PRIMARY KEY,
    user_id    integer NOT NULL REFERENCES profile.app_users(id) ON DELETE CASCADE,
    notes      text NOT NULL DEFAULT '',
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Encrypted cloud backup (zero-knowledge) ----------------------------
CREATE TABLE IF NOT EXISTS profile.sync_backups (
    user_id     integer PRIMARY KEY,
    version     integer NOT NULL DEFAULT 2,
    encrypted   boolean NOT NULL DEFAULT false,
    payload     text NOT NULL,                   -- JSON or AES-GCM envelope
    exported_at varchar(64),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Refresh tokens (opaque, hashed) ------------------------------------
CREATE TABLE IF NOT EXISTS profile.refresh_tokens (
    id         serial PRIMARY KEY,
    user_id    integer NOT NULL REFERENCES profile.app_users(id) ON DELETE CASCADE,
    token_hash varchar(64) NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS refresh_tokens_user_idx ON profile.refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_expires_idx ON profile.refresh_tokens (expires_at);

-- Per-user medicine cards (not visible in public catalog search) ------
CREATE TABLE IF NOT EXISTS profile.medicine_overlays (
    user_id           integer NOT NULL REFERENCES profile.app_users(id) ON DELETE CASCADE,
    normalized_name   varchar(255) NOT NULL,
    name              text NOT NULL,
    active_substance  text NOT NULL DEFAULT '',
    form              varchar(128) NOT NULL DEFAULT '',
    strength          varchar(128) NOT NULL DEFAULT '',
    manufacturer      varchar(255) NOT NULL DEFAULT '',
    indications       text NOT NULL DEFAULT '',
    age_usage         jsonb NOT NULL DEFAULT '[]'::jsonb,
    min_age_years     integer,
    ingredients       text NOT NULL DEFAULT '',
    allergen_tags     jsonb NOT NULL DEFAULT '[]'::jsonb,
    aliases           jsonb NOT NULL DEFAULT '[]'::jsonb,
    source            varchar(32) NOT NULL DEFAULT 'manual',
    confidence        varchar(16) NOT NULL DEFAULT 'low',
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, normalized_name)
);
CREATE INDEX IF NOT EXISTS medicine_overlays_user_idx ON profile.medicine_overlays (user_id);
