import { getDb, persistDbWrites } from '@/src/db/init';
import type { SafeProduct } from '@allerguide/core';
import { isOwnedProfile } from '@/src/services/owned-profiles';

export type SafeProductMutationResult =
  | { ok: true }
  | { ok: false; code: 'profile_not_found' | 'invalid_input' | 'not_found' };

function normalizeSafeInput(value: string): string {
  return value.trim();
}

export async function addSafeProduct(
  profileId: number,
  name: string,
  mode: string,
  input: string,
): Promise<SafeProductMutationResult> {
  if (!isOwnedProfile(profileId)) {
    return { ok: false, code: 'profile_not_found' };
  }

  const trimmedName = name.trim();
  const trimmedInput = normalizeSafeInput(input);
  const trimmedMode = mode.trim();
  if (!trimmedName || !trimmedInput || !trimmedMode) {
    return { ok: false, code: 'invalid_input' };
  }

  getDb().runSync(
    'INSERT INTO safe_products (profileId, name, mode, input, savedAt) VALUES (?, ?, ?, ?, ?)',
    [profileId, trimmedName, trimmedMode, trimmedInput, new Date().toISOString()],
  );
  await persistDbWrites();
  return { ok: true };
}

export async function removeSafeProduct(
  id: number,
  profileId: number,
): Promise<SafeProductMutationResult> {
  if (!isOwnedProfile(profileId)) {
    return { ok: false, code: 'profile_not_found' };
  }
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, code: 'invalid_input' };
  }

  const existing = listSafeProducts(profileId).find((item) => item.id === id);
  if (!existing) {
    return { ok: false, code: 'not_found' };
  }

  getDb().runSync('DELETE FROM safe_products WHERE id = ? AND profileId = ?', [id, profileId]);
  await persistDbWrites();
  return { ok: true };
}

export function listSafeProducts(profileId: number): SafeProduct[] {
  if (!isOwnedProfile(profileId)) return [];

  return getDb().getAllSync<SafeProduct>(
    'SELECT * FROM safe_products WHERE profileId = ? ORDER BY id DESC',
    [profileId],
  );
}

export function isSafeProductSaved(
  products: SafeProduct[],
  input: string,
  mode: string,
): boolean {
  const normalizedInput = normalizeSafeInput(input).toLowerCase();
  const normalizedMode = mode.trim();
  if (!normalizedInput || !normalizedMode) return false;

  return products.some(
    (product) =>
      product.mode === normalizedMode &&
      product.input.trim().toLowerCase() === normalizedInput,
  );
}
