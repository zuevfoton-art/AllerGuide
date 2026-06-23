import {
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * `profile` database (Postgres schema) — everything tied to a specific user:
 * their account, profiles, diary, scan results, emergency contacts, SOS notes
 * and the cloud backup blob. Reference/catalog data lives in the separate
 * `catalog` schema (see catalog-schema.ts).
 */
export const profileSchema = pgSchema('profile');

export const appUsers = profileSchema.table('app_users', {
  id: serial('id').primaryKey(),
  login: varchar('login', { length: 255 }).notNull().unique(),
  loginType: varchar('login_type', { length: 16 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 32 }),
  passwordHash: varchar('password_hash', { length: 512 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const profiles = profileSchema.table('profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => appUsers.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  birthYear: integer('birth_year'),
  type: varchar('type', { length: 16 }).notNull(),
  allergies: text('allergies').notNull().default('[]'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const diaryEntries = profileSchema.table(
  'diary_entries',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
    profileId: integer('profile_id').notNull(),
    type: varchar('type', { length: 32 }).notNull(),
    details: text('details').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('diary_user_profile_idx').on(table.userId, table.profileId),
    index('diary_created_idx').on(table.createdAt),
  ],
);

export const scanHistory = profileSchema.table(
  'scan_history',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
    profileId: integer('profile_id').notNull(),
    mode: varchar('mode', { length: 16 }).notNull(),
    input: text('input').notNull().default(''),
    verdict: text('verdict').notNull().default(''),
    matches: jsonb('matches').$type<string[]>().notNull().default([]),
    level: varchar('level', { length: 16 }).notNull(),
    productName: text('product_name'),
    source: varchar('source', { length: 16 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('scan_user_profile_idx').on(table.userId, table.profileId),
    index('scan_created_idx').on(table.createdAt),
  ],
);

export const emergencyContacts = profileSchema.table(
  'emergency_contacts',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
    profileId: integer('profile_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 64 }).notNull(),
    relation: varchar('relation', { length: 32 }).notNull(),
  },
  (table) => [index('contacts_user_profile_idx').on(table.userId, table.profileId)],
);

export const profileSos = profileSchema.table('profile_sos', {
  profileId: integer('profile_id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => appUsers.id, { onDelete: 'cascade' }),
  notes: text('notes').notNull().default(''),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Cloud backup store. `payload` is opaque to the server: it is either a JSON
 * SyncPayload or an AES-GCM envelope (when `encrypted` is true), so the server
 * never needs to read user health data in the clear.
 */
export const syncBackups = profileSchema.table('sync_backups', {
  userId: integer('user_id').primaryKey(),
  version: integer('version').notNull().default(2),
  encrypted: boolean('encrypted').notNull().default(false),
  payload: text('payload').notNull(),
  exportedAt: varchar('exported_at', { length: 64 }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type AppUser = typeof appUsers.$inferSelect;
export type NewAppUser = typeof appUsers.$inferInsert;
export type ProfileRow = typeof profiles.$inferSelect;
export type NewProfileRow = typeof profiles.$inferInsert;
export type DiaryEntryRow = typeof diaryEntries.$inferSelect;
export type NewDiaryEntryRow = typeof diaryEntries.$inferInsert;
export type ScanHistoryRow = typeof scanHistory.$inferSelect;
export type NewScanHistoryRow = typeof scanHistory.$inferInsert;
export type EmergencyContactRow = typeof emergencyContacts.$inferSelect;
export type NewEmergencyContactRow = typeof emergencyContacts.$inferInsert;
export type ProfileSosRow = typeof profileSos.$inferSelect;
export type SyncBackupRow = typeof syncBackups.$inferSelect;
export type NewSyncBackupRow = typeof syncBackups.$inferInsert;
