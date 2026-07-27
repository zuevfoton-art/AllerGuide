-- Source of confirmation per allergen id (self_reported | lab | doctor | …).
-- Column already declared in app-schema.ts; staging DB was missing it.
ALTER TABLE "profile"."profiles"
  ADD COLUMN IF NOT EXISTS "allergy_confirmations" text DEFAULT '{}' NOT NULL;
