ALTER TABLE "catalog"."medicines" ADD COLUMN IF NOT EXISTS "barcode" varchar(32);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "medicines_barcode_uidx" ON "catalog"."medicines" ("barcode") WHERE "barcode" IS NOT NULL AND "barcode" <> '';--> statement-breakpoint
ALTER TABLE "profile"."medicine_overlays" ADD COLUMN IF NOT EXISTS "barcode" varchar(32);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medicine_overlays_barcode_idx" ON "profile"."medicine_overlays" ("user_id","barcode") WHERE "barcode" IS NOT NULL AND "barcode" <> '';
