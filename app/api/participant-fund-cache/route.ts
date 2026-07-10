import { NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { fetchTokenBalance } from '@/lib/solana/client';
import { SOLEON_CONFIG } from '@/lib/solana/config';

export const dynamic = 'force-dynamic';

export type ParticipantFundCacheStatus = 'ready' | 'pending' | 'error' | 'no_fund';

export interface ParticipantFundCacheResponse {
  status: ParticipantFundCacheStatus;
  message: string;
  fundTokenAccount: string | null;
  balance: string | null;
  lastRefreshTimestamp: number | null;
  cached?: boolean;
  cacheAge?: number;
}

type CachedParticipantFundEnvelope = {
  response: ParticipantFundCacheResponse;
  storedAt: number;
};

type ParticipantFundState = {
  cachedFund: CachedParticipantFundEnvelope | null;
  refreshPromise: Promise<ParticipantFundCacheResponse> | null;
};

const globalParticipantFundState = globalThis as typeof globalThis & {
  __soleonParticipantFundState?: ParticipantFundState;
};

if (!globalParticipantFundState.__soleonParticipantFundState) {
  globalParticipantFundState.__soleonParticipantFundState = {
    cachedFund: null,
    refreshPromise: null,
  };
}

const fundState = globalParticipantFundState.__soleonParticipantFundState;

const CACHE_TTL_MS = 120 * 1000;
const REDIS_CACHE_KEY = 'soleon:participant-fund-cache:v1:cache';
const REDIS_LOCK_KEY = 'soleon:participant-fund-cache:v1:lock';
const REDIS_CACHE_TTL_SECONDS = 180;
const REDIS_LOCK_TTL_SECONDS = 30;

const UPSTASH_REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.trim() || null;
const UPSTASH_REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || null;
const HAS_UPSTASH_REDIS = Boolean(UPSTASH_REDIS_URL && UPSTASH_REDIS_TOKEN);

async function upstashCommand<T = unknown>(command: unknown[]): Promise<T | null> {
  if (!HAS_UPSTASH_REDIS) return null;

  const response = await fetch(UPSTASH_REDIS_URL!, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_REDIS_TOKEN!}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Upstash request failed: ${response.status}`);
  }

  const payload = await response.json() as { result?: T; error?: string };
  if (payload.error) {
    throw new Error(payload.error);
  }

  return payload.result ?? null;
}

function withCacheMeta(
  response: ParticipantFundCacheResponse,
  storedAt: number | null
): ParticipantFundCacheResponse {
  return {
    ...response,
    cached: storedAt !== null,
    cacheAge: storedAt === null ? 0 : Date.now() - storedAt,
  };
}

function buildEnvelope(response: ParticipantFundCacheResponse): CachedParticipantFundEnvelope {
  return {
    response,
    storedAt: Date.now(),
  };
}

function isRefreshDue(response: ParticipantFundCacheResponse): boolean {
  return response.lastRefreshTimestamp === null
    ? true
    : Date.now() - response.lastRefreshTimestamp >= CACHE_TTL_MS;
}

async function readRedisCache(): Promise<CachedParticipantFundEnvelope | null> {
  if (!HAS_UPSTASH_REDIS) return fundState.cachedFund;

  const raw = await upstashCommand<string>(['GET', REDIS_CACHE_KEY]);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CachedParticipantFundEnvelope;
    return parsed?.response && typeof parsed.storedAt === 'number' ? parsed : null;
  } catch (error) {
    console.error('[participant-fund-cache] Failed to parse Redis cache:', error);
    return null;
  }
}

async function writeRedisCache(envelope: CachedParticipantFundEnvelope): Promise<void> {
  fundState.cachedFund = envelope;
  if (!HAS_UPSTASH_REDIS) return;
  await upstashCommand(['SET', REDIS_CACHE_KEY, JSON.stringify(envelope), 'EX', REDIS_CACHE_TTL_SECONDS]);
}

async function acquireRefreshLock(): Promise<boolean> {
  if (!HAS_UPSTASH_REDIS) return true;
  const result = await upstashCommand<string>(['SET', REDIS_LOCK_KEY, String(Date.now()), 'NX', 'EX', REDIS_LOCK_TTL_SECONDS]);
  return result === 'OK';
}

async function releaseRefreshLock(): Promise<void> {
  if (!HAS_UPSTASH_REDIS) return;
  try {
    await upstashCommand(['DEL', REDIS_LOCK_KEY]);
  } catch (error) {
    console.error('[participant-fund-cache] Failed to release refresh lock:', error);
  }
}

async function buildParticipantFundResponse(): Promise<ParticipantFundCacheResponse> {
  const fundTokenAccount = SOLEON_CONFIG.initialDistributionFundTokenAccount
    ?? SOLEON_CONFIG.participantDistributionFundTokenAccount;
  if (!fundTokenAccount) {
    return {
      status: 'no_fund',
      message: 'Initial distribution fund token account is not published yet.',
      fundTokenAccount: null,
      balance: null,
      lastRefreshTimestamp: null,
    };
  }

  const balance = await fetchTokenBalance(new PublicKey(fundTokenAccount));
  if (balance === null) {
    return {
      status: 'pending',
      message: 'Initial distribution fund exists but its balance is not available yet.',
      fundTokenAccount,
      balance: null,
      lastRefreshTimestamp: Date.now(),
    };
  }

  return {
    status: 'ready',
    message: 'Initial distribution fund loaded.',
    fundTokenAccount,
    balance: balance.toString(),
    lastRefreshTimestamp: Date.now(),
  };
}

async function refreshParticipantFundCache(): Promise<CachedParticipantFundEnvelope> {
  if (fundState.refreshPromise) {
    const shared = await fundState.refreshPromise;
    const envelope = buildEnvelope(shared);
    fundState.cachedFund = envelope;
    return envelope;
  }

  fundState.refreshPromise = buildParticipantFundResponse()
    .then(async (response) => {
      const envelope = buildEnvelope(response);
      await writeRedisCache(envelope);
      return response;
    })
    .finally(() => {
      fundState.refreshPromise = null;
    });

  const response = await fundState.refreshPromise;
  return buildEnvelope(response);
}

function buildRefreshingResponse(cached: CachedParticipantFundEnvelope | null): ParticipantFundCacheResponse {
  if (cached) return withCacheMeta(cached.response, cached.storedAt);

  return {
    status: 'pending',
    message: 'Participant fund refresh already in progress. Please retry shortly.',
    fundTokenAccount: null,
    balance: null,
    lastRefreshTimestamp: null,
  };
}

async function resolveParticipantFundCache(): Promise<ParticipantFundCacheResponse> {
  const cached = await readRedisCache();
  if (cached && !isRefreshDue(cached.response)) {
    return withCacheMeta(cached.response, cached.storedAt);
  }

  const lockAcquired = await acquireRefreshLock();
  if (lockAcquired) {
    try {
      const envelope = await refreshParticipantFundCache();
      return withCacheMeta(envelope.response, envelope.storedAt);
    } finally {
      await releaseRefreshLock();
    }
  }

  return buildRefreshingResponse(cached);
}

export async function GET(): Promise<NextResponse<ParticipantFundCacheResponse>> {
  try {
    const response = await resolveParticipantFundCache();
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      status: 'error',
      message,
      fundTokenAccount: SOLEON_CONFIG.initialDistributionFundTokenAccount
        ?? SOLEON_CONFIG.participantDistributionFundTokenAccount,
      balance: null,
      lastRefreshTimestamp: Date.now(),
    });
  }
}
