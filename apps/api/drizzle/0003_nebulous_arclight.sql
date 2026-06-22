CREATE SCHEMA "profile";
--> statement-breakpoint
CREATE SCHEMA "catalog";
--> statement-breakpoint
-- Move existing tables into their dedicated schemas (non-destructive: data,
-- indexes, constraints and owned sequences move with the table).
ALTER TABLE "app_users" SET SCHEMA "profile";--> statement-breakpoint
ALTER TABLE "profiles" SET SCHEMA "profile";--> statement-breakpoint
ALTER TABLE "sync_backups" SET SCHEMA "profile";--> statement-breakpoint
ALTER TABLE "allergens" SET SCHEMA "catalog";--> statement-breakpoint
ALTER TABLE "cross_reactions" SET SCHEMA "catalog";--> statement-breakpoint
ALTER TABLE "products" SET SCHEMA "catalog";--> statement-breakpoint
CREATE TABLE "profile"."diary_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"profile_id" integer NOT NULL,
	"type" varchar(32) NOT NULL,
	"details" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "profile"."emergency_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"profile_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(64) NOT NULL,
	"relation" varchar(32) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile"."profile_sos" (
	"profile_id" integer PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile"."scan_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"profile_id" integer NOT NULL,
	"mode" varchar(16) NOT NULL,
	"input" text DEFAULT '' NOT NULL,
	"verdict" text DEFAULT '' NOT NULL,
	"matches" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"level" varchar(16) NOT NULL,
	"product_name" text,
	"source" varchar(16) NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profile"."diary_entries" ADD CONSTRAINT "diary_entries_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "profile"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile"."emergency_contacts" ADD CONSTRAINT "emergency_contacts_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "profile"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile"."profile_sos" ADD CONSTRAINT "profile_sos_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "profile"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile"."scan_history" ADD CONSTRAINT "scan_history_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "profile"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "diary_user_profile_idx" ON "profile"."diary_entries" USING btree ("user_id","profile_id");--> statement-breakpoint
CREATE INDEX "diary_created_idx" ON "profile"."diary_entries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "contacts_user_profile_idx" ON "profile"."emergency_contacts" USING btree ("user_id","profile_id");--> statement-breakpoint
CREATE INDEX "scan_user_profile_idx" ON "profile"."scan_history" USING btree ("user_id","profile_id");--> statement-breakpoint
CREATE INDEX "scan_created_idx" ON "profile"."scan_history" USING btree ("created_at");
