import { getDb } from '@/src/db/init';
import { useAppStore } from '@/src/store/app-store';
import type { Profile, ProfileInput, ProfileType } from '@allerguide/core';

export function listProfiles() {
  const db = getDb();
  return db.getAllSync<Profile>('SELECT * FROM profiles ORDER BY id DESC');
}

export async function createProfile(input: ProfileInput) {
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

export async function updateProfile(id: number, input: ProfileInput) {
  const db = getDb();
  db.runSync('UPDATE profiles SET name = ?, birthYear = ?, type = ?, allergies = ? WHERE id = ?', [
    input.name,
    input.birthYear,
    input.type,
    JSON.stringify(input.allergies),
    id,
  ]);
  const profile = db.getFirstSync<Profile>('SELECT * FROM profiles WHERE id = ?', [id]);
  const { activeProfileId, setActiveProfile } = useAppStore.getState();
  if (activeProfileId === id) setActiveProfile(profile || null);
  return profile;
}

export async function deleteProfile(id: number) {
  const db = getDb();
  db.runSync('DELETE FROM diary_entries WHERE profileId = ?', [id]);
  db.runSync('DELETE FROM profiles WHERE id = ?', [id]);

  const { activeProfileId, setActiveProfileId, setActiveProfile } = useAppStore.getState();
  if (activeProfileId === id) {
    const remaining = listProfiles();
    const next = remaining[0] ?? null;
    setActiveProfileId(next?.id ?? null);
    setActiveProfile(next);
  }
}

export async function getProfile(id: number) {
  const db = getDb();
  return db.getFirstSync<Profile>('SELECT * FROM profiles WHERE id = ?', [id]);
}

export function countProfilesByType(type: ProfileType) {
  return listProfiles().filter((p) => p.type === type).length;
}
