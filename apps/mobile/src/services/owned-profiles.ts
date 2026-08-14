import type { Profile } from '@allerguide/core';
import { getDb } from '@/src/db/init';
import { getCurrentUserId } from '@/src/services/auth-service';

export function getOwnedProfileIds(): number[] {
  const userId = getCurrentUserId();
  if (!userId) return [];

  return getDb()
    .getAllSync<Pick<Profile, 'id'>>('SELECT id FROM profiles WHERE userId = ?', [userId])
    .map((row) => row.id);
}

export function isOwnedProfile(profileId: number): boolean {
  if (!Number.isInteger(profileId) || profileId <= 0) return false;
  return getOwnedProfileIds().includes(profileId);
}
