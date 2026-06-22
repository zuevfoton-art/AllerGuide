CREATE TABLE "allergens" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"category" varchar(32) NOT NULL,
	"popular" boolean DEFAULT false NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cross_reactions" (
	"from_id" varchar(64) NOT NULL,
	"to_id" varchar(64) NOT NULL,
	"note" text NOT NULL,
	CONSTRAINT "cross_reactions_from_id_to_id_pk" PRIMARY KEY("from_id","to_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"barcode" varchar(64) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"ingredients" text DEFAULT '' NOT NULL,
	"allergen_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source" varchar(32) DEFAULT 'manual' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "products_source_idx" ON "products" USING btree ("source");--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "products_name_trgm" ON "products" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "products_ingredients_fts" ON "products" USING gin (to_tsvector('russian', "ingredients"));--> statement-breakpoint
CREATE INDEX "products_allergen_tags" ON "products" USING gin ("allergen_tags" jsonb_path_ops);--> statement-breakpoint
CREATE INDEX "allergens_keywords" ON "allergens" USING gin ("keywords" jsonb_path_ops);