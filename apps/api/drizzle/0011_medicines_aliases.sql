ALTER TABLE "catalog"."medicines" ADD COLUMN IF NOT EXISTS "aliases" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medicines_aliases_trgm" ON "catalog"."medicines" USING gin (("aliases"::text) gin_trgm_ops);
