import 'server-only';

import { createHash } from 'node:crypto';
import { getRedisServerEnv } from '@/lib/env/server';

const REQUEST_TIMEOUT_MS = 5_000;

export class RedisUnavailableError extends Error {
  constructor(message = 'Redis is unavailable') {
    super(message);
    this.name = 'RedisUnavailableError';
  }
}

export async function upstashCommand<T>(command: Array<string | number>): Promise<T> {
  let env: ReturnType<typeof getRedisServerEnv>;
  try {
    env = getRedisServerEnv();
  } catch {
    throw new RedisUnavailableError('Redis configuration is invalid');
  }

  let response: Response;
  try {
    response = await fetch(env.UPSTASH_REDIS_REST_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new RedisUnavailableError();
  }

  if (!response.ok) {
    throw new RedisUnavailableError(`Redis request failed with status ${response.status}`);
  }

  let payload: { result?: T; error?: string };
  try {
    payload = await response.json() as { result?: T; error?: string };
  } catch {
    throw new RedisUnavailableError('Redis returned an invalid response');
  }
  if (payload.error) {
    throw new RedisUnavailableError(payload.error);
  }

  return payload.result as T;
}

export function hashRateLimitSubject(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export async function enforceRateLimit(params: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  const script = [
    "local count = redis.call('INCR', KEYS[1])",
    "if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end",
    "local ttl = redis.call('TTL', KEYS[1])",
    'return {count, ttl}',
  ].join('\n');

  const [count, ttl] = await upstashCommand<[number, number]>([
    'EVAL',
    script,
    1,
    params.key,
    params.windowSeconds,
  ]);

  return {
    allowed: count <= params.limit,
    retryAfterSeconds: Math.max(1, ttl),
  };
}
