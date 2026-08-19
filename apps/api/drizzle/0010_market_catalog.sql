CREATE TABLE IF NOT EXISTS "catalog"."market_products" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"provider" varchar(32) NOT NULL,
	"provider_sku" varchar(128) DEFAULT '' NOT NULL,
	"title" text NOT NULL,
	"why" text DEFAULT '' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"icon" varchar(64) DEFAULT 'basket' NOT NULL,
	"category" varchar(32) NOT NULL,
	"kind" varchar(16) DEFAULT 'regular' NOT NULL,
	"color_key" varchar(16) DEFAULT 'accent' NOT NULL,
	"for_allergen_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"contains_allergen_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"moderation_status" varchar(16) DEFAULT 'draft' NOT NULL,
	"prescription_only" boolean DEFAULT false NOT NULL,
	"show_price" boolean DEFAULT true NOT NULL,
	"price_rub" integer,
	"refreshed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "market_products_provider_sku_uidx" ON "catalog"."market_products" USING btree ("provider","provider_sku");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "market_products_status_idx" ON "catalog"."market_products" USING btree ("moderation_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "market_products_category_idx" ON "catalog"."market_products" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "market_products_kind_idx" ON "catalog"."market_products" USING btree ("kind");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "catalog"."market_offers" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"product_id" varchar(128) NOT NULL,
	"merchant" varchar(32) NOT NULL,
	"url" text NOT NULL,
	"sku" varchar(128),
	"erid" varchar(128),
	"price_rub" integer,
	"photo_url" text,
	"in_stock" boolean DEFAULT true NOT NULL,
	"refreshed_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "market_offers_product_idx" ON "catalog"."market_offers" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "market_offers_merchant_idx" ON "catalog"."market_offers" USING btree ("merchant");
