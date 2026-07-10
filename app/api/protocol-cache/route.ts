import { NextResponse } from 'next/server';
import { fetchConfigAccount, fetchTokenBalance, type ConfigAccount } from '@/lib/solana/client';
import { SOLEON_CONFIG, isShortBurnDeployment } from '@/lib/solana/config';

export const dynamic = 'force-dynamic';

export type ProtocolCacheStatus = 'ready' | 'pending' | 'error' | 'no_program' | 'no_mint' | 'no_rpc';

export interface ProtocolCacheResponse {
  status: ProtocolCacheStatus;
  message: string;
  config: SerializedConfigAccount | null;
  stakingVaultBalance: string | null;
  rewardVaultBalance: string | null;
  feeVaultBalance: string | null;
  lastRefreshTimestamp: number | null;
  programId?: string;
  testShortBurn?: boolean;
  cached?: boolean;
  cacheAge?: number;
}

type SerializedConfigAccount = {
  soleonMint: string;
  stakingVault: string;
  rewardVault: string;
  soleonFeeVault: string;
  launchAuthority: string;
  maintenanceFeeReceiver: string;
  protocolStartTime: string;
  stakingOpenedTime: string;
  rewardYearStartedAt: string;
  lastRewardUpdateTime: string;
  lastCleanupIncentiveTime: string;
  rewardPerTokenQ64: string;
  totalStaked: string;
  totalRewardsPending: string;
  totalRewardsPaid: string;
  totalRewardsCompounded: string;
  totalRewardsRedistributed: string;
  totalCleanupIncentivesPaid: string;
  annualRewardBudget: string;
  annualRewardsReleased: string;
  annualRewardsAccrued: string;
  rewardYear: number;
  annualRewardBps: number;
  lastFeeDistributionTime: string;
  lastTransferFeeUpdateYear: number;
  stakingOpened: boolean;
  configBump: number;
  stakingVaultBump: number;
  rewardVaultBump: number;
  soleonFeeVaultBump: number;
};

type CachedProtocolEnvelope = {
  response: ProtocolCacheResponse;
  storedAt: number;
};

type GlobalProtocolState = {
  cachedProtocol: CachedProtocolEnvelope | null;
  refreshPromise: Promise<ProtocolCacheResponse> | null;
};

const globalProtocolState = globalThis as typeof globalThis & {
  __soleonProtocolState?: GlobalProtocolState;
};

if (!globalProtocolState.__soleonProtocolState) {
  globalProtocolState.__soleonProtocolState = {
    cachedProtocol: null,
    refreshPromise: null,
  };
}

const protocolState = globalProtocolState.__soleonProtocolState;

const CACHE_TTL_MS = 30 * 1000;
const REDIS_CACHE_KEY = 'soleon:protocol-cache:v3:cache';
const REDIS_LOCK_KEY = 'soleon:protocol-cache:v3:lock';
const REDIS_CACHE_TTL_SECONDS = 60;
const REDIS_LOCK_TTL_SECONDS = 20;

const RPC_CANDIDATES = [
  process.env.HELIUS_RPC_URL?.trim() || null,
  SOLEON_CONFIG.rpcEndpoint,
].filter((value): value is string => Boolean(value));

const UPSTASH_REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.trim() || null;
const UPSTASH_REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || null;
const HAS_UPSTASH_REDIS = Boolean(UPSTASH_REDIS_URL && UPSTASH_REDIS_TOKEN);

function serializeConfigAccount(config: ConfigAccount): SerializedConfigAccount {
  return {
    soleonMint: config.soleonMint.toBase58(),
    stakingVault: config.stakingVault.toBase58(),
    rewardVault: config.rewardVault.toBase58(),
    soleonFeeVault: config.soleonFeeVault.toBase58(),
    launchAuthority: config.launchAuthority.toBase58(),
    maintenanceFeeReceiver: config.maintenanceFeeReceiver.toBase58(),
    protocolStartTime: config.protocolStartTime.toString(),
    stakingOpenedTime: config.stakingOpenedTime.toString(),
    rewardYearStartedAt: config.rewardYearStartedAt.toString(),
    lastRewardUpdateTime: config.lastRewardUpdateTime.toString(),
    lastCleanupIncentiveTime: config.lastCleanupIncentiveTime.toString(),
    rewardPerTokenQ64: config.rewardPerTokenQ64.toString(),
    totalStaked: config.totalStaked.toString(),
    totalRewardsPending: config.totalRewardsPending.toString(),
    totalRewardsPaid: config.totalRewardsPaid.toString(),
    totalRewardsCompounded: config.totalRewardsCompounded.toString(),
    totalRewardsRedistributed: config.totalRewardsRedistributed.toString(),
    totalCleanupIncentivesPaid: config.totalCleanupIncentivesPaid.toString(),
    annualRewardBudget: config.annualRewardBudget.toString(),
    annualRewardsReleased: config.annualRewardsReleased.toString(),
    annualRewardsAccrued: config.annualRewardsAccrued.toString(),
    rewardYear: config.rewardYear,
    annualRewardBps: config.annualRewardBps,
    lastFeeDistributionTime: config.lastFeeDistributionTime.toString(),
    lastTransferFeeUpdateYear: config.lastTransferFeeUpdateYear,
    stakingOpened: config.stakingOpened,
    configBump: config.configBump,
    stakingVaultBump: config.stakingVaultBump,
    rewardVaultBump: config.rewardVaultBump,
    soleonFeeVaultBump: config.soleonFeeVaultBump,
  };
}

function withCacheMeta(response: ProtocolCacheResponse, storedAt: number | null): ProtocolCacheResponse {
  const cacheAge = storedAt === null ? 0 : Date.now() - storedAt;
  return {
    ...response,
    cached: storedAt !== null,
    cacheAge,
  };
}

function getCachedEnvelope(): CachedProtocolEnvelope | null {
  return protocolState.cachedProtocol;
}

function setCachedEnvelope(envelope: CachedProtocolEnvelope): void {
  protocolState.cachedProtocol = envelope;
}

async function upstashCommand<T = unknown>(command: unknown[]): Promise<T | null> {
  if (!HAS_UPSTASH_REDIS) {
    return null;
  }

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

async function readRedisCache(): Promise<CachedProtocolEnvelope | null> {
  if (!HAS_UPSTASH_REDIS) {
    return getCachedEnvelope();
  }

  const raw = await upstashCommand<string>(['GET', REDIS_CACHE_KEY]);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CachedProtocolEnvelope;
    if (!parsed?.response || typeof parsed.storedAt !== 'number') {
      return null;
    }
    return parsed;
  } catch (error) {
    console.error('[protocol-cache] Failed to parse Redis cache:', error);
    return null;
  }
}

async function writeRedisCache(envelope: CachedProtocolEnvelope): Promise<void> {
  if (!HAS_UPSTASH_REDIS) {
    setCachedEnvelope(envelope);
    return;
  }

  await upstashCommand(['SET', REDIS_CACHE_KEY, JSON.stringify(envelope), 'EX', REDIS_CACHE_TTL_SECONDS]);
}

async function acquireRefreshLock(): Promise<boolean> {
  if (!HAS_UPSTASH_REDIS) {
    return true;
  }

  const result = await upstashCommand<string>(['SET', REDIS_LOCK_KEY, String(Date.now()), 'NX', 'EX', REDIS_LOCK_TTL_SECONDS]);
  return result === 'OK';
}

async function releaseRefreshLock(): Promise<void> {
  if (!HAS_UPSTASH_REDIS) {
    return;
  }

  try {
    await upstashCommand(['DEL', REDIS_LOCK_KEY]);
  } catch (error) {
    console.error('[protocol-cache] Failed to release refresh lock:', error);
  }
}

function buildPendingResponse(message: string): ProtocolCacheResponse {
  return {
    status: 'pending',
    message,
    config: null,
    stakingVaultBalance: null,
    rewardVaultBalance: null,
    feeVaultBalance: null,
    lastRefreshTimestamp: null,
  };
}

function buildEnvelope(response: ProtocolCacheResponse): CachedProtocolEnvelope {
  return {
    response,
    storedAt: Date.now(),
  };
}

function isRefreshDue(response: ProtocolCacheResponse): boolean {
  return response.lastRefreshTimestamp === null
    ? true
    : Date.now() - response.lastRefreshTimestamp >= CACHE_TTL_MS;
}

function buildRefreshingResponse(cached: CachedProtocolEnvelope | null): ProtocolCacheResponse {
  if (cached) {
    return withCacheMeta(cached.response, cached.storedAt);
  }

  return buildPendingResponse('Protocol cache refresh already in progress. Please retry shortly.');
}

async function buildProtocolCacheResponse(): Promise<ProtocolCacheResponse> {
  const rpcUrl = RPC_CANDIDATES[0];
  if (!rpcUrl) {
    return {
      status: 'no_rpc',
      message: 'Protocol cache requires an RPC endpoint. Configure Helius or another standard Solana RPC URL.',
      config: null,
      stakingVaultBalance: null,
      rewardVaultBalance: null,
      feeVaultBalance: null,
      lastRefreshTimestamp: null,
    };
  }

  if (!SOLEON_CONFIG.programIdConfigured) {
    return {
      status: 'no_program',
      message: 'Soleon program not yet deployed for this environment. Protocol data will be available after the rehearsal program is published.',
      config: null,
      stakingVaultBalance: null,
      rewardVaultBalance: null,
      feeVaultBalance: null,
      lastRefreshTimestamp: null,
    };
  }

  if (!SOLEON_CONFIG.soleonMint) {
    return {
      status: 'no_mint',
      message: 'SEON token not yet deployed. Protocol data will be available after launch.',
      config: null,
      stakingVaultBalance: null,
      rewardVaultBalance: null,
      feeVaultBalance: null,
      lastRefreshTimestamp: null,
    };
  }

  const config = await fetchConfigAccount();
  if (!config) {
    return {
      status: 'pending',
      message: 'Protocol config is not yet available on-chain.',
      config: null,
      stakingVaultBalance: null,
      rewardVaultBalance: null,
      feeVaultBalance: null,
      lastRefreshTimestamp: null,
    };
  }

  const [stakingVaultBalance, rewardVaultBalance, feeVaultBalance] = await Promise.all([
    fetchTokenBalance(config.stakingVault),
    fetchTokenBalance(config.rewardVault),
    fetchTokenBalance(config.soleonFeeVault),
  ]);

  return {
    status: 'ready',
    message: 'Protocol snapshot loaded.',
    programId: SOLEON_CONFIG.programId,
    testShortBurn: isShortBurnDeployment(),
    config: serializeConfigAccount(config),
    stakingVaultBalance: stakingVaultBalance === null ? null : stakingVaultBalance.toString(),
    rewardVaultBalance: rewardVaultBalance === null ? null : rewardVaultBalance.toString(),
    feeVaultBalance: feeVaultBalance === null ? null : feeVaultBalance.toString(),
    lastRefreshTimestamp: Date.now(),
  };
}

async function refreshProtocolCache(): Promise<CachedProtocolEnvelope> {
  if (protocolState.refreshPromise) {
    const shared = await protocolState.refreshPromise;
    const envelope = buildEnvelope(shared);
    setCachedEnvelope(envelope);
    return envelope;
  }

  protocolState.refreshPromise = buildProtocolCacheResponse()
    .then(async (response) => {
      const envelope = buildEnvelope(response);
      setCachedEnvelope(envelope);
      await writeRedisCache(envelope);
      return response;
    })
    .finally(() => {
      protocolState.refreshPromise = null;
    });

  const response = await protocolState.refreshPromise;
  return buildEnvelope(response);
}

async function resolveProtocolCache(): Promise<ProtocolCacheResponse> {
  const cached = await readRedisCache();
  if (cached && !isRefreshDue(cached.response)) {
    return withCacheMeta(cached.response, cached.storedAt);
  }

  const lockAcquired = await acquireRefreshLock();
  if (lockAcquired) {
    try {
      const envelope = await refreshProtocolCache();
      return withCacheMeta(envelope.response, envelope.storedAt);
    } finally {
      await releaseRefreshLock();
    }
  }

  return buildRefreshingResponse(cached);
}

export async function GET(): Promise<NextResponse<ProtocolCacheResponse>> {
  const response = await resolveProtocolCache();
  return NextResponse.json(response);
}
