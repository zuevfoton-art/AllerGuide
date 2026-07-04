ALTER TABLE "profile"."sync_backups"
  ADD CONSTRAINT "sync_backups_user_id_app_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "profile"."app_users"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "catalog"."alias_feedback" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "term" varchar(255) NOT NULL,
  "suggested_allergen_id" varchar(64),
  "context" text,
  "profile_id" integer,
  "scan_input" text,
  "status" varchar(32) DEFAULT 'pending' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "alias_feedback_status_idx" ON "catalog"."alias_feedback" ("status");
