import type postgres from 'postgres';

/**
 * Replit Auth blueprint creates public.sessions/users before our Drizzle journal
 * runs. Ensure app tables from migration 0000 exist so migrate() can continue.
 */
export async function prepareReplitAuthBeforeMigrate(client: postgres.Sql): Promise<void> {
  const [{ sessions_exist: sessionsExist }] = await client<{ sessions_exist: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'sessions'
    ) AS sessions_exist
  `;

  if (!sessionsExist) return;

  const [{ app_users_exist: appUsersExist }] = await client<{ app_users_exist: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE (table_schema = 'public' OR table_schema = 'profile')
        AND table_name = 'app_users'
    ) AS app_users_exist
  `;

  if (appUsersExist) return;

  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS "app_users" (
      "id" serial PRIMARY KEY NOT NULL,
      "login" varchar(255) NOT NULL,
      "login_type" varchar(16) NOT NULL,
      "password_hash" varchar(512) NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "app_users_login_unique" UNIQUE("login")
    );

    CREATE TABLE IF NOT EXISTS "profiles" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer NOT NULL,
      "name" varchar(255) NOT NULL,
      "birth_year" integer,
      "type" varchar(16) NOT NULL,
      "allergies" text DEFAULT '[]' NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );

    DO $$ BEGIN
      ALTER TABLE "profiles"
        ADD CONSTRAINT "profiles_user_id_app_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);
}
