'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import {
  PROGRAM_ID,
  deriveConfigPda,
  deriveStakingVaultPda,
  deriveRewardVaultPda,
  deriveSoleonFeeVaultPda,
  calculateMaxLockDays,
  fetchConfigAccount,
  fetchStakePositionRecords,
  fetchTokenBalance,
  fetchWalletSnapshot,
  estimateClaimableRewards,
  projectRewardPerTokenQ64,
  type ConfigAccount,
  type StakePositionAccount,
  type StakePositionRecord,
} from '@/lib/solana/client';
import { SOLEON_CONFIG, isShortBurnDeployment } from '@/lib/solana/config';

/**
 * RPC Optimization Strategy (from README):
 * 
 * Global data should be cached on the server and shared across users:
 * - Protocol config, vault balances, supply, transfer-fee status: refresh every 30 seconds
 * - Pool TVL, pool volume, token price, liquidity APR estimates: refresh every 1-5 minutes  
 * - Fee-scan data for Collect & Distribute Fees: refresh every 30 minutes
 * - Audit status, official addresses, docs, lock proofs: refresh only when changed
 * 
 * Wallet-specific data should only load after wallet connects:
 * - SEON balance, SOL balance, user staking positions, claimable rewards
 * - Use getMultipleAccounts where practical, not getProgramAccounts repeatedly
 * - Refresh connected-wallet data every 30-60 seconds while staking page is open
 * - Pause/slow refresh when tab is inactive
 */

// User wallet data state
export type UserDataState = 'not_connected' | 'loading' | 'loaded' | 'error';

export interface UserWalletData {
  state: UserDataState;
  seonBalance: bigint | null;
  solBalance: bigint | null;
  stakedSeon: bigint | null;
  claimableRewards: bigint | null;
  activePositions: number;
  positions: StakePositionAccount[];
  error: string | null;
}

export interface ProtocolState {
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Config state
  configExists: boolean;
  config: ConfigAccount | null;
  programId: PublicKey | null;
  stakingOpened: boolean;
  stakingOpenedTime: number | null;
  lastTransferFeeUpdateYear: number;
  protocolStartTime: bigint | null;
  maxLockDays: number;
  testShortBurn: boolean;
  
  // Balances
  stakingVaultBalance: bigint | null;
  rewardVaultBalance: bigint | null;
  feeVaultBalance: bigint | null;
  totalStaked: bigint | null;
  totalRewardsPaid: bigint | null;
  
  // Addresses
  configPda: PublicKey | null;
  stakingVault: PublicKey | null;
  rewardVault: PublicKey | null;
  soleonFeeVault: PublicKey | null;
  soleonMint: PublicKey | null;
  launchAuthority: PublicKey | null;
  
  // Web phase
  currentPhase: typeof SOLEON_CONFIG.currentPhase;
  jupiterEnabled: boolean;
  
  // Actions
  canStake: boolean;
  canBuy: boolean;
  
  // User wallet data
  userData: UserWalletData;
  walletDataReady: boolean;
  
  // Cache metadata
  lastGlobalRefresh: number | null;
  lastWalletRefresh: number | null;
}

const initialUserData: UserWalletData = {
  state: 'not_connected',
  seonBalance: null,
  solBalance: null,
  stakedSeon: null,
  claimableRewards: null,
  activePositions: 0,
  positions: [],
  error: null,
};

const initialState: ProtocolState = {
  isLoading: true,
  error: null,
  configExists: false,
  config: null,
  programId: null,
  stakingOpened: false,
  stakingOpenedTime: null,
  lastTransferFeeUpdateYear: 0,
  protocolStartTime: null,
  maxLockDays: 7,
  testShortBurn: isShortBurnDeployment(),
  stakingVaultBalance: null,
  rewardVaultBalance: null,
  feeVaultBalance: null,
  totalStaked: null,
  totalRewardsPaid: null,
  configPda: null,
  stakingVault: null,
  rewardVault: null,
  soleonFeeVault: null,
  soleonMint: null,
  launchAuthority: null,
  currentPhase: SOLEON_CONFIG.currentPhase,
  jupiterEnabled: SOLEON_CONFIG.jupiterEnabled,
  canStake: false,
  canBuy: false,
  userData: initialUserData,
  walletDataReady: false,
  lastGlobalRefresh: null,
  lastWalletRefresh: null,
};

// Global cache for protocol data (shared across all users)
// This prevents every browser from independently asking RPC for the same data
let globalCache: {
  config: ConfigAccount | null;
  programId: string | null;
  stakingVaultBalance: bigint | null;
  rewardVaultBalance: bigint | null;
  feeVaultBalance: bigint | null;
  testShortBurn: boolean;
  lastFetch: number;
} | null = null;

const GLOBAL_CACHE_TTL = 30000; // 30 seconds for global data
const PROTOCOL_REFRESH_INTERVAL = 30000; // 30 seconds for visible protocol refreshes
const WALLET_REFRESH_INTERVAL = 60000; // 60 seconds for wallet data
const POSITION_DISCOVERY_INTERVAL = 300000; // 5 minutes for rediscovering positions
const INACTIVE_REFRESH_INTERVAL = 300000; // 5 minutes when tab is hidden
const SHARED_CACHE_NAMESPACE = 'soleon:protocol-cache:v5';
const SHARED_CACHE_CHANNEL = 'soleon-protocol-cache';

type SerializedConfigAccount = {
  soleonMint: string;
  stakingVault: string;
  rewardVault: string;
  soleonFeeVault: string;
  launchAuthority: string;
  maintenanceFeeReceiver?: string;
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

type SerializedStakePositionAccount = {
  owner: string;
  positionId: string;
  amount: string;
  lockStartTime: string;
  lockEndTime: string;
  rewardPerTokenCheckpointQ64: string;
  claimedRewards: string;
  compoundedRewards: string;
  redistributedRewards: string;
  renewCount: number;
  rewardRedistributionBps: number;
  isClosed: boolean;
  bump: number;
};

type SerializedUserWalletData = {
  state: UserDataState;
  seonBalance: string | null;
  solBalance: string | null;
  stakedSeon: string | null;
  claimableRewards: string | null;
  activePositions: number;
  positions: SerializedStakePositionAccount[];
  error: string | null;
};

type SerializedGlobalCache = {
  config: SerializedConfigAccount | null;
  programId?: string | null;
  stakingVaultBalance: string | null;
  rewardVaultBalance: string | null;
  feeVaultBalance: string | null;
  testShortBurn?: boolean;
  lastFetch: number;
};

type ProtocolCacheApiResponse = {
  status: 'ready' | 'pending' | 'error' | 'no_program' | 'no_mint' | 'no_rpc';
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
};

type SerializedWalletCache = {
  walletKey: string;
  userData: SerializedUserWalletData;
  walletDataReady: boolean;
  lastWalletRefresh: number;
  lastPositionsDiscovery?: number;
  positionPubkeys?: string[];
};

type WalletSnapshotApiResponse = {
  solBalance: string;
  seonBalance: string;
  positions: Array<{
    pubkey: string;
    account: SerializedStakePositionAccount;
  }>;
  error?: string;
};

type SharedCacheMessage =
  | { scope: 'global'; key: string; payload: SerializedGlobalCache; source?: string }
  | { scope: 'wallet'; key: string; payload: SerializedWalletCache; source?: string };

function storageKey(suffix: string): string {
  return `${SHARED_CACHE_NAMESPACE}:${SOLEON_CONFIG.cluster}:${SOLEON_CONFIG.programId}:${suffix}`;
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readJson<T>(key: string): T | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota / privacy mode failures.
  }
}

function readBigInt(value: string): bigint {
  return BigInt(value);
}

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

function deserializeConfigAccount(config: SerializedConfigAccount): ConfigAccount {
  const stakingOpenedTime = readBigInt(config.stakingOpenedTime);

  return {
    soleonMint: new PublicKey(config.soleonMint),
    stakingVault: new PublicKey(config.stakingVault),
    rewardVault: new PublicKey(config.rewardVault),
    soleonFeeVault: new PublicKey(config.soleonFeeVault),
    launchAuthority: new PublicKey(config.launchAuthority),
    maintenanceFeeReceiver: new PublicKey(config.maintenanceFeeReceiver ?? SOLEON_CONFIG.maintenanceFeeReceiver ?? config.launchAuthority),
    protocolStartTime: readBigInt(config.protocolStartTime),
    stakingOpenedTime,
    rewardYearStartedAt: readBigInt(config.rewardYearStartedAt),
    lastRewardUpdateTime: readBigInt(config.lastRewardUpdateTime),
    lastCleanupIncentiveTime: readBigInt(config.lastCleanupIncentiveTime),
    rewardPerTokenQ64: readBigInt(config.rewardPerTokenQ64),
    totalStaked: readBigInt(config.totalStaked),
    totalRewardsPending: readBigInt(config.totalRewardsPending),
    totalRewardsPaid: readBigInt(config.totalRewardsPaid),
    totalRewardsCompounded: readBigInt(config.totalRewardsCompounded),
    totalRewardsRedistributed: readBigInt(config.totalRewardsRedistributed),
    totalCleanupIncentivesPaid: readBigInt(config.totalCleanupIncentivesPaid),
    annualRewardBudget: readBigInt(config.annualRewardBudget),
    annualRewardsReleased: readBigInt(config.annualRewardsReleased),
    annualRewardsAccrued: readBigInt(config.annualRewardsAccrued),
    rewardYear: config.rewardYear,
    annualRewardBps: config.annualRewardBps,
    lastFeeDistributionTime: readBigInt(config.lastFeeDistributionTime),
    lastTransferFeeUpdateYear: config.lastTransferFeeUpdateYear,
    stakingOpened: config.stakingOpened || stakingOpenedTime > BigInt(0),
    configBump: config.configBump,
    stakingVaultBump: config.stakingVaultBump,
    rewardVaultBump: config.rewardVaultBump,
    soleonFeeVaultBump: config.soleonFeeVaultBump,
  };
}

function serializeStakePositionAccount(position: StakePositionAccount): SerializedStakePositionAccount {
  return {
    owner: position.owner.toBase58(),
    positionId: position.positionId.toString(),
    amount: position.amount.toString(),
    lockStartTime: position.lockStartTime.toString(),
    lockEndTime: position.lockEndTime.toString(),
    rewardPerTokenCheckpointQ64: position.rewardPerTokenCheckpointQ64.toString(),
    claimedRewards: position.claimedRewards.toString(),
    compoundedRewards: position.compoundedRewards.toString(),
    redistributedRewards: position.redistributedRewards.toString(),
    renewCount: position.renewCount,
    rewardRedistributionBps: position.rewardRedistributionBps,
    isClosed: position.isClosed,
    bump: position.bump,
  };
}

function deserializeStakePositionAccount(position: SerializedStakePositionAccount): StakePositionAccount {
  return {
    owner: new PublicKey(position.owner),
    positionId: readBigInt(position.positionId),
    amount: readBigInt(position.amount),
    lockStartTime: readBigInt(position.lockStartTime),
    lockEndTime: readBigInt(position.lockEndTime),
    rewardPerTokenCheckpointQ64: readBigInt(position.rewardPerTokenCheckpointQ64),
    claimedRewards: readBigInt(position.claimedRewards),
    compoundedRewards: readBigInt(position.compoundedRewards),
    redistributedRewards: readBigInt(position.redistributedRewards),
    renewCount: position.renewCount,
    rewardRedistributionBps: position.rewardRedistributionBps,
    isClosed: position.isClosed,
    bump: position.bump,
  };
}

function serializeUserWalletData(data: UserWalletData): SerializedUserWalletData {
  return {
    state: data.state,
    seonBalance: data.seonBalance === null ? null : data.seonBalance.toString(),
    solBalance: data.solBalance === null ? null : data.solBalance.toString(),
    stakedSeon: data.stakedSeon === null ? null : data.stakedSeon.toString(),
    claimableRewards: data.claimableRewards === null ? null : data.claimableRewards.toString(),
    activePositions: data.activePositions,
    positions: data.positions.map(serializeStakePositionAccount),
    error: data.error,
  };
}

function deserializeUserWalletData(data: SerializedUserWalletData): UserWalletData {
  return {
    state: data.state,
    seonBalance: data.seonBalance === null ? null : readBigInt(data.seonBalance),
    solBalance: data.solBalance === null ? null : readBigInt(data.solBalance),
    stakedSeon: data.stakedSeon === null ? null : readBigInt(data.stakedSeon),
    claimableRewards: data.claimableRewards === null ? null : readBigInt(data.claimableRewards),
    activePositions: data.activePositions,
    positions: data.positions.map(deserializeStakePositionAccount),
    error: data.error,
  };
}

function serializeGlobalCache(cache: NonNullable<typeof globalCache>): SerializedGlobalCache {
  return {
    config: cache.config ? serializeConfigAccount(cache.config) : null,
    programId: cache.programId,
    stakingVaultBalance: cache.stakingVaultBalance === null ? null : cache.stakingVaultBalance.toString(),
    rewardVaultBalance: cache.rewardVaultBalance === null ? null : cache.rewardVaultBalance.toString(),
    feeVaultBalance: cache.feeVaultBalance === null ? null : cache.feeVaultBalance.toString(),
    testShortBurn: cache.testShortBurn,
    lastFetch: cache.lastFetch,
  };
}

function deserializeGlobalCache(cache: SerializedGlobalCache): NonNullable<typeof globalCache> {
  return {
    config: cache.config ? deserializeConfigAccount(cache.config) : null,
    programId: cache.programId ?? null,
    stakingVaultBalance: cache.stakingVaultBalance === null ? null : readBigInt(cache.stakingVaultBalance),
    rewardVaultBalance: cache.rewardVaultBalance === null ? null : readBigInt(cache.rewardVaultBalance),
    feeVaultBalance: cache.feeVaultBalance === null ? null : readBigInt(cache.feeVaultBalance),
    testShortBurn: cache.testShortBurn ?? isShortBurnDeployment(),
    lastFetch: cache.lastFetch,
  };
}

function getGlobalCacheKey(): string {
  return storageKey('global');
}

function getWalletCacheKey(walletKey: string): string {
  return storageKey(`wallet:${walletKey}`);
}

function readGlobalCacheFromStorage(): NonNullable<typeof globalCache> | null {
  const snapshot = readJson<SerializedGlobalCache>(getGlobalCacheKey());
  return snapshot ? deserializeGlobalCache(snapshot) : null;
}

function writeGlobalCacheToStorage(cache: NonNullable<typeof globalCache>): void {
  writeJson(getGlobalCacheKey(), serializeGlobalCache(cache));
}

function readWalletCacheFromStorage(walletKey: string): SerializedWalletCache | null {
  return readJson<SerializedWalletCache>(getWalletCacheKey(walletKey));
}

function writeWalletCacheToStorage(
  walletKey: string,
  data: UserWalletData,
  walletDataReady: boolean,
  lastWalletRefresh: number,
  lastPositionsDiscovery: number,
  positionRecords: StakePositionRecord[],
): void {
  const payload: SerializedWalletCache = {
    walletKey,
    userData: serializeUserWalletData(data),
    walletDataReady,
    lastWalletRefresh,
    lastPositionsDiscovery,
    positionPubkeys: positionRecords.map((record) => record.pubkey.toBase58()),
  };
  writeJson(getWalletCacheKey(walletKey), payload);
}

export function useSoleonProtocol() {
  const { connected, publicKey } = useWallet();
  const [state, setState] = useState<ProtocolState>(initialState);
  const isVisible = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const walletRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastWalletDataRef = useRef<UserWalletData>(initialUserData);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef<string>(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  const fetchWalletData = useCallback(async (forceRefresh = false, forcePositionDiscovery = false): Promise<void> => {
    const config = globalCache?.config;
    const walletKey = publicKey?.toBase58() ?? null;
    if (!connected || !publicKey) {
      setState(prev => ({
        ...prev,
        userData: initialUserData,
        walletDataReady: false,
      }));
      return;
    }

    if (!config) {
      return;
    }

    const now = Date.now();
    const loadWalletDataFromApi = async () => {
      const response = await fetch(`/api/wallet-snapshot?owner=${publicKey.toBase58()}&refresh=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
      });
      const payload = await response.json() as WalletSnapshotApiResponse;
      if (!response.ok || payload.error) {
        throw new Error(payload.error ?? `Wallet snapshot request failed: ${response.status}`);
      }

      const positions = payload.positions.map((position) => ({
        pubkey: new PublicKey(position.pubkey),
        account: deserializeStakePositionAccount(position.account),
      }));
      const openPositionRecords = positions.filter((position) => !position.account.isClosed);
      const openPositions = openPositionRecords.map((position) => position.account);
      const loadedWalletData: UserWalletData = {
        state: 'loaded',
        seonBalance: BigInt(payload.seonBalance),
        solBalance: BigInt(payload.solBalance),
        stakedSeon: openPositions.reduce((total, position) => total + position.amount, BigInt(0)),
        claimableRewards: openPositions.reduce(
          (total, position) => total + estimateClaimableRewards(position, projectRewardPerTokenQ64(config)),
          BigInt(0),
        ),
        activePositions: openPositions.length,
        positions: openPositions,
        error: null,
      };

      setState(prev => ({
        ...prev,
        userData: loadedWalletData,
        walletDataReady: true,
        lastWalletRefresh: now,
      }));
      lastWalletDataRef.current = loadedWalletData;
      if (walletKey) {
        writeWalletCacheToStorage(
          walletKey,
          loadedWalletData,
          true,
          now,
          now,
          openPositionRecords,
        );
      }
    };

    try {
      await loadWalletDataFromApi();
      return;
    } catch (apiError) {
      console.error('[v0] Error fetching wallet data from API:', apiError);
    }

    let sharedWalletCache: SerializedWalletCache | null = null;
    if (walletKey) {
      sharedWalletCache = readWalletCacheFromStorage(walletKey);
      const walletCache = sharedWalletCache;
      if (!forceRefresh && walletCache && (now - walletCache.lastWalletRefresh) < WALLET_REFRESH_INTERVAL) {
        const cachedUserData = deserializeUserWalletData(walletCache.userData);
        setState(prev => ({
          ...prev,
          userData: cachedUserData,
          walletDataReady: walletCache.walletDataReady,
          lastWalletRefresh: walletCache.lastWalletRefresh,
        }));
        lastWalletDataRef.current = cachedUserData;
        return;
      }
    }

    try {
      let positionRecords: StakePositionRecord[] = [];
      const cachedPositionPubkeys = sharedWalletCache?.positionPubkeys ?? [];
      const cachedPositions = sharedWalletCache
        ? deserializeUserWalletData(sharedWalletCache.userData).positions
        : [];

      if (cachedPositionPubkeys.length > 0 && cachedPositionPubkeys.length === cachedPositions.length) {
        positionRecords = cachedPositions.map((account, index) => ({
          pubkey: new PublicKey(cachedPositionPubkeys[index]),
          account,
        }));
      }

      const cacheHasKnownPositionState =
        sharedWalletCache !== null &&
        typeof sharedWalletCache.lastPositionsDiscovery === 'number' &&
        cachedPositionPubkeys.length === cachedPositions.length;

      const shouldRediscoverPositions =
        forcePositionDiscovery ||
        !cacheHasKnownPositionState ||
        (now - (sharedWalletCache?.lastPositionsDiscovery ?? 0)) >= POSITION_DISCOVERY_INTERVAL;

      if (shouldRediscoverPositions) {
        try {
          positionRecords = await fetchStakePositionRecords(publicKey);
        } catch (error) {
          console.error('[v0] Error discovering stake positions:', error);
          positionRecords = [];
        }
      }

      const { solBalance, seonBalance, positions } = await fetchWalletSnapshot(
        publicKey,
        config.soleonMint,
        positionRecords,
      );

      const openPositionRecords = positions.filter((position) => !position.account.isClosed);
      const openPositions = openPositionRecords.map((position) => position.account);
      const stakedSeon = openPositions.reduce((total, position) => total + position.amount, BigInt(0));
      const claimableRewards = openPositions.reduce(
        (total, position) => total + estimateClaimableRewards(position, projectRewardPerTokenQ64(config)),
        BigInt(0)
      );

      const loadedWalletData: UserWalletData = {
        state: 'loaded',
        seonBalance,
        solBalance,
        stakedSeon,
        claimableRewards,
        activePositions: openPositions.length,
        positions: openPositions,
        error: null,
      };

      setState(prev => ({
        ...prev,
        userData: loadedWalletData,
        walletDataReady: true,
        lastWalletRefresh: now,
      }));
      lastWalletDataRef.current = loadedWalletData;
      if (walletKey) {
        const lastPositionsDiscovery = shouldRediscoverPositions
          ? now
          : (sharedWalletCache?.lastPositionsDiscovery ?? now);
        writeWalletCacheToStorage(
          walletKey,
          loadedWalletData,
          true,
          now,
          lastPositionsDiscovery,
          openPositionRecords,
        );
        broadcastChannelRef.current?.postMessage({
          scope: 'wallet',
          key: getWalletCacheKey(walletKey),
          payload: {
            walletKey,
            userData: serializeUserWalletData(loadedWalletData),
            walletDataReady: true,
            lastWalletRefresh: now,
            lastPositionsDiscovery,
            positionPubkeys: openPositionRecords.map((position) => position.pubkey.toBase58()),
          },
          source: tabIdRef.current,
        } satisfies SharedCacheMessage);
      }
    } catch (error) {
      console.error('[v0] Error fetching wallet data:', error);
      try {
        await loadWalletDataFromApi();
        return;
      } catch (fallbackError) {
        console.error('[v0] Error fetching wallet data from API:', fallbackError);
      }

      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch wallet data';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        userData:
          lastWalletDataRef.current.state === 'loaded'
            ? lastWalletDataRef.current
            : {
                ...prev.userData,
                state: 'error',
                error: errorMessage,
              },
        walletDataReady: lastWalletDataRef.current.state === 'loaded' || prev.walletDataReady,
        lastWalletRefresh: now,
      }));
    }
  }, [connected, publicKey]);

  // Track tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisible.current = document.visibilityState === 'visible';
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  /**
   * Update state from cached data
   */
  const updateStateFromCache = useCallback((cache: NonNullable<typeof globalCache>) => {
    const programId = cache.programId ? new PublicKey(cache.programId) : PROGRAM_ID;
    const [configPda] = deriveConfigPda(programId);
    const [stakingVaultPda] = deriveStakingVaultPda(programId);
    const [rewardVaultPda] = deriveRewardVaultPda(programId);
    const [feeVaultPda] = deriveSoleonFeeVaultPda(programId);

    if (!cache.config) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        configExists: false,
        config: null,
        programId,
        configPda,
        stakingVault: stakingVaultPda,
        rewardVault: rewardVaultPda,
        soleonFeeVault: feeVaultPda,
        testShortBurn: cache.testShortBurn,
        canStake: false,
        canBuy: false,
        lastGlobalRefresh: cache.lastFetch,
      }));
      return;
    }

    const config = cache.config;
    const testShortBurn = cache.testShortBurn;
    const stakingOpened = config.stakingOpened || config.stakingOpenedTime > BigInt(0);
    const maxLockDays = calculateMaxLockDays(config.protocolStartTime, testShortBurn);

    const stakingPhases = ['staking_live', 'immutable'];
    const buyPhases = ['markets_live', 'staking_live', 'immutable'];
    
    const canStake = 
      connected && 
      stakingOpened && 
      SOLEON_CONFIG.stakingEnabled &&
      stakingPhases.includes(SOLEON_CONFIG.currentPhase);
    
    const canBuy = 
      connected && 
      SOLEON_CONFIG.soleonMint !== null && 
      SOLEON_CONFIG.jupiterEnabled &&
      buyPhases.includes(SOLEON_CONFIG.currentPhase);
    
    const stakingOpenedTime = stakingOpened && config.stakingOpenedTime > BigInt(0)
      ? Number(config.stakingOpenedTime)
      : null;
    
    setState(prev => ({
      ...prev,
      isLoading: false,
      error: null,
      configExists: true,
      config,
      programId,
      stakingOpened,
      stakingOpenedTime,
      lastTransferFeeUpdateYear: config.lastTransferFeeUpdateYear,
      protocolStartTime: config.protocolStartTime,
      maxLockDays,
      testShortBurn,
      stakingVaultBalance: cache.stakingVaultBalance,
      rewardVaultBalance: cache.rewardVaultBalance,
      feeVaultBalance: cache.feeVaultBalance,
      totalStaked: config.totalStaked,
      totalRewardsPaid: config.totalRewardsPaid,
      configPda,
      stakingVault: config.stakingVault,
      rewardVault: config.rewardVault,
      soleonFeeVault: config.soleonFeeVault,
      soleonMint: config.soleonMint,
      launchAuthority: config.launchAuthority,
      currentPhase: SOLEON_CONFIG.currentPhase,
      jupiterEnabled: SOLEON_CONFIG.jupiterEnabled,
      canStake,
      canBuy,
      lastGlobalRefresh: cache.lastFetch,
    }));
  }, [connected]);

  // Share protocol and wallet refreshes across tabs in the same browser
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
      return;
    }

    const channel = new BroadcastChannel(SHARED_CACHE_CHANNEL);
    broadcastChannelRef.current = channel;
    const currentWalletKey = publicKey?.toBase58() ?? null;

    channel.onmessage = (event: MessageEvent<SharedCacheMessage>) => {
      const message = event.data;
      if (!message || message.key === '') {
        return;
      }
      if (message.source === tabIdRef.current) {
        return;
      }

      if (message.scope === 'global' && message.key === getGlobalCacheKey()) {
        const nextCache = deserializeGlobalCache(message.payload);
        globalCache = nextCache;
        updateStateFromCache(nextCache);
        return;
      }

      if (
        message.scope === 'wallet' &&
        currentWalletKey !== null &&
        message.payload.walletKey === currentWalletKey &&
        message.key === getWalletCacheKey(currentWalletKey)
      ) {
        const nextUserData = deserializeUserWalletData(message.payload.userData);
        setState(prev => ({
          ...prev,
          userData: nextUserData,
          walletDataReady: message.payload.walletDataReady,
          lastWalletRefresh: message.payload.lastWalletRefresh,
        }));
        lastWalletDataRef.current = nextUserData;
      }
    };

    return () => {
      channel.close();
      if (broadcastChannelRef.current === channel) {
        broadcastChannelRef.current = null;
      }
    };
  }, [publicKey, updateStateFromCache]);

  // Set up wallet refresh interval based on visibility
  useEffect(() => {
    const setupInterval = () => {
      if (walletRefreshIntervalRef.current) {
        clearInterval(walletRefreshIntervalRef.current);
      }

      const interval = isVisible.current ? WALLET_REFRESH_INTERVAL : INACTIVE_REFRESH_INTERVAL;

      walletRefreshIntervalRef.current = setInterval(() => {
        if (isVisible.current) {
          fetchWalletData();
        }
      }, interval);
    };

    if (connected && publicKey) {
      setupInterval();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setupInterval();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (walletRefreshIntervalRef.current) {
        clearInterval(walletRefreshIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connected, publicKey, fetchWalletData]);

  /**
   * Fetch global protocol data with caching
   * Uses cache if available and not stale (< 30s old)
   * Groups account reads with getMultipleAccounts where practical
   */
  const fetchGlobalData = useCallback(async (forceRefresh = false): Promise<void> => {
    const now = Date.now();
    
    // Use cached data if fresh enough and not forcing refresh
    if (!forceRefresh && globalCache && (now - globalCache.lastFetch) < GLOBAL_CACHE_TTL) {
      updateStateFromCache(globalCache);
      if (connected && publicKey) {
        void fetchWalletData();
      }
      return;
    }

    if (!forceRefresh) {
      const sharedCache = readGlobalCacheFromStorage();
      if (sharedCache && (now - sharedCache.lastFetch) < GLOBAL_CACHE_TTL) {
        globalCache = sharedCache;
        updateStateFromCache(sharedCache);
        if (connected && publicKey) {
          void fetchWalletData();
        }
        return;
      }
    }

    const loadDirectFromRpc = async () => {
      const config = await fetchConfigAccount();
      if (!config) {
        return null;
      }

      const [stakingVaultBalance, rewardVaultBalance, feeVaultBalance] = await Promise.all([
        fetchTokenBalance(config.stakingVault),
        fetchTokenBalance(config.rewardVault),
        fetchTokenBalance(config.soleonFeeVault),
      ]);

      return {
        config,
        programId: SOLEON_CONFIG.programId,
        stakingVaultBalance,
        rewardVaultBalance,
        feeVaultBalance,
        testShortBurn: isShortBurnDeployment(),
        lastFetch: Date.now(),
      } satisfies NonNullable<typeof globalCache>;
    };

    try {
      const response = await fetch(`/api/protocol-cache?refresh=${forceRefresh ? Date.now() : 'auto'}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Protocol cache request failed: ${response.status}`);
      }

      const payload = await response.json() as ProtocolCacheApiResponse;
      const payloadProgramId = payload.programId ?? SOLEON_CONFIG.programId;
      const payloadProgramPublicKey = new PublicKey(payloadProgramId);

      // Derive PDAs (sync, no RPC)
      const [configPda] = deriveConfigPda(payloadProgramPublicKey);
      const [stakingVaultPda] = deriveStakingVaultPda(payloadProgramPublicKey);
      const [rewardVaultPda] = deriveRewardVaultPda(payloadProgramPublicKey);
      const [feeVaultPda] = deriveSoleonFeeVaultPda(payloadProgramPublicKey);

      if (payload.status !== 'ready' || !payload.config) {
        const directCache = await loadDirectFromRpc();
        if (directCache) {
          globalCache = directCache;
          writeGlobalCacheToStorage(globalCache);
          updateStateFromCache(globalCache);
          if (connected && publicKey) {
            void fetchWalletData(true);
          }
          return;
        }

        if (globalCache) {
          updateStateFromCache(globalCache);
          return;
        }

        globalCache = {
          config: null,
          programId: payloadProgramId,
          stakingVaultBalance: null,
          rewardVaultBalance: null,
          feeVaultBalance: null,
          testShortBurn: payload.testShortBurn ?? isShortBurnDeployment(payload.programId),
          lastFetch: payload.lastRefreshTimestamp ?? now,
        };
        writeGlobalCacheToStorage(globalCache);
        
        setState(prev => ({
          ...prev,
          isLoading: false,
          configExists: false,
          config: null,
          programId: payloadProgramPublicKey,
          configPda,
          stakingVault: stakingVaultPda,
          rewardVault: rewardVaultPda,
          soleonFeeVault: feeVaultPda,
          canStake: false,
          canBuy: false,
          lastGlobalRefresh: payload.lastRefreshTimestamp ?? now,
        }));
        broadcastChannelRef.current?.postMessage({
          scope: 'global',
          key: getGlobalCacheKey(),
          payload: serializeGlobalCache(globalCache),
          source: tabIdRef.current,
        } satisfies SharedCacheMessage);
        return;
      }

      const config = deserializeConfigAccount(payload.config);
      const stakingVaultBalance = payload.stakingVaultBalance === null ? null : BigInt(payload.stakingVaultBalance);
      const rewardVaultBalance = payload.rewardVaultBalance === null ? null : BigInt(payload.rewardVaultBalance);
      const feeVaultBalance = payload.feeVaultBalance === null ? null : BigInt(payload.feeVaultBalance);

      // Update global cache
      globalCache = {
        config,
        programId: payloadProgramId,
        stakingVaultBalance,
        rewardVaultBalance,
        feeVaultBalance,
        testShortBurn: payload.testShortBurn ?? isShortBurnDeployment(payload.programId),
        lastFetch: payload.lastRefreshTimestamp ?? now,
      };
      writeGlobalCacheToStorage(globalCache);

      updateStateFromCache(globalCache);
      if (connected && publicKey) {
        void fetchWalletData(true);
      }
      broadcastChannelRef.current?.postMessage({
        scope: 'global',
        key: getGlobalCacheKey(),
        payload: serializeGlobalCache(globalCache),
        source: tabIdRef.current,
      } satisfies SharedCacheMessage);
    } catch (error) {
      console.error('[v0] Error fetching global protocol data:', error);
      const directCache = await loadDirectFromRpc().catch((rpcError) => {
        console.error('[v0] Error fetching direct protocol data:', rpcError);
        return null;
      });
      if (directCache) {
        globalCache = directCache;
        writeGlobalCacheToStorage(globalCache);
        updateStateFromCache(globalCache);
        if (connected && publicKey) {
          void fetchWalletData(true);
        }
        return;
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch protocol data',
      }));
    }
  }, [connected, publicKey, fetchWalletData, updateStateFromCache]);

  // Initial fetch on mount
  useEffect(() => {
    fetchGlobalData(true);
  }, [fetchGlobalData]);

  // Set up refresh interval based on visibility
  useEffect(() => {
    const setupInterval = () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      
      const interval = isVisible.current ? PROTOCOL_REFRESH_INTERVAL : INACTIVE_REFRESH_INTERVAL;
      
      refreshIntervalRef.current = setInterval(() => {
        // Only refresh if tab is visible or enough time has passed
        if (isVisible.current) {
          fetchGlobalData();
        }
      }, interval);
    };

    setupInterval();

    // Re-fetch immediately when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchGlobalData(true);
        setupInterval();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchGlobalData]);

  // Re-evaluate canStake/canBuy when wallet connection changes
  useEffect(() => {
    if (globalCache?.config) {
      updateStateFromCache(globalCache);
    }
  }, [connected, updateStateFromCache]);

  useEffect(() => {
    if (!connected) return;
    fetchWalletData();
  }, [connected, publicKey, state.configExists, fetchWalletData]);

  return {
    ...state,
    refresh: async () => {
      await fetchGlobalData(true);
      await fetchWalletData(true, true);
    },
    walletConnected: connected,
    walletPublicKey: publicKey,
  };
}
