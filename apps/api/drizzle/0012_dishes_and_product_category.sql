ALTER TABLE "catalog"."products" ADD COLUMN IF NOT EXISTS "category" varchar(32) DEFAULT 'food' NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_category_idx" ON "catalog"."products" USING btree ("category");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "catalog"."dishes" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"normalized_name" varchar(255) NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"components" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ingredients" text DEFAULT '' NOT NULL,
	"allergen_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cuisine" varchar(64) DEFAULT '' NOT NULL,
	"source" varchar(32) DEFAULT 'bundled' NOT NULL,
	"status" varchar(16) DEFAULT 'published' NOT NULL,
	"confidence" varchar(16) DEFAULT 'high' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "dishes_normalized_name_uidx" ON "catalog"."dishes" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dishes_status_idx" ON "catalog"."dishes" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dishes_source_idx" ON "catalog"."dishes" USING btree ("source");--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dishes_name_trgm" ON "catalog"."dishes" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dishes_aliases_trgm" ON "catalog"."dishes" USING gin ((aliases::text) gin_trgm_ops);
