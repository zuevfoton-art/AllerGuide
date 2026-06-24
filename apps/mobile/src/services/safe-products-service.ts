import { getDb } from '@/src/db/init';
import type { SafeProduct } from '@allerguide/core';

export function addSafeProduct(
  profileId: number,
  name: string,
  mode: string,
  input: string,
): void {
  const db = getDb();
  db.runSync(
    'INSERT INTO safe_products (profileId, name, mode, input, savedAt) VALUES (?, ?, ?, ?, ?)',
    [profileId, name, mode, input, new Date().toISOString()],
  );
}

export function removeSafeProduct(id: number): void {
  const db = getDb();
  db.runSync('DELETE FROM safe_products WHERE id = ?', [id]);
}

export function listSafeProducts(profileId: number): SafeProduct[] {
  const db = getDb();
  return db.getAllSync<SafeProduct>(
    'SELECT * FROM safe_products WHERE profileId = ? ORDER BY id DESC',
    [profileId],
  );
}
