CREATE TABLE "sync_backups" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 2 NOT NULL,
	"encrypted" boolean DEFAULT false NOT NULL,
	"payload" text NOT NULL,
	"exported_at" varchar(64),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
