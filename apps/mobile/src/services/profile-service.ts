import { getDb } from '@/src/db/init';
import { useAppStore } from '@/src/store/app-store';
import type { Profile } from '@/src/types';

export function listProfiles() {
  const db = getDb();
  return db.getAllSync<Profile>('SELECT * FROM profiles ORDER BY id DESC');
}

export async function createProfile(input: { name: string; birthYear: number; type: string; allergies: string[]; }) {
  const db = getDb();
  db.runSync('INSERT INTO profiles (name, birthYear, type, allergies) VALUES (?, ?, ?, ?)', [
    input.name,
    input.birthYear,
    input.type,
    JSON.stringify(input.allergies),
  ]);
  const row = db.getFirstSync<{ id: number }>('SELECT id FROM profiles ORDER BY id DESC LIMIT 1');
  if (!row?.id) return null;
  const profile = db.getFirstSync<Profile>('SELECT * FROM profiles WHERE id = ?', [row.id]);
  useAppStore.getState().setActiveProfile(profile || null);
  return row.id;
}

export async function getProfile(id: number) {
  const db = getDb();
  return db.getFirstSync<Profile>('SELECT * FROM profiles WHERE id = ?', [id]);
}
