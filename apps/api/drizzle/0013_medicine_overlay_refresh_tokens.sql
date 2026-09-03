CREATE TABLE IF NOT EXISTS "profile"."refresh_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "profile"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "profile"."app_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_token_hash_uidx" ON "profile"."refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "refresh_tokens_user_idx" ON "profile"."refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "refresh_tokens_expires_idx" ON "profile"."refresh_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profile"."medicine_overlays" (
	"user_id" integer NOT NULL,
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
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source" varchar(32) DEFAULT 'manual' NOT NULL,
	"confidence" varchar(16) DEFAULT 'low' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "medicine_overlays_user_id_normalized_name_pk" PRIMARY KEY("user_id","normalized_name")
);--> statement-breakpoint
ALTER TABLE "profile"."medicine_overlays" ADD CONSTRAINT "medicine_overlays_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "profile"."app_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medicine_overlays_user_idx" ON "profile"."medicine_overlays" USING btree ("user_id");
