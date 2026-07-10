import { NextRequest, NextResponse } from 'next/server';
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { SOLEON_CONFIG, GRACE_PERIOD_DAYS, MAX_CLEANUP_BATCH_SIZE, isShortBurnDeployment } from '@/lib/solana/config';
import { fetchAllStakePositionRecords, getConnection } from '@/lib/solana/client';

export const dynamic = 'force-dynamic';

export interface ExpiredPositionCandidate {
  pubkey: string;
  owner: string;
}

export interface ExpiredPositionsCacheResponse {
  status: 'ready' | 'pending' | 'error' | 'no_program' | 'no_mint';
  message: string;
  positions: ExpiredPositionCandidate[];
  batchSize: number;
  lastRefreshTimestamp: number | null;
  cached?: boolean;
  cacheAge?: number;
}

type CacheEnvelope = {
  response: ExpiredPositionsCacheResponse;
  storedAt: number;
};

const CACHE_TTL_MS = 8 * 60 * 60 * 1000;
const REDIS_CACHE_KEY = 'soleon:expired-positions-cache:v1:cache';
const REDIS_LOCK_KEY = 'soleon:expired-positions-cache:v1:lock';
const REDIS_CACHE_TTL_SECONDS = 9 * 60 * 60;
const REDIS_LOCK_TTL_SECONDS = 60;
const UPSTASH_REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.trim() || null;
const UPSTASH_REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || null;
const HAS_UPSTASH_REDIS = Boolean(UPSTASH_REDIS_URL && UPSTASH_REDIS_TOKEN);
let memoryCache: CacheEnvelope | null = null;
let refreshPromise: Promise<ExpiredPositionsCacheResponse> | null = null;

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
  if (!response.ok) throw new Error(`Upstash request failed: ${response.status}`);
  const payload = await response.json() as { result?: T; error?: string };
  if (payload.error) throw new Error(payload.error);
  return payload.result ?? null;
}

async function readCache(): Promise<CacheEnvelope | null> {
  if (!HAS_UPSTASH_REDIS) return memoryCache;
  const raw = await upstashCommand<string>(['GET', REDIS_CACHE_KEY]);
  return raw ? JSON.parse(raw) as CacheEnvelope : null;
}

async function writeCache(response: ExpiredPositionsCacheResponse): Promise<CacheEnvelope> {
  const envelope = { response, storedAt: Date.now() };
  memoryCache = envelope;
  if (HAS_UPSTASH_REDIS) {
    await upstashCommand(['SET', REDIS_CACHE_KEY, JSON.stringify(envelope), 'EX', REDIS_CACHE_TTL_SECONDS]);
  }
  return envelope;
}

function withMeta(envelope: CacheEnvelope): ExpiredPositionsCacheResponse {
  return { ...envelope.response, cached: true, cacheAge: Date.now() - envelope.storedAt };
}

async function scanExpiredPositions(): Promise<ExpiredPositionsCacheResponse> {
  if (!SOLEON_CONFIG.programIdConfigured) {
    return { status: 'no_program', message: 'Staking program not published yet.', positions: [], batchSize: MAX_CLEANUP_BATCH_SIZE, lastRefreshTimestamp: null };
  }
  if (!SOLEON_CONFIG.soleonMint) {
    return { status: 'no_mint', message: 'SEON mint not published yet.', positions: [], batchSize: MAX_CLEANUP_BATCH_SIZE, lastRefreshTimestamp: null };
  }

  const connection = getConnection();
  const mint = new PublicKey(SOLEON_CONFIG.soleonMint);
  const now = Math.floor(Date.now() / 1000);
  const graceSeconds = isShortBurnDeployment() ? 3 * 60 * 60 : GRACE_PERIOD_DAYS * 24 * 60 * 60;
  const expired = (await fetchAllStakePositionRecords()).filter(({ account }) =>
    !account.isClosed && now > Number(account.lockEndTime) + graceSeconds
  );
  const tokenAccounts = expired.map(({ account }) =>
    getAssociatedTokenAddressSync(mint, account.owner, false, TOKEN_2022_PROGRAM_ID)
  );
  const infos = tokenAccounts.length > 0
    ? await connection.getMultipleAccountsInfo(tokenAccounts, 'confirmed')
    : [];
  const positions = expired.flatMap(({ pubkey, account }, index) =>
    infos[index] ? [{ pubkey: pubkey.toBase58(), owner: account.owner.toBase58() }] : []
  );

  return {
    status: 'ready',
    message: 'Expired-position scan available.',
    positions,
    batchSize: MAX_CLEANUP_BATCH_SIZE,
    lastRefreshTimestamp: Date.now(),
  };
}

async function resolveCache(force = false): Promise<ExpiredPositionsCacheResponse> {
  const cached = await readCache();
  if (!force && cached && Date.now() - cached.storedAt < CACHE_TTL_MS) return withMeta(cached);
  if (refreshPromise) return cached ? withMeta(cached) : await refreshPromise;

  const lock = HAS_UPSTASH_REDIS
    ? await upstashCommand<string>(['SET', REDIS_LOCK_KEY, String(Date.now()), 'NX', 'EX', REDIS_LOCK_TTL_SECONDS])
    : 'OK';
  if (lock !== 'OK') {
    return cached ? withMeta(cached) : { status: 'pending', message: 'Expired-position scan is already running.', positions: [], batchSize: MAX_CLEANUP_BATCH_SIZE, lastRefreshTimestamp: null };
  }

  refreshPromise = scanExpiredPositions();
  try {
    return (await writeCache(await refreshPromise)).response;
  } finally {
    refreshPromise = null;
    if (HAS_UPSTASH_REDIS) await upstashCommand(['DEL', REDIS_LOCK_KEY]);
  }
}

export async function GET(request: NextRequest) {
  try {
    const force = request.nextUrl.searchParams.get('force') === '1';
    return NextResponse.json(await resolveCache(force));
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
      positions: [],
      batchSize: MAX_CLEANUP_BATCH_SIZE,
      lastRefreshTimestamp: Date.now(),
    } satisfies ExpiredPositionsCacheResponse);
  }
}
