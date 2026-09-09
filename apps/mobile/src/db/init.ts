import type { DbLike } from '@/src/db/types';
import { routeGetAllSync, routeGetFirstSync, routeRunSync } from '@/src/db/web-sql-router';
import { flushWebStore, hydrateWebStore } from '@/src/db/web-store';

class WebDb implements DbLike {
  execSync(_sql: string) {}

  runSync(sql: string, params?: unknown[]) {
    routeRunSync(sql, params);
  }

  getFirstSync<T>(sql: string, params?: unknown[]): T | null {
    return routeGetFirstSync<T>(sql, params);
  }

  getAllSync<T>(sql: string, params?: unknown[]): T[] {
    return routeGetAllSync<T>(sql, params);
  }
}

const db: DbLike = new WebDb();

export async function initDb() {
  await hydrateWebStore();
}

export function persistDbWrites(): Promise<void> {
  return flushWebStore();
}

export function getDb() {
  return db;
}
