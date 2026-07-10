import { NextResponse } from 'next/server';
import { SOLEON_CONFIG } from '@/lib/solana/config';

export const dynamic = 'force-dynamic';

export type MarketCacheStatus = 'ready' | 'pending' | 'error' | 'unavailable' | 'no_mint' | 'no_rpc';
export type MarketVerification = 'verified' | 'community' | 'high_risk' | 'fake' | 'pending';

export interface MarketSummarySnapshot {
  priceUsd: string | null;
  marketCapUsd: string | null;
  totalLiquidityUsd: string | null;
  volume24hUsd: string | null;
  marketsStatus: string;
  sourceName: string | null;
  sourceUrl: string | null;
}

export interface ManifestMarketSnapshot {
  pair: 'SEON/USDC';
  status: MarketCacheStatus;
  verification: MarketVerification;
  marketAddress: string | null;
  tradeUrl: string | null;
  bestBidUsd: string | null;
  bestAskUsd: string | null;
  spread: string | null;
  volume24hUsd: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
}

export interface MarketPoolSnapshot {
  id: string;
  dex: string;
  pair: string;
  status: MarketCacheStatus;
  verification: MarketVerification;
  poolAddress: string;
  tradeUrl: string | null;
  priceUsd: string | null;
  tvlUsd: string | null;
  volume24hUsd: string | null;
  fee: string | null;
  liquidityControl: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
}

export interface MarketRouteSnapshot {
  id: string;
  name: string;
  status: MarketCacheStatus;
  url: string | null;
  description: string;
}

export interface MarketCacheResponse {
  status: MarketCacheStatus;
  message: string;
  updatedAt: number;
  cached?: boolean;
  cacheAge?: number;
  mintAddress: string | null;
  manifest: ManifestMarketSnapshot;
  summary: MarketSummarySnapshot;
  pools: MarketPoolSnapshot[];
  routes: MarketRouteSnapshot[];
}

type CachedMarketEnvelope = {
  response: MarketCacheResponse;
  storedAt: number;
};

type GlobalMarketState = {
  cachedMarket: CachedMarketEnvelope | null;
  refreshPromise: Promise<MarketCacheResponse> | null;
};

type ConfiguredPool = {
  id?: unknown;
  dex?: unknown;
  pair?: unknown;
  verification?: unknown;
  poolAddress?: unknown;
  tradeUrl?: unknown;
  priceUsd?: unknown;
  tvlUsd?: unknown;
  volume24hUsd?: unknown;
  fee?: unknown;
  liquidityControl?: unknown;
  sourceName?: unknown;
  sourceUrl?: unknown;
};

const globalMarketState = globalThis as typeof globalThis & {
  __soleonMarketState?: GlobalMarketState;
};

if (!globalMarketState.__soleonMarketState) {
  globalMarketState.__soleonMarketState = {
    cachedMarket: null,
    refreshPromise: null,
  };
}

const marketState = globalMarketState.__soleonMarketState;

const CACHE_TTL_MS = 2 * 60 * 1000;
const REDIS_CACHE_KEY = 'soleon:market-cache:v2:cache';
const REDIS_LOCK_KEY = 'soleon:market-cache:v2:lock';
const REDIS_CACHE_TTL_SECONDS = 10 * 60;
const REDIS_LOCK_TTL_SECONDS = 30;

const UPSTASH_REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.trim() || null;
const UPSTASH_REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || null;
const HAS_UPSTASH_REDIS = Boolean(UPSTASH_REDIS_URL && UPSTASH_REDIS_TOKEN);

function optionalServerEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.trim() !== '' ? value.trim() : null;
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function readVerification(value: unknown): MarketVerification {
  return value === 'verified' || value === 'community' || value === 'high_risk' || value === 'fake'
    ? value
    : 'community';
}

function parseCommunityPools(): MarketPoolSnapshot[] {
  const raw = optionalServerEnv('SOLEON_COMMUNITY_POOLS_JSON');
  if (!raw) return [];

  try {
    const configuredPools = JSON.parse(raw) as unknown;
    if (!Array.isArray(configuredPools)) {
      throw new Error('SOLEON_COMMUNITY_POOLS_JSON must contain an array');
    }

    return configuredPools.flatMap((candidate: ConfiguredPool, index) => {
      const dex = optionalString(candidate.dex);
      const pair = optionalString(candidate.pair);
      const poolAddress = optionalString(candidate.poolAddress);
      if (!dex || !pair || !poolAddress) return [];

      return [{
        id: optionalString(candidate.id) ?? `${dex.toLowerCase()}-${index}`,
        dex,
        pair,
        status: 'ready' as const,
        verification: readVerification(candidate.verification),
        poolAddress,
        tradeUrl: optionalString(candidate.tradeUrl),
        priceUsd: optionalString(candidate.priceUsd),
        tvlUsd: optionalString(candidate.tvlUsd),
        volume24hUsd: optionalString(candidate.volume24hUsd),
        fee: optionalString(candidate.fee),
        liquidityControl: optionalString(candidate.liquidityControl),
        sourceName: optionalString(candidate.sourceName),
        sourceUrl: optionalString(candidate.sourceUrl),
      }];
    });
  } catch (error) {
    console.error('[market-cache] Failed to parse SOLEON_COMMUNITY_POOLS_JSON:', error);
    return [];
  }
}

function withCacheMeta(response: MarketCacheResponse, storedAt: number | null): MarketCacheResponse {
  return {
    ...response,
    cached: storedAt !== null,
    cacheAge: storedAt === null ? 0 : Date.now() - storedAt,
  };
}

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

async function readRedisCache(): Promise<CachedMarketEnvelope | null> {
  if (!HAS_UPSTASH_REDIS) return marketState.cachedMarket;

  const raw = await upstashCommand<string>(['GET', REDIS_CACHE_KEY]);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CachedMarketEnvelope;
    return parsed?.response && typeof parsed.storedAt === 'number' ? parsed : null;
  } catch (error) {
    console.error('[market-cache] Failed to parse Redis cache:', error);
    return null;
  }
}

async function writeRedisCache(envelope: CachedMarketEnvelope): Promise<void> {
  marketState.cachedMarket = envelope;
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
    console.error('[market-cache] Failed to release refresh lock:', error);
  }
}

function buildMarketCacheResponse(): MarketCacheResponse {
  const updatedAt = Date.now();
  const mintAddress = SOLEON_CONFIG.soleonMint || null;
  const manifestMarketAddress = optionalServerEnv('SOLEON_MANIFEST_MARKET_ADDRESS');
  const manifestTradeUrl = optionalServerEnv('SOLEON_MANIFEST_TRADE_URL');
  const jupiterRouteUrl = optionalServerEnv('SOLEON_JUPITER_ROUTE_URL');
  const pools = parseCommunityPools();
  const hasManifestMarket = Boolean(manifestMarketAddress);
  const hasPublishedMarket = hasManifestMarket || pools.length > 0;

  return {
    status: !mintAddress ? 'no_mint' : hasPublishedMarket ? 'ready' : 'pending',
    message: !mintAddress
      ? 'SEON token not yet deployed. Market data will be available after launch.'
      : hasPublishedMarket
        ? 'Published market addresses are available. Verify every address before trading.'
        : 'Market addresses are pending publication.',
    updatedAt,
    mintAddress,
    manifest: {
      pair: 'SEON/USDC',
      status: hasManifestMarket ? 'ready' : 'pending',
      verification: hasManifestMarket ? 'verified' : 'pending',
      marketAddress: manifestMarketAddress,
      tradeUrl: manifestTradeUrl,
      bestBidUsd: null,
      bestAskUsd: null,
      spread: null,
      volume24hUsd: null,
      sourceName: hasManifestMarket ? 'Manifest' : null,
      sourceUrl: manifestTradeUrl,
    },
    summary: {
      priceUsd: null,
      marketCapUsd: null,
      totalLiquidityUsd: null,
      volume24hUsd: null,
      marketsStatus: hasPublishedMarket ? 'ready' : 'pending',
      sourceName: null,
      sourceUrl: null,
    },
    pools,
    routes: [
      {
        id: 'manifest',
        name: 'Manifest',
        status: manifestTradeUrl ? 'ready' : 'pending',
        url: manifestTradeUrl,
        description: 'SEON/USDC order book',
      },
      {
        id: 'jupiter',
        name: 'Jupiter',
        status: jupiterRouteUrl ? 'ready' : 'pending',
        url: jupiterRouteUrl,
        description: 'Aggregated swap route',
      },
      ...pools.flatMap((pool) => pool.tradeUrl
        ? [{
            id: `pool-${pool.id}`,
            name: pool.dex,
            status: 'ready' as const,
            url: pool.tradeUrl,
            description: `${pool.pair} community pool`,
          }]
        : []),
    ],
  };
}

function buildEnvelope(response: MarketCacheResponse): CachedMarketEnvelope {
  return { response, storedAt: Date.now() };
}

function isRefreshDue(response: MarketCacheResponse): boolean {
  return Date.now() - response.updatedAt >= CACHE_TTL_MS;
}

function buildRefreshingResponse(cached: CachedMarketEnvelope | null): MarketCacheResponse {
  return cached
    ? withCacheMeta(cached.response, cached.storedAt)
    : buildMarketCacheResponse();
}

async function refreshMarketCache(): Promise<CachedMarketEnvelope> {
  if (marketState.refreshPromise) {
    return buildEnvelope(await marketState.refreshPromise);
  }

  marketState.refreshPromise = Promise.resolve(buildMarketCacheResponse())
    .finally(() => {
      marketState.refreshPromise = null;
    });

  const envelope = buildEnvelope(await marketState.refreshPromise);
  await writeRedisCache(envelope);
  return envelope;
}

async function resolveMarketCache(): Promise<MarketCacheResponse> {
  const cached = await readRedisCache();
  if (cached && !isRefreshDue(cached.response)) {
    return withCacheMeta(cached.response, cached.storedAt);
  }

  if (await acquireRefreshLock()) {
    try {
      const envelope = await refreshMarketCache();
      return withCacheMeta(envelope.response, envelope.storedAt);
    } finally {
      await releaseRefreshLock();
    }
  }

  return buildRefreshingResponse(cached);
}

export async function GET(): Promise<NextResponse<MarketCacheResponse>> {
  return NextResponse.json(await resolveMarketCache());
}
