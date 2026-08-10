import 'server-only';

import { z } from 'zod';

const redisEnvSchema = z.object({
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
});

export type RedisServerEnv = z.infer<typeof redisEnvSchema>;

let cachedRedisEnv: RedisServerEnv | null = null;

function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
}

export function getRedisServerEnv(): RedisServerEnv {
  if (cachedRedisEnv) return cachedRedisEnv;

  const result = redisEnvSchema.safeParse({
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  if (!result.success) {
    throw new Error(`Invalid Redis server configuration: ${formatZodIssues(result.error)}`);
  }

  cachedRedisEnv = result.data;
  return cachedRedisEnv;
}
