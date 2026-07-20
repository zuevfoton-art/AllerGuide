import { createClient, type RedisClientType } from 'redis';
import { logCaughtError } from './log-caught-error';

let client: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType | null> | null = null;

export function isRedisConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.REDIS_URL?.trim());
}

export async function getRedisClient(): Promise<RedisClientType | null> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;

  if (client?.isOpen) return client;

  if (!connectPromise) {
    connectPromise = (async () => {
      const next = createClient({ url });
      next.on('error', (error) => {
        logCaughtError('redis.clientError', error);
      });
      await next.connect();
      client = next;
      return client;
    })().catch((error) => {
      logCaughtError('redis.connect', error);
      return null;
    });
  }

  return connectPromise;
}

export async function pingRedis(): Promise<{
  ok: boolean;
  latencyMs?: number;
  error?: string;
}> {
  const started = Date.now();
  try {
    const redis = await getRedisClient();
    if (!redis) {
      return { ok: false, error: 'REDIS_URL is not configured' };
    }
    const response = await redis.ping();
    if (response !== 'PONG') {
      return { ok: false, error: 'Unexpected PING response', latencyMs: Date.now() - started };
    }
    return { ok: true, latencyMs: Date.now() - started };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Redis ping failed';
    return { ok: false, error: message, latencyMs: Date.now() - started };
  }
}

/** @internal test helper */
export function __resetRedisClientForTests(): void {
  client = null;
  connectPromise = null;
}
