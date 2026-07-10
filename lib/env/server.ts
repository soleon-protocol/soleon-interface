import 'server-only';

import { z } from 'zod';

const optionalUrl = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().url().optional()
);

const redisEnvSchema = z.object({
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
});

const eligibilityRpcEnvSchema = z.object({
  SOLEON_ELIGIBILITY_RPC_URL: z.string().url(),
  SOLEON_ELIGIBILITY_FALLBACK_RPC_URL: optionalUrl,
});

const eligibilitySignerEnvSchema = z
  .object({
    SOLEON_ELIGIBILITY_SECRET_KEY: z.string().min(1),
  })
  .superRefine((env, context) => {
    try {
      const bytes = JSON.parse(env.SOLEON_ELIGIBILITY_SECRET_KEY);
      if (
        !Array.isArray(bytes) ||
        bytes.length !== 64 ||
        bytes.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)
      ) {
        throw new Error();
      }
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SOLEON_ELIGIBILITY_SECRET_KEY'],
        message: 'must be a JSON array containing exactly 64 bytes',
      });
    }
  });

export type RedisServerEnv = z.infer<typeof redisEnvSchema>;
export type EligibilityRpcServerEnv = z.infer<typeof eligibilityRpcEnvSchema>;
export type EligibilitySignerServerEnv = z.infer<typeof eligibilitySignerEnvSchema>;

let cachedRedisEnv: RedisServerEnv | null = null;
let cachedEligibilityRpcEnv: EligibilityRpcServerEnv | null = null;
let cachedEligibilitySignerEnv: EligibilitySignerServerEnv | null = null;

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

function deriveMainnetHeliusUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;

  const url = new URL(value.trim());
  if (url.hostname === 'devnet.helius-rpc.com') {
    url.hostname = 'mainnet.helius-rpc.com';
  }
  if (
    url.hostname !== 'mainnet.helius-rpc.com' &&
    url.hostname !== 'beta.helius-rpc.com'
  ) {
    return undefined;
  }
  return url.toString();
}

function normalizeExplicitEligibilityUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  const heliusUrl = deriveMainnetHeliusUrl(value);
  if (heliusUrl) return heliusUrl;

  const url = new URL(value.trim());
  if (url.hostname.includes('devnet')) return undefined;
  return url.toString();
}

export function getEligibilityRpcServerEnv(): EligibilityRpcServerEnv {
  if (cachedEligibilityRpcEnv) return cachedEligibilityRpcEnv;

  const explicitUrl = normalizeExplicitEligibilityUrl(
    process.env.SOLEON_ELIGIBILITY_RPC_URL
  );
  const derivedHeliusUrl = deriveMainnetHeliusUrl(process.env.HELIUS_RPC_URL);
  const fallbackUrl = normalizeExplicitEligibilityUrl(
    process.env.SOLEON_ELIGIBILITY_FALLBACK_RPC_URL
  );
  const result = eligibilityRpcEnvSchema.safeParse({
    SOLEON_ELIGIBILITY_RPC_URL: explicitUrl || derivedHeliusUrl,
    SOLEON_ELIGIBILITY_FALLBACK_RPC_URL: fallbackUrl,
  });

  if (!result.success) {
    throw new Error(
      `Invalid Genesis eligibility RPC configuration: ${formatZodIssues(result.error)}`
    );
  }

  cachedEligibilityRpcEnv = result.data;
  return cachedEligibilityRpcEnv;
}

export function getEligibilitySignerServerEnv(): EligibilitySignerServerEnv {
  if (cachedEligibilitySignerEnv) return cachedEligibilitySignerEnv;

  const result = eligibilitySignerEnvSchema.safeParse({
    SOLEON_ELIGIBILITY_SECRET_KEY: process.env.SOLEON_ELIGIBILITY_SECRET_KEY,
  });

  if (!result.success) {
    throw new Error(
      `Invalid Genesis eligibility server configuration: ${formatZodIssues(result.error)}`
    );
  }

  cachedEligibilitySignerEnv = result.data;
  return cachedEligibilitySignerEnv;
}
