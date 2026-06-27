ALTER TABLE "profile"."profiles" ADD COLUMN IF NOT EXISTS "allergy_confirmations" text NOT NULL DEFAULT '{}';
