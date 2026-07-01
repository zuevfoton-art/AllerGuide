import { RedisStore, type RedisReply } from 'rate-limit-redis';
import type { Store } from 'express-rate-limit';
import { getRedisClient, isRedisConfigured } from './redis-client';

export type RateLimitStoreKind = 'redis' | 'memory';

export async function createRedisRateLimitStore(prefix: string): Promise<Store | undefined> {
  const client = await getRedisClient();
  if (!client) return undefined;

  return new RedisStore({
    prefix: `rl:${prefix}:`,
    sendCommand: (...args: string[]) => client.sendCommand(args) as Promise<RedisReply>,
  });
}

export function resolveRateLimitStoreKind(): RateLimitStoreKind {
  return isRedisConfigured() ? 'redis' : 'memory';
}
