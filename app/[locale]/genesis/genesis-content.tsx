'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Coins,
  ExternalLink,
  Gift,
  Loader2,
  LockKeyhole,
  SearchCode,
  Send,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WalletButton } from '@/components/wallet-button';
import type { GenesisFundsCacheResponse } from '@/app/api/genesis-funds-cache/route';
import {
  MAX_DAILY_GENESIS_CLAIMS,
  SOLEON_CONFIG,
} from '@/lib/solana/config';
import type {
  GenesisApiErrorResponse,
  GenesisChallengeResponse,
  GenesisChallengeVerificationResponse,
} from '@/lib/genesis/challenge';
import type { EligibilityEvaluation } from '@/lib/genesis/eligibility';
import type { EligibilityApiResponse } from '@/app/api/genesis/eligibility/route';
import type { SignedGenesisClaimTransaction } from '@/lib/genesis/claim-server';
import {
  COMMITMENT_CLAIM_AMOUNTS,
  COMMITMENT_MAINTENANCE_FEE_SOL,
  type CommitmentClaimStateAccount,
  type CommitmentDistributionConfigAccount,
  fetchCommitmentClaimState,
  fetchCommitmentDistributionConfig,
  formatTokenAmount,
} from '@/lib/solana/client';

const supplyRows = [
  { key: 'rewardVault', amount: '440,000,000 SEON', percent: '99.00%' },
  { key: 'initialDistribution', amount: '4,400,000 SEON', percent: '0.99%' },
] as const;
const claimInfoRows = [
  { key: 'claimSequence', amount: '1 claim', icon: CheckCircle },
  {
    key: 'dailyLimit',
    amount: `${MAX_DAILY_GENESIS_CLAIMS}/day`,
    icon: Clock,
  },
] as const;

const networkRows = [
  { key: 'launch', icon: Coins },
  { key: 'staking', icon: LockKeyhole },
] as const;

const maintainerRows = [
  { key: 'amount', value: '44,444 SEON' },
  { key: 'totalSupplyShare', value: '0.01%' },
  { key: 'initialDistributionShare', value: '1.0%' },
] as const;

function parseOptionalPublicKey(address: string | null): PublicKey | null {
  if (!address) return null;
  try {
    return new PublicKey(address);
  } catch {
    return null;
  }
}

function formatAddress(address: string): string {
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
}

function signatureToBase64(signature: Uint8Array): string {
  return window.btoa(String.fromCharCode(...signature));
}

function transactionFromBase64(value: string): Transaction {
  const bytes = Uint8Array.from(window.atob(value), (character) =>
    character.charCodeAt(0)
  );
  return Transaction.from(bytes);
}

function getSolscanTxUrl(signature: string): string {
  const cluster = SOLEON_CONFIG.cluster === 'devnet' ? 'devnet' : 'mainnet';
  return `https://solscan.io/tx/${signature}?cluster=${cluster}`;
}

function getSolscanAccountUrl(address: string): string {
  const cluster = SOLEON_CONFIG.cluster === 'devnet' ? 'devnet' : 'mainnet';
  return `https://solscan.io/account/${address}?cluster=${cluster}`;
}

export function GenesisContent() {
  const t = useTranslations('genesis');
  const { connection } = useConnection();
  const { connected, publicKey, sendTransaction, signMessage } = useWallet();
  const [distributionConfig, setDistributionConfig] = useState<CommitmentDistributionConfigAccount | null>(null);
  const [claimState, setClaimState] = useState<CommitmentClaimStateAccount | null>(null);
  const [claimPending, setClaimPending] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSignature, setClaimSignature] = useState<string | null>(null);
  const [walletVerificationPending, setWalletVerificationPending] = useState(false);
  const [walletVerified, setWalletVerified] = useState(false);
  const [walletVerificationError, setWalletVerificationError] = useState<string | null>(null);
  const [eligibilityEvaluation, setEligibilityEvaluation] =
    useState<EligibilityEvaluation | null>(null);
  const [claimAuthorizationToken, setClaimAuthorizationToken] =
    useState<string | null>(null);
  const [genesisFunds, setGenesisFunds] = useState<GenesisFundsCacheResponse | null>(null);
  const walletAddress = publicKey?.toBase58() ?? null;
  const principles = t.raw('principles.items') as string[];
  const distributionSteps = t.raw('distributionFlow.items') as string[];
  const steps = t.raw('steps.items') as string[];
  const maintainerNotes = t.raw('maintainer.notes') as string[];
  const riskNotes = t.raw('risks.items') as string[];
  const claimSchedule = t.raw('claim.schedule') as string[];
  const creatorAllocationWallet = useMemo(() => parseOptionalPublicKey(SOLEON_CONFIG.creatorAllocationWallet), []);
  const creatorWalletUrl = creatorAllocationWallet ? getSolscanAccountUrl(creatorAllocationWallet.toBase58()) : null;
  const claimVaultAddress = genesisFunds?.claimVault.tokenAccount ?? SOLEON_CONFIG.commitmentClaimVault;
  const claimVaultUrl = claimVaultAddress ? getSolscanAccountUrl(claimVaultAddress) : null;
  const claimVaultBalance = genesisFunds?.claimVault.balance ? BigInt(genesisFunds.claimVault.balance) : null;

  const claimProgramId = useMemo(
    () => parseOptionalPublicKey(SOLEON_CONFIG.commitmentClaimProgramIdConfigured ? SOLEON_CONFIG.commitmentClaimProgramId : null),
    []
  );
  const configuredMint = useMemo(() => parseOptionalPublicKey(SOLEON_CONFIG.soleonMint), []);
  const claimCount = Math.min(claimState?.claimCount ?? 0, COMMITMENT_CLAIM_AMOUNTS.length);
  const claimsComplete = claimCount >= COMMITMENT_CLAIM_AMOUNTS.length;
  const todayUtc = Math.floor(Date.now() / 1_000 / 86_400);
  const claimsToday = distributionConfig &&
    Number(distributionConfig.currentUtcDay) === todayUtc
    ? distributionConfig.claimsToday
    : 0;
  const dailyLimitReached = claimsToday >= MAX_DAILY_GENESIS_CLAIMS;
  const distributionClosed = distributionConfig?.closed ?? false;
  const vaultEmpty = claimVaultBalance !== null &&
    claimVaultBalance < COMMITMENT_CLAIM_AMOUNTS[0];
  const mintReady = Boolean(distributionConfig?.soleonMint ?? configuredMint);
  const programReady = claimProgramId !== null;
  const distributionReady = distributionConfig !== null;
  const canClaim = Boolean(
    connected &&
    publicKey &&
    eligibilityEvaluation?.status === 'eligible' &&
    claimAuthorizationToken &&
    programReady &&
    mintReady &&
    distributionReady &&
    !claimsComplete &&
    !dailyLimitReached &&
    !distributionClosed &&
    !vaultEmpty &&
    !claimPending
  );

  const claimStatus = !programReady
    ? t('claim.statusProgramPending')
    : !mintReady
      ? t('claim.statusMintPending')
      : !distributionReady
        ? t('claim.statusDistributionPending')
        : claimsComplete
          ? t('claim.statusComplete')
        : distributionClosed
          ? t('claim.statusClosed')
        : vaultEmpty
          ? t('claim.statusVaultEmpty')
        : dailyLimitReached
          ? t('claim.statusDailyLimit')
        : eligibilityEvaluation?.status === 'ineligible'
          ? t('claim.statusIneligible')
        : eligibilityEvaluation?.status === 'unavailable'
          ? t('claim.statusEligibilityUnavailable')
        : !walletVerified
          ? t('claim.statusWalletVerification')
          : t('claim.statusReady');
  const claimButtonLabel = claimPending
    ? t('claim.claiming')
    : t('claim.button');

  const refreshClaimState = useCallback(async () => {
    if (!claimProgramId) {
      setDistributionConfig(null);
      setClaimState(null);
      return;
    }

    const config = await fetchCommitmentDistributionConfig(claimProgramId);
    setDistributionConfig(config);
    if (publicKey) {
      setClaimState(await fetchCommitmentClaimState(publicKey, claimProgramId));
    } else {
      setClaimState(null);
    }
  }, [claimProgramId, publicKey]);

  useEffect(() => {
    void refreshClaimState();
  }, [refreshClaimState]);

  useEffect(() => {
    setWalletVerified(false);
    setWalletVerificationError(null);
    setWalletVerificationPending(false);
    setEligibilityEvaluation(null);
    setClaimAuthorizationToken(null);
  }, [walletAddress]);

  useEffect(() => {
    if (!claimProgramId) return;
    const interval = window.setInterval(() => void refreshClaimState(), 30_000);
    return () => window.clearInterval(interval);
  }, [claimProgramId, refreshClaimState]);

  useEffect(() => {
    let cancelled = false;

    const loadGenesisFunds = async () => {
      try {
        const response = await fetch('/api/genesis-funds-cache', {
          method: 'GET',
          cache: 'no-store',
        });
        const payload = await response.json() as GenesisFundsCacheResponse;
        if (!cancelled) {
          setGenesisFunds(payload);
        }
      } catch {
        if (!cancelled) {
          setGenesisFunds(null);
        }
      }
    };

    void loadGenesisFunds();
    const interval = window.setInterval(() => void loadGenesisFunds(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const handleClaim = async () => {
    if (!publicKey || !claimAuthorizationToken) return;

    setClaimPending(true);
    setClaimError(null);
    setClaimSignature(null);

    try {
      const transactionResponse = await fetch('/api/genesis/claim-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: publicKey.toBase58(),
          claimAuthorizationToken,
        }),
      });
      const transactionPayload = await transactionResponse.json() as
        | SignedGenesisClaimTransaction
        | GenesisApiErrorResponse;
      setClaimAuthorizationToken(null);
      if (!transactionResponse.ok || 'error' in transactionPayload) {
        throw new Error(
          'error' in transactionPayload
            ? transactionPayload.error.message
            : t('claim.error')
        );
      }

      const transaction = transactionFromBase64(
        transactionPayload.transactionBase64
      );
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(
        {
          signature,
          blockhash: transactionPayload.blockhash,
          lastValidBlockHeight: transactionPayload.lastValidBlockHeight,
        },
        'confirmed'
      );
      setClaimSignature(signature);
      await refreshClaimState();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setClaimError(message || t('claim.error'));
    } finally {
      setClaimPending(false);
    }
  };

  const handleVerifyWallet = async () => {
    if (!publicKey || !signMessage) {
      setWalletVerificationError(t('claim.verification.unsupported'));
      return;
    }

    setWalletVerificationPending(true);
    setWalletVerificationError(null);
    setWalletVerified(false);
    setEligibilityEvaluation(null);
    setClaimAuthorizationToken(null);

    try {
      const challengeResponse = await fetch('/api/genesis/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: publicKey.toBase58() }),
      });
      const challengePayload = await challengeResponse.json() as
        | GenesisChallengeResponse
        | GenesisApiErrorResponse;
      if (!challengeResponse.ok || 'error' in challengePayload) {
        const code = 'error' in challengePayload ? challengePayload.error.code : '';
        throw new Error(
          code === 'RATE_LIMITED'
            ? t('claim.verification.rateLimited')
            : code === 'SERVICE_UNAVAILABLE'
              ? t('claim.verification.unavailable')
              : t('claim.verification.error')
        );
      }

      const signature = await signMessage(
        new TextEncoder().encode(challengePayload.message)
      );
      const verifyResponse = await fetch('/api/genesis/challenge/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: publicKey.toBase58(),
          challengeId: challengePayload.challengeId,
          signature: signatureToBase64(signature),
        }),
      });
      const verifyPayload = await verifyResponse.json() as
        | GenesisChallengeVerificationResponse
        | GenesisApiErrorResponse;
      if (!verifyResponse.ok || 'error' in verifyPayload || !verifyPayload.verified) {
        const code = 'error' in verifyPayload ? verifyPayload.error.code : '';
        throw new Error(
          code === 'RATE_LIMITED'
            ? t('claim.verification.rateLimited')
            : code === 'CHALLENGE_EXPIRED' || code === 'CHALLENGE_USED'
              ? t('claim.verification.expired')
              : code === 'SERVICE_UNAVAILABLE'
                ? t('claim.verification.unavailable')
                : t('claim.verification.error')
        );
      }

      setWalletVerified(true);

      const eligibilityResponse = await fetch('/api/genesis/eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: publicKey.toBase58(),
          verificationToken: verifyPayload.verificationToken,
        }),
      });
      const eligibilityPayload = await eligibilityResponse.json() as
        | EligibilityApiResponse
        | GenesisApiErrorResponse;
      if (!eligibilityResponse.ok || 'error' in eligibilityPayload) {
        const code = 'error' in eligibilityPayload
          ? eligibilityPayload.error.code
          : '';
        throw new Error(
          code === 'DAILY_EVALUATION_LIMIT'
            ? t('claim.verification.dailyLimit')
            : code === 'EVALUATION_IN_PROGRESS'
              ? t('claim.verification.inProgress')
              : code === 'VERIFICATION_EXPIRED'
                ? t('claim.verification.expired')
                : t('claim.verification.unavailable')
        );
      }
      setEligibilityEvaluation(eligibilityPayload.evaluation);
      setClaimAuthorizationToken(eligibilityPayload.claimAuthorizationToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setWalletVerificationError(message || t('claim.verification.error'));
    } finally {
      setWalletVerificationPending(false);
    }
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-background pt-24 pb-16">
      <div className="mx-auto min-w-0 max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <div className="mx-auto mb-6 w-24">
            <Image
              src="/images/logo-token.png"
              alt="Soleon"
              width={96}
              height={96}
              className="h-24 w-24"
              priority
            />
          </div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            {t('eyebrow')}
          </p>
          <h1 className="max-w-full break-words font-serif text-3xl font-bold text-gradient-gold sm:text-4xl md:text-5xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-4 w-full max-w-3xl break-words text-lg text-muted-foreground">
            {t('subtitle')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="min-w-0 border-primary/20 bg-gradient-to-r from-primary/10 to-secondary/10 backdrop-blur">
            <CardContent className="grid gap-6 p-6 md:grid-cols-3">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/15 p-3">
                  <Coins className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('status.totalSupply')}</p>
                  <p className="text-xl font-bold">444,444,444 SEON</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-secondary/15 p-3">
                  <Wallet className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('status.participation')}</p>
                  <p className="text-xl font-bold">4,400,000 SEON</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-green-500/15 p-3">
                  <ShieldCheck className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('status.sale')}</p>
                  <p className="text-xl font-bold text-green-500">{t('status.noSale')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="h-full min-w-0 border-primary/20 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-primary" />
                  {t('claim.title')}
                </CardTitle>
                <CardDescription>{t('claim.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border border-border/50 bg-background/40 p-3">
                    <p className="text-xs text-muted-foreground">{t('claim.amount')}</p>
                    <p className="mt-1 text-lg font-bold">
                      {formatTokenAmount(COMMITMENT_CLAIM_AMOUNTS[0])} SEON
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-background/40 p-3">
                    <p className="text-xs text-muted-foreground">{t('claim.dailyClaims')}</p>
                    <p className="mt-1 text-lg font-bold">
                      {claimsToday}/{MAX_DAILY_GENESIS_CLAIMS}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-background/40 p-3">
                    <p className="text-xs text-muted-foreground">{t('claim.fee')}</p>
                    <p className="mt-1 text-lg font-bold">{COMMITMENT_MAINTENANCE_FEE_SOL} SOL</p>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-background/40 p-3">
                    <p className="text-xs text-muted-foreground">{t('claim.vaultRemaining')}</p>
                    <p className="mt-1 text-lg font-bold">
                      {claimVaultBalance === null
                        ? t('claim.pendingValue')
                        : `${formatTokenAmount(claimVaultBalance)} SEON`}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">{t('claim.statusLabel')}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{claimStatus}</p>
                </div>

                <ul className="space-y-2">
                  {claimSchedule.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>

                <p className="text-sm text-muted-foreground">{t('claim.feePurpose')}</p>

                {connected && (
                  <div className="rounded-lg border border-border/50 bg-background/40 p-4">
                    <div className="flex items-start gap-3">
                      <ShieldCheck
                        className={`mt-0.5 h-5 w-5 shrink-0 ${
                          walletVerified ? 'text-green-500' : 'text-primary'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{t('claim.verification.title')}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {eligibilityEvaluation?.status === 'eligible'
                            ? t('claim.verification.eligible')
                            : eligibilityEvaluation?.status === 'ineligible'
                              ? t('claim.verification.ineligible')
                              : eligibilityEvaluation?.status === 'unavailable'
                                ? t('claim.verification.unavailable')
                                : walletVerified
                                  ? t('claim.verification.evaluating')
                                  : t('claim.verification.description')}
                        </p>
                        {!eligibilityEvaluation && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={handleVerifyWallet}
                            disabled={
                              walletVerificationPending ||
                              !signMessage ||
                              dailyLimitReached ||
                              distributionClosed ||
                              vaultEmpty
                            }
                          >
                            {walletVerificationPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <ShieldCheck className="mr-2 h-4 w-4" />
                            )}
                            {walletVerificationPending
                              ? t('claim.verification.signing')
                              : t('claim.verification.button')}
                          </Button>
                        )}
                      </div>
                    </div>
                    {eligibilityEvaluation && (
                      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        <div className="rounded border border-border/50 p-2">
                          <p className="text-xs text-muted-foreground">
                            {t('claim.verification.transactions')}
                          </p>
                          <p className="text-sm font-semibold">
                            {eligibilityEvaluation.metrics.validTransactionCount}/20
                          </p>
                        </div>
                        <div className="rounded border border-border/50 p-2">
                          <p className="text-xs text-muted-foreground">
                            {t('claim.verification.activeDays')}
                          </p>
                          <p className="text-sm font-semibold">
                            {eligibilityEvaluation.metrics.distinctActiveDays}/5
                          </p>
                        </div>
                        <div className="rounded border border-border/50 p-2">
                          <p className="text-xs text-muted-foreground">
                            {t('claim.verification.activeMonths')}
                          </p>
                          <p className="text-sm font-semibold">
                            {eligibilityEvaluation.metrics.distinctActiveMonths}/3
                          </p>
                        </div>
                        <div className="rounded border border-border/50 p-2">
                          <p className="text-xs text-muted-foreground">
                            {t('claim.verification.history')}
                          </p>
                          <p className="text-sm font-semibold">
                            {eligibilityEvaluation.metrics.accountHistoryDays ?? 0}/90
                          </p>
                        </div>
                        <div className="rounded border border-border/50 p-2">
                          <p className="text-xs text-muted-foreground">
                            {t('claim.verification.recent')}
                          </p>
                          <p className="text-sm font-semibold">
                            {eligibilityEvaluation.metrics.daysSinceRecentActivity !== null &&
                            eligibilityEvaluation.metrics.daysSinceRecentActivity <= 30
                              ? t('claim.verification.yes')
                              : t('claim.verification.no')}
                          </p>
                        </div>
                      </div>
                    )}
                    {walletVerificationError && (
                      <p className="mt-3 text-sm text-destructive">
                        {walletVerificationError}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row">
                  {connected ? (
                    <Button
                      onClick={handleClaim}
                      disabled={!canClaim}
                      className="w-full sm:w-auto"
                    >
                      {claimPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      {claimButtonLabel}
                    </Button>
                  ) : (
                    <WalletButton />
                  )}
                </div>

                {claimError && (
                  <p className="text-sm text-destructive">{claimError}</p>
                )}
                {claimSignature && (
                  <a
                    href={getSolscanTxUrl(claimSignature)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {t('claim.viewTransaction')}
                  </a>
                )}
              </CardContent>
            </Card>
          </motion.div>

        </div>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="h-full border-primary/20 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  {t('whatIs.title')}
                </CardTitle>
                <CardDescription>{t('whatIs.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {supplyRows.map((row) => (
                    <div
                      key={row.key}
                      className="rounded-lg border border-border/50 bg-background/40 p-4"
                    >
                      <p className="text-sm text-muted-foreground">
                        {t(`supply.${row.key}.label`)}
                      </p>
                      <p className="mt-2 text-2xl font-bold text-gradient-gold">
                        {row.amount}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {row.percent} {t('supply.ofTotal')}
                      </p>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {t(`supply.${row.key}.description`)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <h3 className="mb-3 font-semibold text-foreground">
                    {t('principles.title')}
                  </h3>
                  <ul className="space-y-2">
                    {principles.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="h-full border-secondary/20 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-secondary" />
                  {t('participation.title')}
                </CardTitle>
                <CardDescription>{t('participation.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-4">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-secondary/10 p-2">
                        <Gift className="h-5 w-5 text-secondary" />
                      </div>
                      <h3 className="font-semibold">{t('participation.claimVaultFunding.title')}</h3>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-primary">
                      4,400,000 SEON
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{t('participation.claimVaultFunding.addressLabel')}</p>
                      {claimVaultUrl && claimVaultAddress ? (
                        <a
                          href={claimVaultUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={claimVaultAddress}
                          className="mt-1 inline-flex max-w-full items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                        >
                          <span>{formatAddress(claimVaultAddress)}</span>
                          <ExternalLink className="h-4 w-4 shrink-0" />
                        </a>
                      ) : (
                        <p className="mt-1 text-sm font-semibold text-muted-foreground">
                          {t('participation.claimVaultFunding.pending')}
                        </p>
                      )}
                    </div>
                    {claimVaultBalance !== null && (
                      <div>
                        <p className="text-xs text-muted-foreground">{t('participation.claimVaultFunding.available')}</p>
                        <p className="mt-1 text-xl font-bold text-gradient-gold">
                          {formatTokenAmount(claimVaultBalance)} SEON
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {claimInfoRows.map((row) => (
                  <div
                    key={row.key}
                    className="rounded-lg border border-border/50 bg-background/40 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-secondary/10 p-2">
                          <row.icon className="h-5 w-5 text-secondary" />
                        </div>
                        <h3 className="font-semibold">{t(`participation.${row.key}.title`)}</h3>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-primary">
                        {row.amount}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t(`participation.${row.key}.description`)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="h-full border-secondary/20 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-secondary" />
                  {t('networks.title')}
                </CardTitle>
                <CardDescription>{t('networks.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {networkRows.map((row) => (
                  <div
                    key={row.key}
                    className="rounded-lg border border-border/50 bg-background/40 p-4"
                  >
                    <div className="mb-2 flex items-center gap-3">
                      <div className="rounded-lg bg-secondary/10 p-2">
                        <row.icon className="h-5 w-5 text-secondary" />
                      </div>
                      <h3 className="font-semibold">{t(`networks.${row.key}.title`)}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t(`networks.${row.key}.description`)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="h-full border-primary/20 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  {t('distributionFlow.title')}
                </CardTitle>
                <CardDescription>{t('distributionFlow.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4">
                  {distributionSteps.map((step, index) => (
                    <li key={step} className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                        {index + 1}
                      </span>
                      <span className="text-sm text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="h-full border-primary/20 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LockKeyhole className="h-5 w-5 text-primary" />
                  {t('maintainer.title')}
                </CardTitle>
                <CardDescription>{t('maintainer.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  {maintainerRows.map((row) => (
                    <div
                      key={row.key}
                      className="rounded-lg border border-border/50 bg-background/40 p-3"
                    >
                      <p className="text-xs text-muted-foreground">
                        {t(`maintainer.stats.${row.key}`)}
                      </p>
                      <p className="mt-1 text-lg font-bold">{row.value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-border/50 bg-background/40 p-4">
                  <p className="text-xs text-muted-foreground">{t('maintainer.creatorWalletLabel')}</p>
                  {creatorWalletUrl ? (
                    <a
                      href={creatorWalletUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex max-w-full items-center gap-2 break-all text-sm font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      {creatorAllocationWallet?.toBase58()}
                      <ExternalLink className="h-4 w-4 shrink-0" />
                    </a>
                  ) : (
                    <p className="mt-1 text-sm font-semibold text-muted-foreground">
                      {t('maintainer.creatorWalletPending')}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t('maintainer.creatorWalletDescription')}
                  </p>
                </div>

                <ul className="space-y-2">
                  {maintainerNotes.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="h-full border-secondary/20 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SearchCode className="h-5 w-5 text-secondary" />
                  {t('steps.title')}
                </CardTitle>
                <CardDescription>{t('steps.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4">
                  {steps.map((step, index) => (
                    <li key={step} className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                        {index + 1}
                      </span>
                      <span className="text-sm text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8"
        >
          <Card className="border-amber-500/20 bg-amber-500/5 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-500">
                <AlertTriangle className="h-5 w-5" />
                {t('risks.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3 md:grid-cols-2">
                {riskNotes.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
