import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // Prefer DIRECT_DATABASE_URL for schema diffing/migrations (not a pooler).
    url: (process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL)!,
  },
  tablesFilter: ['!sessions', '!users'],
});
