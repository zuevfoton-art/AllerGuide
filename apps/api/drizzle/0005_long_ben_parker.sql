ALTER TABLE "catalog"."products" ADD COLUMN "brand" varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog"."products" ADD COLUMN "image_url" text DEFAULT '' NOT NULL;