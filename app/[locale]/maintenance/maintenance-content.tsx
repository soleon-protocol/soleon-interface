'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  createHarvestWithheldTokensToMintInstruction,
  getMint,
  getTransferFeeConfig,
} from '@solana/spl-token';
import {
  RefreshCw,
  TrendingUp,
  Wallet,
  AlertCircle,
  Clock,
  Info,
  Zap,
  Percent,
  Calendar,
  Shield,
  Server,
  CheckCircle2,
  XCircle,
  Wrench,
  ListChecks,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { WalletButton } from '@/components/wallet-button';
import { useSoleonProtocol } from '@/hooks/use-soleon-protocol';
import { useFeeIndex } from '@/hooks/use-fee-index';
import {
  createUpdateTransferFeeTransaction,
  createWithdrawAndDistributeFromMintTransaction,
  createCleanupExpiredPositionsTransaction,
  fetchConfigAccount,
  formatTokenAmount,
} from '@/lib/solana/client';
import type { ExpiredPositionsCacheResponse } from '@/app/api/expired-positions-cache/route';
import {
  SOLEON_CONFIG,
  MIN_FEES_TO_DISTRIBUTE,
  MAX_TRANSFER_FEE_BPS,
  TRANSFER_FEE_INCREMENT_BPS,
  MAX_TRANSFER_FEE,
  isShortBurnDeployment,
} from '@/lib/solana/config';

function normalizePublicKey(address: string | null): string | null {
  if (!address) return null;
  try {
    return new PublicKey(address).toBase58();
  } catch {
    return null;
  }
}

function formatAddress(address: string): string {
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
}

export function MaintenanceContent() {
  const t = useTranslations('maintenance');
  const { connection } = useConnection();
  const { connected, publicKey, sendTransaction } = useWallet();
  const protocol = useSoleonProtocol();
  const feeIndex = useFeeIndex();
  const isShortBurn = protocol.testShortBurn || isShortBurnDeployment();
  const onchainActionsEnabled = SOLEON_CONFIG.maintenanceActionsEnabled || isShortBurn;
  const transferFeeSchedulePeriodSeconds = isShortBurn ? 48 * 60 * 60 : 365 * 24 * 60 * 60;
  const feeIndexRefreshCooldownMs = 20 * 60 * 1000;
  const cleanupIncentiveCooldownMs = 20 * 60 * 1000;
  const stakingOpened = protocol.stakingOpened || protocol.stakingOpenedTime !== null;
  const maintenanceFeeReceiver = normalizePublicKey(
    protocol.config?.maintenanceFeeReceiver.toBase58() ?? SOLEON_CONFIG.maintenanceFeeReceiver
  );
  const maintenanceFeeReceiverUrl = maintenanceFeeReceiver
    ? `https://solscan.io/account/${maintenanceFeeReceiver}?cluster=${SOLEON_CONFIG.cluster === 'devnet' ? 'devnet' : 'mainnet'}`
    : null;
  const [onChainFeeBps, setOnChainFeeBps] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Fee distribution state
  const [isDistributing, setIsDistributing] = useState(false);

  // Update transfer fee state
  const [isUpdatingFee, setIsUpdatingFee] = useState(false);
  const [feeUpdatePendingOnChain, setFeeUpdatePendingOnChain] = useState(false);
  const [feeUpdateDebug, setFeeUpdateDebug] = useState<{
    currentEpoch: number | null;
    olderBps: number | null;
    newerBps: number | null;
    newerEpoch: number | null;
    error: string | null;
    loadedAt: number | null;
  }>({
    currentEpoch: null,
    olderBps: null,
    newerBps: null,
    newerEpoch: null,
    error: null,
    loadedAt: null,
  });
  const [isRefreshingFeeIndex, setIsRefreshingFeeIndex] = useState(false);
  const [expiredPositions, setExpiredPositions] = useState<ExpiredPositionsCacheResponse | null>(null);
  const [isRefreshingExpiredPositions, setIsRefreshingExpiredPositions] = useState(false);
  const [isCleaningExpired, setIsCleaningExpired] = useState(false);
  const [localCleanupCooldownStartedAt, setLocalCleanupCooldownStartedAt] = useState<number | null>(null);
  const SHOW_FEE_UPDATE_DEBUG = false;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  // Calculate current transfer fee based on protocol state
  const calculateCurrentFee = () => {
    if (!stakingOpened || !protocol.stakingOpenedTime) {
      return { currentFeeBps: 0, currentYear: 0, nextFeeBps: 2, canUpdate: false, nextUpdateTime: null };
    }

    const now = Math.floor(Date.now() / 1000);
    const stakingOpenedTime = protocol.stakingOpenedTime;
    const yearsSinceOpen = (now - stakingOpenedTime) / transferFeeSchedulePeriodSeconds;
    const currentYear = Math.min(20, Math.floor(yearsSinceOpen) + 1);
    const currentFeeBps = Math.min(MAX_TRANSFER_FEE_BPS, currentYear * TRANSFER_FEE_INCREMENT_BPS);
    const nextYear = currentYear + 1;
    const nextFeeBps = Math.min(MAX_TRANSFER_FEE_BPS, nextYear * TRANSFER_FEE_INCREMENT_BPS);

    const lastUpdateYear = protocol.lastTransferFeeUpdateYear || 0;
    const canUpdate = currentYear > 0 && lastUpdateYear < currentYear;
    const nextUpdateTime = canUpdate ? null : new Date((stakingOpenedTime + currentYear * transferFeeSchedulePeriodSeconds) * 1000);

    return { currentFeeBps, currentYear, nextFeeBps, canUpdate, nextUpdateTime };
  };

  const feeInfo = calculateCurrentFee();
  const actualOnChainFeeBps = onChainFeeBps ?? 0;
  const canUpdateTransferFee =
    onchainActionsEnabled &&
    connected &&
    publicKey !== null &&
    stakingOpened &&
    protocol.configExists &&
    protocol.programId !== null &&
    feeInfo.canUpdate &&
    actualOnChainFeeBps < MAX_TRANSFER_FEE_BPS;
  const showFeeUpdatePendingNotice =
    protocol.configExists &&
    protocol.programId !== null &&
    stakingOpened &&
    feeUpdatePendingOnChain &&
    actualOnChainFeeBps < feeInfo.currentFeeBps;
  const displayedProgrammedFeeBps = feeUpdatePendingOnChain
    ? feeInfo.nextFeeBps
    : Math.min(MAX_TRANSFER_FEE_BPS, actualOnChainFeeBps + TRANSFER_FEE_INCREMENT_BPS);
  const feeIndexLastScanTimestamp = feeIndex.data?.lastScanTimestamp ?? null;
  const feeIndexNextRefreshAt = feeIndexLastScanTimestamp !== null
    ? feeIndexLastScanTimestamp + feeIndexRefreshCooldownMs
    : null;
  const feeIndexCooldownRemainingMs = feeIndexNextRefreshAt !== null
    ? Math.max(0, feeIndexNextRefreshAt - now)
    : 0;
  const feeIndexCooldownActive = feeIndexNextRefreshAt !== null && feeIndexCooldownRemainingMs > 0;
  const feeIndexScanEnabled =
    onchainActionsEnabled &&
    SOLEON_CONFIG.programIdConfigured &&
    protocol.configExists &&
    protocol.programId !== null &&
    protocol.soleonMint !== null &&
    stakingOpened;
  const feeIndexReady = feeIndexScanEnabled && feeIndex.data?.scanStatus === 'ready';
  const feeIndexUnavailable = !feeIndexScanEnabled
    || feeIndex.data?.scanStatus === 'no_program'
    || feeIndex.data?.scanStatus === 'staking_closed'
    || feeIndex.data?.scanStatus === 'no_mint'
    || feeIndex.data?.scanStatus === 'no_rpc'
    || feeIndex.data?.scanStatus === 'unsupported_rpc'
    || feeIndex.data?.scanStatus === 'error';
  const feeIndexButtonLabel = !feeIndexScanEnabled
    ? t('feeIndexNotAvailable')
    : feeIndexCooldownActive
      ? t('availableIn', { time: formatCooldown(feeIndexCooldownRemainingMs) })
      : t('refreshIndex');
  const feeIndexButtonTone = !feeIndexScanEnabled
    ? 'border-border bg-muted/40 text-muted-foreground'
    : feeIndexUnavailable
      ? 'border-border text-muted-foreground'
    : 'border-secondary/40 hover:bg-secondary/10';

  const refreshTransferFeeState = async () => {
    const configuredMint = protocol.config?.soleonMint?.toBase58() ?? SOLEON_CONFIG.soleonMint;
    if (!configuredMint) {
      setOnChainFeeBps(null);
      setFeeUpdatePendingOnChain(false);
      setFeeUpdateDebug({
        currentEpoch: null,
        olderBps: null,
        newerBps: null,
        newerEpoch: null,
        error: 'Program ID or SEON mint not configured',
        loadedAt: Date.now(),
      });
      return;
    }

    const config = protocol.config ?? await fetchConfigAccount();
    const mintAddress = config?.soleonMint?.toBase58() ?? null;

    if (!config || !mintAddress) {
      setOnChainFeeBps(null);
      setFeeUpdatePendingOnChain(false);
      setFeeUpdateDebug({
        currentEpoch: null,
        olderBps: null,
        newerBps: null,
        newerEpoch: null,
        error: 'Config account or SEON mint not available',
        loadedAt: Date.now(),
      });
      return;
    }

    try {
      const feeConnection = new Connection(
        SOLEON_CONFIG.rpcEndpoint ?? 'https://api.devnet.solana.com',
        'confirmed'
      );
      const mint = new PublicKey(mintAddress);
      const [mintAccount, epochInfo] = await Promise.all([
        getMint(feeConnection, mint, 'confirmed', TOKEN_2022_PROGRAM_ID),
        feeConnection.getEpochInfo('confirmed'),
      ]);
      const transferFeeConfig = getTransferFeeConfig(mintAccount);
      const olderBps = transferFeeConfig?.olderTransferFee.transferFeeBasisPoints ?? 0;
      const newerBps = transferFeeConfig?.newerTransferFee.transferFeeBasisPoints ?? olderBps;
      const newerEpoch = Number(transferFeeConfig?.newerTransferFee.epoch ?? 0);
      const currentBps = epochInfo.epoch >= newerEpoch ? newerBps : olderBps;

      setOnChainFeeBps(currentBps);
      setFeeUpdatePendingOnChain(epochInfo.epoch < newerEpoch && newerBps !== olderBps);
      setFeeUpdateDebug({
        currentEpoch: epochInfo.epoch,
        olderBps,
        newerBps,
        newerEpoch,
        error: null,
        loadedAt: Date.now(),
      });
    } catch (error) {
      console.error('[v0] Error fetching transfer fee state:', error);
      setOnChainFeeBps(null);
      setFeeUpdatePendingOnChain(false);
      setFeeUpdateDebug({
        currentEpoch: null,
        olderBps: null,
        newerBps: null,
        newerEpoch: null,
        error: error instanceof Error ? error.message : String(error),
        loadedAt: Date.now(),
      });
    }
  };

  useEffect(() => {
    void refreshTransferFeeState();
  }, [protocol.config, protocol.programId]);

  const refreshExpiredPositions = async (force = false): Promise<ExpiredPositionsCacheResponse | null> => {
    setIsRefreshingExpiredPositions(true);
    try {
      const response = await fetch(`/api/expired-positions-cache${force ? '?force=1' : ''}`, { cache: 'no-store' });
      const payload = await response.json() as ExpiredPositionsCacheResponse;
      setExpiredPositions(payload);
      return payload;
    } catch (error) {
      console.error('[expired-positions-cache] load error:', error);
      return null;
    } finally {
      setIsRefreshingExpiredPositions(false);
    }
  };

  useEffect(() => {
    void refreshExpiredPositions(false);
  }, [protocol.programId]);

  const cleanupLastIncentiveMs = protocol.config?.lastCleanupIncentiveTime
    ? Number(protocol.config.lastCleanupIncentiveTime) * 1000
    : 0;
  const cleanupCooldownStartedAt = Math.max(cleanupLastIncentiveMs, localCleanupCooldownStartedAt ?? 0);
  const cleanupCooldownRemainingMs = cleanupCooldownStartedAt > 0
    ? Math.max(0, cleanupCooldownStartedAt + cleanupIncentiveCooldownMs - now)
    : 0;
  const cleanupCooldownActive = cleanupCooldownRemainingMs > 0;
  const cleanupPositionsAvailable = expiredPositions?.status === 'ready' && expiredPositions.positions.length > 0;

  useEffect(() => {
    if (!feeUpdatePendingOnChain) {
      return;
    }

    const interval = window.setInterval(() => {
      void refreshTransferFeeState();
    }, 10 * 60 * 1000);

    return () => window.clearInterval(interval);
  }, [feeUpdatePendingOnChain]);

  function formatCooldown(remainingMs: number): string {
    const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
    }

    if (minutes > 0) {
      return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
    }

    return `${seconds}s`;
  }

  const handleRefreshFeeIndex = async () => {
    if (!feeIndexScanEnabled || isRefreshingFeeIndex || feeIndexCooldownActive) {
      return;
    }

    setIsRefreshingFeeIndex(true);

    try {
      const response = await fetch('/api/fee-index', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      await feeIndex.refetch();
    } catch (error) {
      console.error('[v0] Fee index refresh error:', error);
    } finally {
      setIsRefreshingFeeIndex(false);
    }
  };

  // Determine if user can distribute fees
  // New rules: minimum 200 SEON, fixed 1 SEON caller reward
  const meetsMinimum = feeIndex.data?.scanStatus === 'ready' && feeIndex.data.callerIncentiveValid;
  const formatSeonDecimal = (value: string): string => {
    const normalized = value.trim();
    if (!/^\d+(\.\d+)?$/.test(normalized)) {
      return value;
    }

    const [whole, rawFraction = ''] = normalized.split('.');
    const fraction = rawFraction.slice(0, 9).padEnd(9, '0');
    return formatTokenAmount(BigInt(whole) * BigInt(1_000_000_000) + BigInt(fraction));
  };
  
  const canDistributeFees = 
    onchainActionsEnabled &&
    connected && 
    publicKey !== null &&
    stakingOpened &&
    protocol.configExists &&
    protocol.programId !== null &&
    protocol.soleonMint !== null &&
    feeIndex.data?.scanStatus === 'ready' &&
    meetsMinimum;

  const handleDistributeFees = async () => {
    if (!canDistributeFees) return;

    setIsDistributing(true);

    try {
      if (!publicKey) return;
      const config = protocol.config ?? await fetchConfigAccount();
      if (!config) {
        throw new Error('Protocol config account not found');
      }

      const programId = protocol.programId ?? undefined;
      const sourceAccounts = feeIndex.data?.sourceAccounts ?? [];
      if (sourceAccounts.length > 0) {
        for (let i = 0; i < sourceAccounts.length; i += 20) {
          const batch = sourceAccounts
            .slice(i, i + 20)
            .map((value) => new PublicKey(value));
          const harvestTransaction = new Transaction().add(
            createHarvestWithheldTokensToMintInstruction(
              config.soleonMint,
              batch,
              TOKEN_2022_PROGRAM_ID
            )
          );
          const harvestSignature = await sendTransaction(harvestTransaction, connection);
          await connection.confirmTransaction(harvestSignature, 'confirmed');
        }
      }

      const transaction = createWithdrawAndDistributeFromMintTransaction(publicKey, config, programId);
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      await protocol.refresh();
    } catch (error) {
      console.error('[v0] Fee distribution error:', error);
    } finally {
      setIsDistributing(false);
    }
  };

  const handleUpdateTransferFee = async () => {
    if (!canUpdateTransferFee) return;

    setIsUpdatingFee(true);

    try {
      const config = protocol.config ?? await fetchConfigAccount();
      if (!config) {
        throw new Error('Protocol config account not found');
      }

      const transaction = createUpdateTransferFeeTransaction(publicKey, config, protocol.programId ?? undefined);
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      await protocol.refresh();
      await refreshTransferFeeState();
    } catch (error) {
      console.error('[v0] Update fee error:', error);
    } finally {
      setIsUpdatingFee(false);
    }
  };

  const handleCleanupExpiredPositions = async () => {
    if (!publicKey || cleanupCooldownActive) return;
    setIsCleaningExpired(true);
    try {
      const latest = await refreshExpiredPositions(true);
      if (!latest || latest.status !== 'ready' || latest.positions.length === 0) return;
      const config = protocol.config ?? await fetchConfigAccount();
      if (!config) throw new Error('Protocol config account not found');
      const positions = latest.positions
        .slice(0, latest.batchSize)
        .map((position) => ({
          pubkey: new PublicKey(position.pubkey),
          owner: new PublicKey(position.owner),
        }));
      const transaction = createCleanupExpiredPositionsTransaction({
        caller: publicKey,
        config,
        positions,
        programId: protocol.programId ?? undefined,
      });
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      setLocalCleanupCooldownStartedAt(Date.now());
      await protocol.refresh();
      await refreshExpiredPositions(true);
    } catch (error) {
      console.error('[cleanup-expired-positions] transaction error:', error);
    } finally {
      setIsCleaningExpired(false);
    }
  };

  return (
    <main className="min-h-screen bg-background pt-24 pb-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12 text-center">
          <h1 className="font-serif text-4xl font-bold text-gradient-gold md:text-5xl">{t('title')}</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">{t('subtitle')}</p>
        </motion.div>

        {/* Not Active Yet Banner */}
        {!stakingOpened && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-8">
            <Card className="border-amber-500/30 bg-amber-500/5 backdrop-blur">
              <CardContent className="flex items-center gap-4 p-4">
                <Wrench className="h-6 w-6 text-amber-500" />
                <p className="text-amber-500 font-medium">{t('actionsNotActiveYet')}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* What This Page Is */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
          <Card className="border-secondary/20 bg-secondary/5 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-secondary" />
                {t('whatIsThisTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{t('whatIsThisDesc')}</p>
              <div className="flex items-start gap-3 rounded-lg bg-background/50 p-4 text-sm">
                <Shield className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                <p className="text-muted-foreground">{t('permissionlessNote')}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Protocol Status */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8">
          <Card className="border-primary/20 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                {t('protocolStatus')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg bg-background/50 p-3">
                  <p className="text-xs text-muted-foreground">{t('walletConnected')}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {connected ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-semibold">{connected ? t('yes') : t('no')}</span>
                  </div>
                </div>
                <div className="rounded-lg bg-background/50 p-3">
                  <p className="text-xs text-muted-foreground">{t('stakingStatus')}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {stakingOpened ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-amber-500" />
                    )}
                    <span className="font-semibold">{stakingOpened ? t('open') : t('closed')}</span>
                  </div>
                </div>
                <div className="rounded-lg bg-background/50 p-3">
                  <p className="text-xs text-muted-foreground">{t('currentFeeOnChain')}</p>
                  <p className="font-semibold text-primary mt-1">
                    {stakingOpened ? `${(actualOnChainFeeBps / 100).toFixed(2)}%` : '0%'}
                  </p>
                </div>
                <div className="rounded-lg bg-background/50 p-3">
                  <p className="text-xs text-muted-foreground">{t('programmedNextFee')}</p>
                  <p className="font-semibold text-secondary mt-1">
                    {!SOLEON_CONFIG.programIdConfigured || !protocol.configExists || !stakingOpened
                      ? t('notAvailable')
                      : actualOnChainFeeBps < MAX_TRANSFER_FEE_BPS
                        ? `${(displayedProgrammedFeeBps / 100).toFixed(2)}%`
                        : t('maxReached')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Connect Wallet Prompt */}
        {!connected && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="flex flex-col items-center gap-6 py-8">
                <div className="rounded-full bg-amber-500/10 p-4">
                  <Wallet className="h-8 w-8 text-amber-500" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-amber-500">{t('connectRequired')}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{t('connectRequiredDesc')}</p>
                </div>
                <WalletButton />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Update Transfer Fee Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mb-8">
          <Card className="border-primary/20 bg-card/30 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                {t('updateFeeTitle')}
              </CardTitle>
              <CardDescription>{t('updateFeeDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Dynamic Fee Explanation */}
              <div className="rounded-lg bg-background/50 p-4">
                <h4 className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                  <Calendar className="h-4 w-4 text-primary" />
                  {t('dynamicFeeSchedule')}
                </h4>
                <p className="text-sm text-muted-foreground mb-3">{t('dynamicFeeExplanation')}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded bg-muted/50 p-2">
                    <span className="text-muted-foreground">{t('beforeStaking')}:</span>
                    <span className="ml-1 font-semibold">0%</span>
                  </div>
                  <div className="rounded bg-muted/50 p-2">
                    <span className="text-muted-foreground">{t('atStakingOpen')}:</span>
                    <span className="ml-1 font-semibold">0.02%</span>
                  </div>
                  <div className="rounded bg-muted/50 p-2">
                    <span className="text-muted-foreground">{t('afterYear')} 1:</span>
                    <span className="ml-1 font-semibold">0.04%</span>
                  </div>
                  <div className="rounded bg-muted/50 p-2">
                    <span className="text-muted-foreground">{t('afterYear')} 19:</span>
                    <span className="ml-1 font-semibold">0.4% (max)</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{t('maxFeeCapInfo', { maxFee: MAX_TRANSFER_FEE })}</p>
              </div>

              {/* Current Fee Status */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-lg bg-background/50 p-3">
                  <Percent className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('currentFeeOnChain')}</p>
                    <p className="font-semibold text-primary">
                      {stakingOpened ? `${(actualOnChainFeeBps / 100).toFixed(2)}%` : '0%'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-background/50 p-3">
                  <Zap className="h-5 w-5 text-secondary" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('programmedNextFee')}</p>
                    <p className="font-semibold text-secondary">
                      {!SOLEON_CONFIG.programIdConfigured || !protocol.configExists || !stakingOpened
                        ? t('notAvailable')
                        : actualOnChainFeeBps < MAX_TRANSFER_FEE_BPS
                          ? `${(displayedProgrammedFeeBps / 100).toFixed(2)}%`
                          : t('maxReached')}
                    </p>
                  </div>
                </div>
              </div>

              {showFeeUpdatePendingNotice && (
                <div className="flex items-start gap-3 rounded-lg bg-primary/10 border border-primary/20 p-4">
                  <Info className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    {t('feeUpdatePendingNotice')}
                  </p>
                </div>
              )}

              {SHOW_FEE_UPDATE_DEBUG && (
                <div className="rounded-lg bg-background/50 p-4 text-xs text-muted-foreground">
                  <div className="mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4 text-secondary" />
                    <span className="font-medium text-foreground">Fee update debug</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Current epoch</p>
                      <p className="font-mono text-sm text-foreground">
                        {feeUpdateDebug.currentEpoch !== null ? feeUpdateDebug.currentEpoch : 'n/a'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Older fee</p>
                      <p className="font-mono text-sm text-foreground">
                        {feeUpdateDebug.olderBps !== null ? `${(feeUpdateDebug.olderBps / 100).toFixed(2)}%` : 'n/a'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Newer fee</p>
                      <p className="font-mono text-sm text-foreground">
                        {feeUpdateDebug.newerBps !== null ? `${(feeUpdateDebug.newerBps / 100).toFixed(2)}%` : 'n/a'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Newer epoch</p>
                      <p className="font-mono text-sm text-foreground">
                        {feeUpdateDebug.newerEpoch !== null ? feeUpdateDebug.newerEpoch : 'n/a'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Pending on-chain</p>
                      <p className="font-mono text-sm text-foreground">
                        {feeUpdatePendingOnChain ? 'true' : 'false'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Loaded at</p>
                      <p className="font-mono text-sm text-foreground">
                        {feeUpdateDebug.loadedAt !== null ? new Date(feeUpdateDebug.loadedAt).toLocaleTimeString() : 'n/a'}
                      </p>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Error</p>
                      <p className="font-mono text-sm text-foreground">
                        {feeUpdateDebug.error ?? 'none'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Update Button - always show with dynamic text */}
              <Button
                onClick={handleUpdateTransferFee}
                className="w-full bg-gradient-to-r from-primary to-secondary"
                disabled={!canUpdateTransferFee || isUpdatingFee}
              >
                {isUpdatingFee ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    {t('updatingFee')}
                  </>
                ) : !onchainActionsEnabled ? (
                  <>
                    <Wrench className="mr-2 h-4 w-4" />
                    {t('onchainActionsPending')}
                  </>
                ) : !connected ? (
                  <>
                    <Wallet className="mr-2 h-4 w-4" />
                    {t('connectWalletToUpdate')}
                  </>
                ) : !stakingOpened ? (
                  <>
                    <Clock className="mr-2 h-4 w-4" />
                    {t('availableWhenStakingOpens')}
                  </>
                ) : !feeInfo.canUpdate ? (
                  <>
                    <Clock className="mr-2 h-4 w-4" />
                    {t('nextUpdateIn', { time: feeInfo.nextUpdateTime ? feeInfo.nextUpdateTime.toLocaleDateString() : 'soon' })}
                  </>
                ) : actualOnChainFeeBps >= MAX_TRANSFER_FEE_BPS ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {t('maxFeeReached')}
                  </>
                ) : (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    {t('updateTransferFee', { newFee: (displayedProgrammedFeeBps / 100).toFixed(2) })}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Fee Distribution Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8">
          <Card className="border-secondary/20 bg-card/30 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-secondary" />
                {t('feeDistributionTitle')}
              </CardTitle>
              <CardDescription>{t('feeDistributionDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Explanation */}
              <div className="rounded-lg bg-background/50 p-4">
                <p className="text-sm text-muted-foreground">{t('feeCollectionExplanation')}</p>
              </div>

              {/* Pending Scan State */}
              {feeIndex.data?.scanStatus === 'pending' && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
                  <h4 className="font-semibold text-amber-500 mb-2">{t('feeScanPending')}</h4>
                  <p className="text-sm text-muted-foreground">{t('feeScanPendingDesc')}</p>
                </div>
              )}

              {/* Pending Setup State */}
              {(!feeIndexScanEnabled || feeIndex.data?.scanStatus === 'no_mint' || (!feeIndex.data && !feeIndex.isLoading)) && (
                <div className="rounded-lg bg-muted/50 border border-border p-4">
                  <h4 className="font-semibold text-muted-foreground mb-2">{t('pendingSetup')}</h4>
                  <p className="text-sm text-muted-foreground">{t('pendingSetupDesc')}</p>
                </div>
              )}

              {/* Main Data Display */}
              <div className="mx-auto max-w-3xl space-y-4">
                {/* Top snapshot */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-background/50 p-3">
                    <div className="flex flex-col gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">{t('lastScan')}</p>
                        <p className="font-semibold text-muted-foreground">
                          {feeIndexReady && feeIndex.data?.lastScanTimestamp
                            ? t('timeAgo', { time: Math.round((Date.now() - feeIndex.data.lastScanTimestamp) / 60000) })
                            : ''}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshFeeIndex}
                        disabled={!feeIndexScanEnabled || isRefreshingFeeIndex || feeIndexCooldownActive}
                        className={`w-full ${feeIndexButtonTone}`}
                      >
                        {isRefreshingFeeIndex ? (
                          <>
                            <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                            {t('refreshingIndex')}
                          </>
                        ) : feeIndexUnavailable ? (
                          <>
                            <Clock className="mr-2 h-3.5 w-3.5" />
                            {feeIndexButtonLabel}
                          </>
                        ) : feeIndexCooldownActive ? (
                          <>
                            <Clock className="mr-2 h-3.5 w-3.5" />
                            {feeIndexButtonLabel}
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-3.5 w-3.5" />
                            {feeIndexButtonLabel}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-lg bg-background/50 p-3">
                    <p className="text-xs text-muted-foreground mb-1">{t('pendingFeesToCollect')}</p>
                    <p className={`font-semibold ${feeIndexReady ? 'text-primary text-lg' : 'text-muted-foreground'}`}>
                      {feeIndexReady ? `${formatSeonDecimal(feeIndex.data!.estimatedTotalWithheld)} SEON` : t('notAvailable')}
                    </p>
                  </div>
                  <div className="rounded-lg bg-background/50 p-3">
                    <p className="text-xs text-muted-foreground mb-1">{t('accountsWithPendingFees')}</p>
                    <p className={`font-semibold ${feeIndexReady ? '' : 'text-muted-foreground'}`}>
                      {feeIndexReady ? `${feeIndex.data!.accountCount} ${t('accounts')}` : t('notAvailable')}
                    </p>
                  </div>
                </div>

                {/* Minimum and caller reward */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-background/50 p-3">
                    <p className="text-xs text-muted-foreground mb-1">{t('minimumRequired')}</p>
                    <p className="font-semibold">{MIN_FEES_TO_DISTRIBUTE} SEON</p>
                  </div>
                  <div className="rounded-lg bg-background/50 p-3">
                    <p className="text-xs text-muted-foreground mb-1">{t('callerRewardFixed')}</p>
                    <p className="font-semibold text-green-500">{t('callerRewardFixedValue')}</p>
                  </div>
                </div>

                {/* Cooldowns */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-background/50 p-3">
                    <p className="text-xs text-muted-foreground mb-1">{t('globalCooldown')}</p>
                    <p className="font-semibold">
                      {!feeIndexScanEnabled
                        ? t('notAvailable')
                        : feeIndexCooldownActive
                          ? t('availableIn', { time: formatCooldown(feeIndexCooldownRemainingMs) })
                          : t('availableNow')}
                    </p>
                  </div>
                  <div className="rounded-lg bg-background/50 p-3">
                    <p className="text-xs text-muted-foreground mb-1">{t('yourCooldown')}</p>
                    <p className="font-semibold">
                      {!feeIndexScanEnabled
                        ? t('notAvailable')
                        : !connected
                          ? t('connectToSeeCooldown')
                          : t('canExecute')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cooldown Info */}
              <div className="flex items-start gap-2 rounded-lg bg-secondary/10 p-3 text-xs">
                <Info className="h-4 w-4 shrink-0 text-secondary" />
                <div className="text-muted-foreground">
                  <p>{t('cooldownInfo')}</p>
                </div>
              </div>

              {/* Public Action Note */}
              <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs">
                <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-muted-foreground">{t('publicActionNote')}</p>
              </div>

              {/* Distribute Button with dynamic text */}
              <Button
                onClick={handleDistributeFees}
                variant="outline"
                className="w-full border-secondary/50 hover:bg-secondary/10"
                disabled={!canDistributeFees || isDistributing}
              >
                {isDistributing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    {t('distributing')}
                  </>
                ) : !onchainActionsEnabled ? (
                  <>
                    <Wrench className="mr-2 h-4 w-4" />
                    {t('onchainActionsPending')}
                  </>
                ) : !stakingOpened ? (
                  <>
                    <Clock className="mr-2 h-4 w-4" />
                    {t('availableWhenStakingOpens')}
                  </>
                ) : !connected ? (
                  <>
                    <Wallet className="mr-2 h-4 w-4" />
                    {t('connectWalletToRun')}
                  </>
                ) : feeIndex.data?.scanStatus !== 'ready' ? (
                  <>
                    <Clock className="mr-2 h-4 w-4" />
                    {t('feeIndexUnavailable')}
                  </>
                ) : !meetsMinimum ? (
                  <>
                    <AlertCircle className="mr-2 h-4 w-4" />
                    {t('minimumNotReached')}
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t('collectAndDistribute')}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Expired position cleanup */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mb-8">
          <Card className="border-primary/20 bg-card/30 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-primary" />
                {t('cleanupTitle')}
              </CardTitle>
              <CardDescription>{t('cleanupDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-background/50 p-3">
                  <p className="text-xs text-muted-foreground">{t('cleanupDetected')}</p>
                  <p className="mt-1 text-lg font-semibold text-primary">
                    {expiredPositions?.status === 'ready' ? expiredPositions.positions.length : t('notAvailable')}
                  </p>
                </div>
                <div className="rounded-lg bg-background/50 p-3">
                  <p className="text-xs text-muted-foreground">{t('cleanupReward')}</p>
                  <p className="mt-1 text-lg font-semibold">1 SEON</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{t('cleanupExplanation')}</p>
              <Button
                type="button"
                variant="outline"
                className="w-full border-primary/40 hover:bg-primary/10"
                onClick={handleCleanupExpiredPositions}
                disabled={
                  !onchainActionsEnabled ||
                  !connected ||
                  !cleanupPositionsAvailable ||
                  cleanupCooldownActive ||
                  isRefreshingExpiredPositions ||
                  isCleaningExpired
                }
              >
                {isCleaningExpired || isRefreshingExpiredPositions ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ListChecks className="mr-2 h-4 w-4" />
                )}
                {isCleaningExpired
                  ? t('cleanupRunning')
                  : isRefreshingExpiredPositions
                    ? t('cleanupRefreshing')
                    : cleanupCooldownActive
                      ? t('cleanupCooldownButton', { time: formatCooldown(cleanupCooldownRemainingMs) })
                      : t('cleanupButton')}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Interface Maintainer Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mb-8">
          <Card className="border-muted/30 bg-card/30 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-muted-foreground" />
                {t('interfaceMaintainerTitle')}
              </CardTitle>
              <CardDescription>{t('interfaceMaintainerDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{t('interfaceMaintainerExplanation')}</p>

              {/* What the maintainer does */}
              <div className="rounded-lg bg-background/50 p-4">
                <h4 className="font-semibold mb-2 text-sm">{t('maintainerDoes')}</h4>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>- {t('maintainerDoes1')}</li>
                  <li>- {t('maintainerDoes2')}</li>
                  <li>- {t('maintainerDoes3')}</li>
                  <li>- {t('maintainerDoes4')}</li>
                  <li>- {t('maintainerDoes5')}</li>
                </ul>
              </div>

              {/* What the maintainer cannot do */}
              <div className="rounded-lg bg-red-500/5 p-4 border border-red-500/20">
                <h4 className="font-semibold mb-2 text-sm text-red-400">{t('maintainerCannotDo')}</h4>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>- {t('maintainerCannotDo1')}</li>
                  <li>- {t('maintainerCannotDo2')}</li>
                  <li>- {t('maintainerCannotDo3')}</li>
                  <li>- {t('maintainerCannotDo4')}</li>
                  <li>- {t('maintainerCannotDo5')}</li>
                </ul>
              </div>

              {/* Public maintenance wallet */}
              <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 className="font-semibold text-sm">{t('maintenanceWalletTitle')}</h4>
                    <p className="mt-1 text-xs text-muted-foreground">{t('maintenanceWalletLabel')}</p>
                  </div>
                  {maintenanceFeeReceiverUrl && maintenanceFeeReceiver ? (
                    <a
                      href={maintenanceFeeReceiverUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={maintenanceFeeReceiver}
                      className="inline-flex max-w-full items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      <span>{formatAddress(maintenanceFeeReceiver)}</span>
                      <ExternalLink className="h-4 w-4 shrink-0" />
                    </a>
                  ) : (
                    <p className="text-sm font-semibold text-muted-foreground">{t('notAvailable')}</p>
                  )}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{t('maintenanceWalletDesc')}</p>
              </div>

              {/* Important Note */}
              <div className="flex items-start gap-3 rounded-lg bg-primary/5 p-4 text-sm border border-primary/20">
                <Info className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                <p className="text-muted-foreground">{t('websiteConvenienceNote')}</p>
              </div>

              {/* Infrastructure Costs */}
              <div className="rounded-lg bg-background/50 p-4">
                <h4 className="font-semibold mb-2 text-sm">{t('estimatedCosts')}</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded bg-muted/50 p-2">
                    <span className="text-muted-foreground">{t('lowTraffic')}:</span>
                    <span className="ml-1 font-semibold">{'< $100/mo'}</span>
                  </div>
                  <div className="rounded bg-muted/50 p-2">
                    <span className="text-muted-foreground">{t('mediumTraffic')}:</span>
                    <span className="ml-1 font-semibold">$100-500/mo</span>
                  </div>
                  <div className="rounded bg-muted/50 p-2">
                    <span className="text-muted-foreground">{t('highTraffic')}:</span>
                    <span className="ml-1 font-semibold">$500-3,000/mo</span>
                  </div>
                  <div className="rounded bg-muted/50 p-2">
                    <span className="text-muted-foreground">{t('veryHighTraffic')}:</span>
                    <span className="ml-1 font-semibold">$3,000-10,000+/mo</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
