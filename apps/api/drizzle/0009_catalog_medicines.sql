CREATE TABLE IF NOT EXISTS "catalog"."medicines" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"normalized_name" varchar(255) NOT NULL,
	"name" text NOT NULL,
	"active_substance" text DEFAULT '' NOT NULL,
	"form" varchar(128) DEFAULT '' NOT NULL,
	"strength" varchar(128) DEFAULT '' NOT NULL,
	"manufacturer" varchar(255) DEFAULT '' NOT NULL,
	"indications" text DEFAULT '' NOT NULL,
	"age_usage" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"min_age_years" integer,
	"ingredients" text DEFAULT '' NOT NULL,
	"allergen_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source" varchar(32) DEFAULT 'vision' NOT NULL,
	"confidence" varchar(16) DEFAULT 'low' NOT NULL,
	"recognitions" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "medicines_normalized_name_uidx" ON "catalog"."medicines" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medicines_source_idx" ON "catalog"."medicines" USING btree ("source");--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medicines_name_trgm" ON "catalog"."medicines" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medicines_substance_trgm" ON "catalog"."medicines" USING gin ("active_substance" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medicines_allergen_tags" ON "catalog"."medicines" USING gin ("allergen_tags" jsonb_path_ops);
