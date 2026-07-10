import 'server-only';

import { randomBytes } from 'node:crypto';
import {
  ELIGIBILITY_RULES_SHA256,
  evaluateWalletEligibility,
  type EligibilityEvaluation,
} from '@/lib/genesis/eligibility';
import { SolanaEligibilityRpcDataSource } from '@/lib/genesis/eligibility-rpc';
import { upstashCommand } from '@/lib/server/upstash';

const ELIGIBILITY_NETWORK = 'mainnet-beta';
const DAILY_NEW_EVALUATION_LIMIT = 200;
const EVALUATION_LOCK_SECONDS = 3 * 60;
const ELIGIBLE_CACHE_SECONDS = 24 * 60 * 60;
const INELIGIBLE_CACHE_SECONDS = 6 * 60 * 60;
const UNAVAILABLE_CACHE_SECONDS = 5 * 60;

function cacheKey(wallet: string): string {
  return `soleon:${ELIGIBILITY_NETWORK}:eligibility:v1:cache:${wallet}`;
}

function lockKey(wallet: string): string {
  return `soleon:${ELIGIBILITY_NETWORK}:eligibility:v1:lock:${wallet}`;
}

function utcDate(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function secondsUntilNextUtcDay(now: Date): number {
  const nextUtcMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1
  );
  return Math.max(1, Math.ceil((nextUtcMidnight - now.getTime()) / 1_000));
}

async function readCachedEvaluation(
  wallet: string
): Promise<EligibilityEvaluation | null> {
  const serialized = await upstashCommand<string | null>(['GET', cacheKey(wallet)]);
  if (!serialized) return null;
  try {
    const evaluation = JSON.parse(serialized) as EligibilityEvaluation;
    if (
      evaluation.wallet !== wallet ||
      evaluation.rulesHash !== ELIGIBILITY_RULES_SHA256 ||
      !['eligible', 'ineligible', 'unavailable'].includes(evaluation.status)
    ) {
      return null;
    }
    return evaluation;
  } catch {
    return null;
  }
}

async function acquireEvaluationLock(
  wallet: string,
  lockId: string
): Promise<boolean> {
  const result = await upstashCommand<string | null>([
    'SET',
    lockKey(wallet),
    lockId,
    'NX',
    'EX',
    EVALUATION_LOCK_SECONDS,
  ]);
  return result === 'OK';
}

async function releaseEvaluationLock(wallet: string, lockId: string): Promise<void> {
  const script = [
    "if redis.call('GET', KEYS[1]) == ARGV[1] then",
    "  return redis.call('DEL', KEYS[1])",
    'end',
    'return 0',
  ].join('\n');
  await upstashCommand<number>(['EVAL', script, 1, lockKey(wallet), lockId]);
}

async function reserveDailyEvaluation(now: Date): Promise<{
  allowed: boolean;
  retryAfterSeconds: number;
}> {
  const ttl = secondsUntilNextUtcDay(now);
  const key = `soleon:${ELIGIBILITY_NETWORK}:eligibility:v1:daily:${utcDate(now)}`;
  const script = [
    "local count = redis.call('INCR', KEYS[1])",
    "if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end",
    "local remaining = redis.call('TTL', KEYS[1])",
    'return {count, remaining}',
  ].join('\n');
  const [count, remaining] = await upstashCommand<[number, number]>([
    'EVAL',
    script,
    1,
    key,
    ttl,
  ]);
  return {
    allowed: count <= DAILY_NEW_EVALUATION_LIMIT,
    retryAfterSeconds: Math.max(1, remaining),
  };
}

async function cacheEvaluation(evaluation: EligibilityEvaluation): Promise<void> {
  const ttl =
    evaluation.status === 'eligible'
      ? ELIGIBLE_CACHE_SECONDS
      : evaluation.status === 'ineligible'
        ? INELIGIBLE_CACHE_SECONDS
        : UNAVAILABLE_CACHE_SECONDS;
  await upstashCommand<string | null>([
    'SET',
    cacheKey(evaluation.wallet),
    JSON.stringify(evaluation),
    'EX',
    ttl,
  ]);
}

export type EligibilityServiceResult =
  | {
      kind: 'evaluation';
      evaluation: EligibilityEvaluation;
      cached: boolean;
    }
  | {
      kind: 'daily_limit';
      retryAfterSeconds: number;
    }
  | {
      kind: 'in_progress';
    };

export async function evaluateWalletEligibilityWithCache(params: {
  wallet: string;
  now?: Date;
}): Promise<EligibilityServiceResult> {
  const cached = await readCachedEvaluation(params.wallet);
  if (cached) {
    return { kind: 'evaluation', evaluation: cached, cached: true };
  }

  const lockId = randomBytes(16).toString('hex');
  const lockAcquired = await acquireEvaluationLock(params.wallet, lockId);
  if (!lockAcquired) return { kind: 'in_progress' };

  try {
    const cacheAfterLock = await readCachedEvaluation(params.wallet);
    if (cacheAfterLock) {
      return { kind: 'evaluation', evaluation: cacheAfterLock, cached: true };
    }

    const now = params.now ?? new Date();
    const dailyReservation = await reserveDailyEvaluation(now);
    if (!dailyReservation.allowed) {
      return {
        kind: 'daily_limit',
        retryAfterSeconds: dailyReservation.retryAfterSeconds,
      };
    }

    const evaluation = await evaluateWalletEligibility({
      wallet: params.wallet,
      dataSource: new SolanaEligibilityRpcDataSource(),
      now,
    });
    await cacheEvaluation(evaluation);
    return { kind: 'evaluation', evaluation, cached: false };
  } finally {
    try {
      await releaseEvaluationLock(params.wallet, lockId);
    } catch {
      // The lock expires automatically; failure to release does not change the result.
    }
  }
}
