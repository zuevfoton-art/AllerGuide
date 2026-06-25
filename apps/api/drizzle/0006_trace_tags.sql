ALTER TABLE "catalog"."products" ADD COLUMN IF NOT EXISTS "trace_tags" jsonb DEFAULT '[]'::jsonb NOT NULL;
