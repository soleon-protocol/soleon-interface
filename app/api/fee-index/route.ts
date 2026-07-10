import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  getMint,
  getTransferFeeAmount,
  getTransferFeeConfig,
  unpackAccount,
} from '@solana/spl-token';
import { SOLEON_CONFIG, SEON_DECIMALS, CALLER_REWARD_FIXED, FEE_BURNED_PERCENT, MIN_FEES_TO_DISTRIBUTE } from '@/lib/solana/config';
import { fetchConfigAccount } from '@/lib/solana/client';

export const dynamic = 'force-dynamic';

export type FeeIndexStatus = 'ready' | 'pending' | 'error' | 'unsupported_rpc' | 'no_program' | 'staking_closed' | 'no_mint' | 'no_rpc';

export interface FeeIndexResponse {
  scanStatus: FeeIndexStatus;
  message: string;
  estimatedTotalWithheld: string;
  estimatedRewardVaultAmount: string;
  estimatedBurnAmount: string;
  estimatedCallerIncentive: string;
  callerIncentiveValid: boolean;
  accountCount: number;
  sourceAccounts: string[];
  mintWithheldAmount: string;
  lastScanTimestamp: number | null;
  cached?: boolean;
  cacheAge?: number;
}

const TOKEN_ACCOUNT_MINT_OFFSET = 0;
const RPC_CANDIDATES = [
  process.env.HELIUS_RPC_URL?.trim() || null,
  SOLEON_CONFIG.rpcEndpoint,
].filter((value): value is string => Boolean(value));
const HELIUS_RPC_URL = process.env.HELIUS_RPC_URL?.trim() || null;

const CACHE_TTL_MS = 20 * 60 * 1000;
const REDIS_CACHE_KEY = 'soleon:fee-index:v2:cache';
const REDIS_LOCK_KEY = 'soleon:fee-index:v2:lock';
const REDIS_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;
const REDIS_LOCK_TTL_SECONDS = 5 * 60;

type CachedFeeIndexEnvelope = {
  response: FeeIndexResponse;
  storedAt: number;
};

type HeliusProgramAccountsV2Result = {
  accounts?: Array<{ pubkey: string }>;
  paginationKey?: string | null;
  totalResults?: number;
};

type GlobalFeeIndexState = {
  cachedFeeIndex: CachedFeeIndexEnvelope | null;
  refreshPromise: Promise<FeeIndexResponse> | null;
};

const globalFeeIndexState = globalThis as typeof globalThis & {
  __soleonFeeIndexState?: GlobalFeeIndexState;
};

if (!globalFeeIndexState.__soleonFeeIndexState) {
  globalFeeIndexState.__soleonFeeIndexState = {
    cachedFeeIndex: null,
    refreshPromise: null,
  };
}

const feeIndexState = globalFeeIndexState.__soleonFeeIndexState;
const UPSTASH_REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.trim() || null;
const UPSTASH_REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || null;
const HAS_UPSTASH_REDIS = Boolean(UPSTASH_REDIS_URL && UPSTASH_REDIS_TOKEN);

function withCacheMeta(response: FeeIndexResponse, storedAt: number | null): FeeIndexResponse {
  const cacheAge = storedAt === null ? 0 : Date.now() - storedAt;
  return {
    ...response,
    cached: storedAt !== null,
    cacheAge,
  };
}

function getCachedEnvelope(): CachedFeeIndexEnvelope | null {
  return feeIndexState.cachedFeeIndex;
}

function setCachedEnvelope(envelope: CachedFeeIndexEnvelope): void {
  feeIndexState.cachedFeeIndex = envelope;
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

async function heliusRpcCommand<T = unknown>(method: string, params: unknown[]): Promise<T> {
  if (!HELIUS_RPC_URL) {
    throw new Error('Helius RPC URL is not configured');
  }

  const response = await fetch(HELIUS_RPC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: `fee-index-${Date.now()}`,
      method,
      params,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Helius RPC request failed: ${response.status}`);
  }

  const payload = await response.json() as { result?: T; error?: { message?: string } | string };
  if (payload.error) {
    const message = typeof payload.error === 'string' ? payload.error : payload.error.message ?? 'Unknown Helius RPC error';
    throw new Error(message);
  }

  if (payload.result === undefined) {
    throw new Error('Helius RPC response missing result');
  }

  return payload.result;
}

async function readRedisCache(): Promise<CachedFeeIndexEnvelope | null> {
  if (!HAS_UPSTASH_REDIS) {
    return getCachedEnvelope();
  }

  const raw = await upstashCommand<string>(['GET', REDIS_CACHE_KEY]);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CachedFeeIndexEnvelope;
    if (!parsed?.response || typeof parsed.storedAt !== 'number') {
      return null;
    }
    return parsed;
  } catch (error) {
    console.error('[fee-index] Failed to parse Redis cache:', error);
    return null;
  }
}

async function writeRedisCache(envelope: CachedFeeIndexEnvelope): Promise<void> {
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
    console.error('[fee-index] Failed to release refresh lock:', error);
  }
}

function formatAtomicAmount(amount: bigint, decimals = SEON_DECIMALS): string {
  const base = BigInt(10 ** decimals);
  const whole = amount / base;
  const fraction = amount % base;

  if (fraction === BigInt(0)) {
    return whole.toString();
  }

  const fractionText = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole.toString()}.${fractionText}`;
}

function toAtomic(amount: bigint, decimals = SEON_DECIMALS): bigint {
  return amount * BigInt(10 ** decimals);
}

function buildUnavailableResponse(scanStatus: FeeIndexStatus, message: string): FeeIndexResponse {
  return {
    scanStatus,
    message,
    estimatedTotalWithheld: '0',
    estimatedRewardVaultAmount: '0',
    estimatedBurnAmount: '0',
    estimatedCallerIncentive: '0',
    callerIncentiveValid: false,
    accountCount: 0,
    sourceAccounts: [],
    mintWithheldAmount: '0',
    lastScanTimestamp: null,
  };
}

function isUnsupportedRpcError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /unsupported|not found|method not found|invalid params|failed to fetch|excluded from account secondary indexes/i.test(message);
}

async function fetchTokenAccountAddressesByMintV2(mint: PublicKey): Promise<string[]> {
  if (!HELIUS_RPC_URL) {
    return [];
  }

  const addresses = new Set<string>();
  let paginationKey: string | null = null;

  do {
    const result: HeliusProgramAccountsV2Result = await heliusRpcCommand<HeliusProgramAccountsV2Result>('getProgramAccountsV2', [
      TOKEN_2022_PROGRAM_ID.toBase58(),
      {
        encoding: 'base64',
        filters: [
          {
            memcmp: {
              offset: TOKEN_ACCOUNT_MINT_OFFSET,
              bytes: mint.toBase58(),
            },
          },
        ],
        limit: 1000,
        ...(paginationKey ? { paginationKey } : {}),
      },
    ]);

    for (const account of result.accounts ?? []) {
      if (account.pubkey) {
        addresses.add(account.pubkey);
      }
    }

    paginationKey = result.paginationKey ?? null;
  } while (paginationKey);

  return [...addresses];
}

async function fetchTokenAccountAddressesByMintLegacy(mint: PublicKey): Promise<string[]> {
  if (!HELIUS_RPC_URL) {
    return [];
  }

  const addresses = new Set<string>();
  let cursor: string | null = null;

  do {
    const response = await fetch(HELIUS_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: `fee-index-${Date.now()}`,
        method: 'getTokenAccounts',
        params: cursor
          ? {
              mint: mint.toBase58(),
              cursor,
              limit: 1000,
              options: { showZeroBalance: false },
            }
          : {
              mint: mint.toBase58(),
              limit: 1000,
              options: { showZeroBalance: false },
            },
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Helius token account scan failed: ${response.status}`);
    }

    const payload = await response.json() as {
      result?: {
        token_accounts?: Array<{ address: string }>;
        cursor?: string | null;
      };
      error?: { message?: string } | string;
    };

    if (payload.error) {
      const message = typeof payload.error === 'string' ? payload.error : payload.error.message ?? 'Unknown Helius error';
      throw new Error(message);
    }

    for (const tokenAccount of payload.result?.token_accounts ?? []) {
      if (tokenAccount.address) {
        addresses.add(tokenAccount.address);
      }
    }

    cursor = payload.result?.cursor ?? null;
  } while (cursor);

  return [...addresses];
}

async function scanFeeAccounts(
  connection: Connection,
  soleonMint: PublicKey
): Promise<{ sourceAccounts: string[]; sourceWithheldAmount: bigint }> {
  let tokenAccountAddresses: string[] = [];

  if (HELIUS_RPC_URL) {
    try {
      tokenAccountAddresses = await fetchTokenAccountAddressesByMintV2(soleonMint);
    } catch (error) {
      console.error('[fee-index] getProgramAccountsV2 scan failed, falling back:', error);
      try {
        tokenAccountAddresses = await fetchTokenAccountAddressesByMintLegacy(soleonMint);
      } catch (fallbackError) {
        console.error('[fee-index] Legacy token account scan failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  if (tokenAccountAddresses.length > 0) {
    const sourceAccounts: string[] = [];
    let sourceWithheldAmount = BigInt(0);

    for (let index = 0; index < tokenAccountAddresses.length; index += 100) {
      const batch = tokenAccountAddresses.slice(index, index + 100);
      const batchPublicKeys = batch.map((address) => new PublicKey(address));
      const accounts = await connection.getMultipleAccountsInfo(batchPublicKeys, 'confirmed');

      accounts.forEach((account, batchIndex) => {
        if (!account) {
          return;
        }

        const pubkey = batchPublicKeys[batchIndex];
        const tokenAccount = unpackAccount(pubkey, account, TOKEN_2022_PROGRAM_ID);
        const feeInfo = getTransferFeeAmount(tokenAccount);
        if (feeInfo !== null && feeInfo.withheldAmount > BigInt(0)) {
          sourceAccounts.push(tokenAccount.address.toBase58());
          sourceWithheldAmount += feeInfo.withheldAmount;
        }
      });
    }

    return {
      sourceAccounts,
      sourceWithheldAmount,
    };
  }

  const accounts = await connection.getProgramAccounts(TOKEN_2022_PROGRAM_ID, {
    filters: [
      {
        memcmp: {
          offset: TOKEN_ACCOUNT_MINT_OFFSET,
          bytes: soleonMint.toBase58(),
        },
      },
    ],
  });

  return accounts.reduce(
    (accumulator, { pubkey, account }) => {
      const tokenAccount = unpackAccount(pubkey, account, TOKEN_2022_PROGRAM_ID);
      const feeInfo = getTransferFeeAmount(tokenAccount);
      if (feeInfo !== null && feeInfo.withheldAmount > BigInt(0)) {
        accumulator.sourceAccounts.push(tokenAccount.address.toBase58());
        accumulator.sourceWithheldAmount += feeInfo.withheldAmount;
      }
      return accumulator;
    },
    {
      sourceAccounts: [] as string[],
      sourceWithheldAmount: BigInt(0),
    }
  );
}

async function getRefreshUnavailableResponse(): Promise<FeeIndexResponse | null> {
  if (!SOLEON_CONFIG.programIdConfigured) {
    return buildUnavailableResponse(
      'no_program',
      'The staking program is not deployed yet. Fee collection will be available after staking opens.'
    );
  }

  if (!SOLEON_CONFIG.soleonMint) {
    return buildUnavailableResponse(
      'no_mint',
      'SEON token not yet deployed. Fee collection will be available after launch.'
    );
  }

  const rpcUrl = RPC_CANDIDATES[0];
  if (!rpcUrl) {
    return buildUnavailableResponse(
      'no_rpc',
      'Fee index requires an RPC endpoint. Configure Helius free RPC or another standard Solana RPC URL.'
    );
  }

  const config = await fetchConfigAccount();
  if (!config || (!config.stakingOpened && config.stakingOpenedTime <= BigInt(0))) {
    return buildUnavailableResponse(
      'staking_closed',
      'Staking is not open yet. Fee collection will be available when staking starts.'
    );
  }

  return null;
}

async function buildFeeIndexResponse(): Promise<FeeIndexResponse> {
  const unavailableResponse = await getRefreshUnavailableResponse();
  if (unavailableResponse) {
    return unavailableResponse;
  }

  const connection = new Connection(RPC_CANDIDATES[0]!, 'confirmed');
  const mint = new PublicKey(SOLEON_CONFIG.soleonMint!);

  try {
    const [mintAccount, scannedAccounts] = await Promise.all([
      getMint(connection, mint, 'confirmed', TOKEN_2022_PROGRAM_ID),
      scanFeeAccounts(connection, mint),
    ]);

    const transferFeeConfig = getTransferFeeConfig(mintAccount);
    const mintWithheldAmount = transferFeeConfig?.withheldAmount ?? BigInt(0);
    const totalWithheldAtomic = mintWithheldAmount + scannedAccounts.sourceWithheldAmount;
    const minimumAtomic = toAtomic(BigInt(MIN_FEES_TO_DISTRIBUTE));
    const callerIncentiveValid = totalWithheldAtomic >= minimumAtomic;
    const callerIncentiveAtomic = callerIncentiveValid ? toAtomic(BigInt(CALLER_REWARD_FIXED)) : BigInt(0);
    const burnAtomic = (totalWithheldAtomic * BigInt(FEE_BURNED_PERCENT)) / BigInt(100);
    const rewardAtomic = totalWithheldAtomic > callerIncentiveAtomic + burnAtomic
      ? totalWithheldAtomic - callerIncentiveAtomic - burnAtomic
      : BigInt(0);

    return {
      scanStatus: 'ready',
      message: callerIncentiveValid
        ? 'Fee scan completed. Pending withheld fees are ready to collect and distribute.'
        : 'Fee scan completed. Pending fees are below the distribution threshold.',
      estimatedTotalWithheld: formatAtomicAmount(totalWithheldAtomic),
      estimatedRewardVaultAmount: formatAtomicAmount(rewardAtomic),
      estimatedBurnAmount: formatAtomicAmount(burnAtomic),
      estimatedCallerIncentive: formatAtomicAmount(callerIncentiveAtomic),
      callerIncentiveValid,
      accountCount: scannedAccounts.sourceAccounts.length,
      sourceAccounts: scannedAccounts.sourceAccounts,
      mintWithheldAmount: formatAtomicAmount(mintWithheldAmount),
      lastScanTimestamp: Date.now(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[fee-index] Scan failed:', error);

    return {
      scanStatus: isUnsupportedRpcError(error) ? 'unsupported_rpc' : 'error',
      message: isUnsupportedRpcError(error)
        ? 'RPC does not support the Token-2022 scan required for fee collection.'
        : `Fee scan failed: ${message}`,
      estimatedTotalWithheld: '0',
      estimatedRewardVaultAmount: '0',
      estimatedBurnAmount: '0',
      estimatedCallerIncentive: '0',
      callerIncentiveValid: false,
      accountCount: 0,
      sourceAccounts: [],
      mintWithheldAmount: '0',
      lastScanTimestamp: null,
    };
  }
}

function buildEnvelope(response: FeeIndexResponse): CachedFeeIndexEnvelope {
  return {
    response,
    storedAt: Date.now(),
  };
}

function getNextRefreshAt(response: FeeIndexResponse): number | null {
  return response.lastScanTimestamp === null
    ? null
    : response.lastScanTimestamp + CACHE_TTL_MS;
}

function isRefreshDue(response: FeeIndexResponse): boolean {
  const nextRefreshAt = getNextRefreshAt(response);
  return nextRefreshAt === null ? true : Date.now() >= nextRefreshAt;
}

function buildRefreshingResponse(cached: CachedFeeIndexEnvelope | null): FeeIndexResponse {
  if (cached) {
    return withCacheMeta(cached.response, cached.storedAt);
  }

  return {
    scanStatus: 'pending',
    message: 'Fee index has not been scanned yet. Press the button to refresh it manually.',
    estimatedTotalWithheld: '0',
    estimatedRewardVaultAmount: '0',
    estimatedBurnAmount: '0',
    estimatedCallerIncentive: '0',
    callerIncentiveValid: false,
    accountCount: 0,
    sourceAccounts: [],
    mintWithheldAmount: '0',
    lastScanTimestamp: null,
    cached: false,
    cacheAge: 0,
  };
}

async function refreshFeeIndex(): Promise<CachedFeeIndexEnvelope> {
  if (feeIndexState.refreshPromise) {
    const shared = await feeIndexState.refreshPromise;
    const envelope = buildEnvelope(shared);
    setCachedEnvelope(envelope);
    return envelope;
  }

  feeIndexState.refreshPromise = buildFeeIndexResponse()
    .then(async (response) => {
      const envelope = buildEnvelope(response);
      setCachedEnvelope(envelope);
      await writeRedisCache(envelope);
      return response;
    })
    .finally(() => {
      feeIndexState.refreshPromise = null;
    });

  const response = await feeIndexState.refreshPromise;
  return buildEnvelope(response);
}

async function resolveFeeIndex(options: { allowRefresh: boolean }): Promise<FeeIndexResponse> {
  if (options.allowRefresh) {
    const unavailableResponse = await getRefreshUnavailableResponse();
    if (unavailableResponse) {
      return unavailableResponse;
    }
  }

  const cached = await readRedisCache();

  if (!options.allowRefresh) {
    return cached
      ? withCacheMeta(cached.response, cached.storedAt)
      : buildRefreshingResponse(null);
  }

  if (cached && !isRefreshDue(cached.response)) {
    return withCacheMeta(cached.response, cached.storedAt);
  }

  const lockAcquired = await acquireRefreshLock();
  if (lockAcquired) {
    try {
      const envelope = await refreshFeeIndex();
      return withCacheMeta(envelope.response, envelope.storedAt);
    } finally {
      await releaseRefreshLock();
    }
  }

  return buildRefreshingResponse(cached);
}

export async function GET(): Promise<NextResponse<FeeIndexResponse>> {
  const response = await resolveFeeIndex({ allowRefresh: false });
  return NextResponse.json(response);
}

export async function POST(): Promise<NextResponse<FeeIndexResponse>> {
  const response = await resolveFeeIndex({ allowRefresh: true });
  return NextResponse.json(response);
}
