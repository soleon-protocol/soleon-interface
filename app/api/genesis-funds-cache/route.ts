import { NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { fetchTokenBalance } from '@/lib/solana/client';
import { SOLEON_CONFIG } from '@/lib/solana/config';

export const dynamic = 'force-dynamic';

export type GenesisFundStatus = 'ready' | 'pending' | 'error' | 'no_fund';

export interface GenesisFundCacheEntry {
  status: GenesisFundStatus;
  message: string;
  tokenAccount: string | null;
  balance: string | null;
  lastRefreshTimestamp: number | null;
}

export interface GenesisFundsCacheResponse {
  claimVault: GenesisFundCacheEntry;
  cached?: boolean;
  cacheAge?: number;
}

type CachedGenesisFundsEnvelope = {
  response: GenesisFundsCacheResponse;
  storedAt: number;
};

type GenesisFundsState = {
  cachedFunds: CachedGenesisFundsEnvelope | null;
  refreshPromise: Promise<GenesisFundsCacheResponse> | null;
};

const globalGenesisFundsState = globalThis as typeof globalThis & {
  __soleonGenesisFundsState?: GenesisFundsState;
};

if (!globalGenesisFundsState.__soleonGenesisFundsState) {
  globalGenesisFundsState.__soleonGenesisFundsState = {
    cachedFunds: null,
    refreshPromise: null,
  };
}

const fundsState = globalGenesisFundsState.__soleonGenesisFundsState;

const CACHE_TTL_MS = 60 * 1000;
const REDIS_CACHE_KEY = 'soleon:genesis-funds-cache:v1:cache';
const REDIS_LOCK_KEY = 'soleon:genesis-funds-cache:v1:lock';
const REDIS_CACHE_TTL_SECONDS = 120;
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
  response: GenesisFundsCacheResponse,
  storedAt: number | null
): GenesisFundsCacheResponse {
  return {
    ...response,
    cached: storedAt !== null,
    cacheAge: storedAt === null ? 0 : Date.now() - storedAt,
  };
}

function isRefreshDue(response: GenesisFundsCacheResponse): boolean {
  const lastRefresh = response.claimVault.lastRefreshTimestamp ?? 0;
  return lastRefresh === 0 || Date.now() - lastRefresh >= CACHE_TTL_MS;
}

async function readRedisCache(): Promise<CachedGenesisFundsEnvelope | null> {
  if (!HAS_UPSTASH_REDIS) return fundsState.cachedFunds;

  const raw = await upstashCommand<string>(['GET', REDIS_CACHE_KEY]);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CachedGenesisFundsEnvelope;
    return parsed?.response && typeof parsed.storedAt === 'number' ? parsed : null;
  } catch (error) {
    console.error('[genesis-funds-cache] Failed to parse Redis cache:', error);
    return null;
  }
}

async function writeRedisCache(envelope: CachedGenesisFundsEnvelope): Promise<void> {
  fundsState.cachedFunds = envelope;
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
    console.error('[genesis-funds-cache] Failed to release refresh lock:', error);
  }
}

async function buildFundEntry(label: string, tokenAccount: string | null): Promise<GenesisFundCacheEntry> {
  if (!tokenAccount) {
    return {
      status: 'no_fund',
      message: `${label} token account is not published yet.`,
      tokenAccount: null,
      balance: null,
      lastRefreshTimestamp: null,
    };
  }

  const normalizedTokenAccount = tokenAccount.trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '');

  try {
    const balance = await fetchTokenBalance(new PublicKey(normalizedTokenAccount));
    if (balance === null) {
      return {
        status: 'pending',
        message: `${label} token account exists but its balance is not available yet.`,
        tokenAccount: normalizedTokenAccount,
        balance: null,
        lastRefreshTimestamp: Date.now(),
      };
    }

    return {
      status: 'ready',
      message: `${label} loaded.`,
      tokenAccount: normalizedTokenAccount,
      balance: balance.toString(),
      lastRefreshTimestamp: Date.now(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: 'error',
      message,
      tokenAccount: normalizedTokenAccount || null,
      balance: null,
      lastRefreshTimestamp: Date.now(),
    };
  }
}

async function buildGenesisFundsResponse(): Promise<GenesisFundsCacheResponse> {
  return {
    claimVault: await buildFundEntry(
      'Claim vault',
      SOLEON_CONFIG.commitmentClaimVault
    ),
  };
}

async function refreshGenesisFundsCache(): Promise<CachedGenesisFundsEnvelope> {
  if (fundsState.refreshPromise) {
    const shared = await fundsState.refreshPromise;
    const envelope = { response: shared, storedAt: Date.now() };
    fundsState.cachedFunds = envelope;
    return envelope;
  }

  fundsState.refreshPromise = buildGenesisFundsResponse()
    .then(async (response) => {
      const envelope = { response, storedAt: Date.now() };
      await writeRedisCache(envelope);
      return response;
    })
    .finally(() => {
      fundsState.refreshPromise = null;
    });

  const response = await fundsState.refreshPromise;
  return { response, storedAt: Date.now() };
}

function buildRefreshingResponse(cached: CachedGenesisFundsEnvelope | null): GenesisFundsCacheResponse {
  if (cached) return withCacheMeta(cached.response, cached.storedAt);

  const pendingEntry: GenesisFundCacheEntry = {
    status: 'pending',
    message: 'Genesis funds refresh already in progress. Please retry shortly.',
    tokenAccount: null,
    balance: null,
    lastRefreshTimestamp: null,
  };

  return {
    claimVault: pendingEntry,
  };
}

async function resolveGenesisFundsCache(): Promise<GenesisFundsCacheResponse> {
  const cached = await readRedisCache();
  if (cached && !isRefreshDue(cached.response)) {
    return withCacheMeta(cached.response, cached.storedAt);
  }

  const lockAcquired = await acquireRefreshLock();
  if (lockAcquired) {
    try {
      const envelope = await refreshGenesisFundsCache();
      return withCacheMeta(envelope.response, envelope.storedAt);
    } finally {
      await releaseRefreshLock();
    }
  }

  return buildRefreshingResponse(cached);
}

export async function GET(): Promise<NextResponse<GenesisFundsCacheResponse>> {
  try {
    const response = await resolveGenesisFundsCache();
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const errorEntry: GenesisFundCacheEntry = {
      status: 'error',
      message,
      tokenAccount: null,
      balance: null,
      lastRefreshTimestamp: Date.now(),
    };
    return NextResponse.json({
      claimVault: errorEntry,
    });
  }
}
