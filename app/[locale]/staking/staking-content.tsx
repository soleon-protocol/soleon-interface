'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  Coins,
  Lock,
  Gift,
  Clock,
  TrendingUp,
  Terminal,
  ChevronDown,
  AlertCircle,
  Info,
  ShieldAlert,
  Database,
  Wallet,
  Check,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { WalletButton } from '@/components/wallet-button';
import { useSoleonProtocol } from '@/hooks/use-soleon-protocol';
import {
  createClaimRewardsTransaction,
  createStakeTransaction,
  createRenewExpiredPositionTransaction,
  createUnstakeExpiredTransaction,
  fetchConfigAccount,
  estimateClaimableRewards,
  projectRewardPerTokenQ64,
  formatTokenAmount,
  parseTokenAmount,
} from '@/lib/solana/client';
import { SOLEON_CONFIG, GRACE_PERIOD_DAYS, LOCK_DAYS, isShortBurnDeployment } from '@/lib/solana/config';

const SECONDS_PER_DAY = 24 * 60 * 60;
const TOKEN_DECIMALS = 1_000_000_000;
const SHORT_BURN_LOCK_UNIT_SECONDS = 1;
const AMOUNT_PRESETS = [
  { label: 'MAX', numerator: 1, denominator: 1 },
  { label: '50%', numerator: 1, denominator: 2 },
  { label: '25%', numerator: 1, denominator: 4 },
];

function toVisibleAmount(amount: bigint): number {
  return Number(amount) / TOKEN_DECIMALS;
}

function formatInputAmount(amount: bigint): string {
  const visible = toVisibleAmount(amount);
  return Number.isInteger(visible) ? String(visible) : visible.toString();
}

function formatDays(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const parts = [
    days > 0 ? `${days}d` : null,
    hours > 0 || days > 0 ? `${hours}h` : null,
    minutes > 0 || hours > 0 || days > 0 ? `${minutes}m` : null,
    `${secs}s`,
  ].filter(Boolean) as string[];
  return parts.slice(0, 4).join(' ');
}

function formatDateTime(timestampSeconds: number): string {
  return new Date(timestampSeconds * 1000).toLocaleString();
}

function getSolscanAccountUrl(address: string): string {
  const cluster = SOLEON_CONFIG.cluster === 'devnet' ? 'devnet' : 'mainnet';
  return `https://solscan.io/account/${address}?cluster=${cluster}`;
}

export function StakingContent() {
  const t = useTranslations('staking');
  const locale = useLocale();
  const { connection } = useConnection();
  const { connected, publicKey, sendTransaction } = useWallet();
  const protocol = useSoleonProtocol();
  
  const [stakeAmount, setStakeAmount] = useState('');
  const [stakeAmountSlider, setStakeAmountSlider] = useState(0);
  const [isStaking, setIsStaking] = useState(false);
  const [stakeError, setStakeError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const isDevnet = SOLEON_CONFIG.cluster === 'devnet';
  const isShortBurn = protocol.testShortBurn || isShortBurnDeployment();
  const gracePeriodSeconds = isShortBurn ? 3 * 60 * 60 : GRACE_PERIOD_DAYS * SECONDS_PER_DAY;
  const stakingTransactionsEnabled = SOLEON_CONFIG.stakingTransactionsEnabled || isDevnet;
  const positions = protocol.userData.positions;
  const positionLabel = locale === 'es' ? 'Posición' : 'Position';
  const renewNotice = locale === 'es'
    ? 'Renovar y retirar al final del periodo de bloqueo'
    : 'Renew and unstake at the end of the lock period';
  const walletAmount = protocol.userData.seonBalance !== null
    ? toVisibleAmount(protocol.userData.seonBalance)
    : 0;
  const nowSeconds = Math.floor(nowMs / 1000);
  const stakingVaultSolscanUrl = protocol.stakingVault ? getSolscanAccountUrl(protocol.stakingVault.toBase58()) : null;
  const rewardVaultSolscanUrl = protocol.rewardVault ? getSolscanAccountUrl(protocol.rewardVault.toBase58()) : null;

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const setAmountPreset = (numerator: number, denominator: number) => {
    const balance = protocol.userData.seonBalance;
    if (balance === null) return;

    const selected = balance * BigInt(numerator) / BigInt(denominator);
    const selectedDisplay = toVisibleAmount(selected);
    setStakeAmount(formatInputAmount(selected));
    setStakeAmountSlider(selectedDisplay);
  };

  const setMaxAmount = () => {
    const balance = protocol.userData.seonBalance;
    if (balance === null) return;
    const displayAmount = toVisibleAmount(balance);
    setStakeAmount(formatInputAmount(balance));
    setStakeAmountSlider(displayAmount);
  };

  const handleAmountSliderChange = (value: number[]) => {
    setStakeAmountSlider(value[0]);
    setStakeAmount(String(value[0]));
  };

  const handleAmountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setStakeError(null);
    setStakeAmount(raw);
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    setStakeAmountSlider(parsed);
  };
  
  useEffect(() => {
    const balance = protocol.userData.seonBalance;
    if (balance === null) return;

    const current = toVisibleAmount(balance);
    if (!Number.isFinite(current)) return;

    if (stakeAmountSlider > current) {
      setStakeAmountSlider(current);
      setStakeAmount(formatInputAmount(balance));
    }
  }, [protocol.userData.seonBalance, stakeAmountSlider]);

  // Check if staking actions are available
  const stakingOpened = protocol.stakingOpened || protocol.stakingOpenedTime !== null;
  const stakingLive = stakingOpened;
  const canPerformActions = connected && stakingLive && stakingTransactionsEnabled;
  const walletSnapshotLoaded = connected && protocol.userData.seonBalance !== null;
  const walletValue = (value: bigint | null) => (
    connected && value !== null ? `${formatTokenAmount(value)} SEON` : t('notAvailableYet')
  );
  const stakeAmountValue = Number(stakeAmount);
  const stakeDisabledReason =
    !connected
      ? null
      : !stakingLive
        ? (locale === 'es' ? 'El staking todavía no está abierto.' : 'Staking is not open yet.')
        : !stakingTransactionsEnabled
          ? t('onchainStakingPending')
          : !walletSnapshotLoaded
            ? (locale === 'es' ? 'Cargando balance de wallet.' : 'Loading wallet balance.')
            : !stakeAmount || !Number.isFinite(stakeAmountValue) || stakeAmountValue <= 0
              ? (locale === 'es' ? 'Introduce una cantidad mayor que 0.' : 'Enter an amount greater than 0.')
              : stakeAmountValue > walletAmount
                ? (locale === 'es' ? 'La cantidad supera tu balance disponible.' : 'Amount exceeds your available balance.')
                : isStaking
                  ? null
                  : null;
  const canSubmitStake = !stakeDisabledReason && !isStaking;
  const lockUnitLabel = isShortBurn ? (locale === 'es' ? 'horas' : 'hours') : t('days');
  const lockUnitWord = lockUnitLabel;

  const handleStake = async () => {
    if (!canPerformActions || !publicKey) return;

    setIsStaking(true);
    setStakeError(null);

    try {
      const config = protocol.config ?? await fetchConfigAccount();
      if (!config) {
        throw new Error('Protocol config account not found');
      }

      const transaction = createStakeTransaction({
        owner: publicKey,
        config,
        amount: parseTokenAmount(stakeAmount),
        programId: protocol.programId ?? undefined,
      });

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      setStakeAmount('');
      await protocol.refresh();
    } catch (error) {
      console.error('[v0] Stake error:', error);
      const message = error instanceof Error ? error.message : String(error);
      setStakeError(message || (locale === 'es' ? 'No se pudo completar el staking.' : 'Could not complete staking.'));
    } finally {
      setIsStaking(false);
    }
  };

  const handlePositionAction = async (
    action: 'claim' | 'renew' | 'unstake',
    position: typeof positions[number]
  ) => {
    if (!canPerformActions || !publicKey) return;

    const actionKey = `${action}-${position.positionId.toString()}`;
    setActiveAction(actionKey);

    try {
      const config = protocol.config ?? await fetchConfigAccount();
      if (!config) {
        throw new Error('Protocol config account not found');
      }

      let transaction;
      if (action === 'claim') {
        transaction = createClaimRewardsTransaction({
          owner: publicKey,
          config,
          positionId: position.positionId,
          programId: protocol.programId ?? undefined,
        });
      } else if (action === 'renew') {
        transaction = createRenewExpiredPositionTransaction({
          owner: publicKey,
          config,
          oldPositionId: position.positionId,
          programId: protocol.programId ?? undefined,
        });
      } else {
        transaction = createUnstakeExpiredTransaction({
          caller: publicKey,
          owner: publicKey,
          config,
          positionId: position.positionId,
          programId: protocol.programId ?? undefined,
        });
      }

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      await protocol.refresh();
    } catch (error) {
      console.error(`[v0] ${action} error:`, error);
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <main className="min-h-screen bg-background pt-24 pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <h1 className="font-serif text-4xl font-bold text-gradient-gold md:text-5xl">
            {t('title')}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{t('subtitle')}</p>
        </motion.div>

        {/* Your Wallet Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8"
        >
          <Card className="border-primary/20 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                {t('yourWallet')}
              </CardTitle>
              <CardDescription>{t('yourWalletDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {!connected ? (
                <div className="flex flex-col items-center gap-4 py-6">
                  <div className="rounded-full bg-primary/10 p-4">
                    <Wallet className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-center text-muted-foreground max-w-md">
                    {t('connectWalletToSeeBalance')}
                  </p>
                  <WalletButton />
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* SEON Balance */}
                    <div className="rounded-lg bg-background/50 p-4">
                      <p className="text-sm text-muted-foreground">{t('seonBalance')}</p>
                      <p className="text-xl font-bold text-primary">{walletValue(protocol.userData.seonBalance)}</p>
                    </div>
                    {/* Staked SEON */}
                    <div className="rounded-lg bg-background/50 p-4">
                      <p className="text-sm text-muted-foreground">{t('stakedSeon')}</p>
                      <p className="text-xl font-bold text-primary">{walletValue(protocol.userData.stakedSeon)}</p>
                    </div>
                    {/* Claimable Rewards */}
                    <div className="rounded-lg bg-background/50 p-4">
                      <p className="text-sm text-muted-foreground">{t('claimableRewards')}</p>
                      <p className="text-xl font-bold text-secondary">{walletValue(protocol.userData.claimableRewards)}</p>
                    </div>
                      {/* Active Positions */}
                    <div className="rounded-lg bg-background/50 p-4">
                      <p className="text-sm text-muted-foreground">{t('activePositions')}</p>
                      <p className="text-xl font-bold">
                        {walletSnapshotLoaded ? protocol.userData.activePositions : t('notAvailableYet')}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground text-center">
                    {t('walletBalanceNote')}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Staking Not Active Warning */}
        {!stakingLive && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="flex items-start gap-4 p-6">
                <ShieldAlert className="h-8 w-8 shrink-0 text-amber-500" />
                <div>
                  <h3 className="text-lg font-semibold text-amber-500">
                    {t('stakingNotActive')}
                  </h3>
                  <p className="mt-2 text-muted-foreground">
                    {t('stakingNotActiveDesc')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* What is Staking Education Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mb-8"
        >
          <Card className="border-primary/20 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                {t('whatIsStaking')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-muted-foreground mb-4">{t('whatIsStakingIntro')}</p>
                <p className="text-muted-foreground">{t('whatIsStakingDesc')}</p>
              </div>

              {/* Education Cards */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-background/50 p-4 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Lock className="h-5 w-5 text-primary" />
                  </div>
                  <h4 className="font-semibold mb-1">{t('eduCard1Title')}</h4>
                  <p className="text-xs text-muted-foreground">{t('eduCard1Desc')}</p>
                </div>
                <div className="rounded-lg bg-background/50 p-4 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10">
                    <Gift className="h-5 w-5 text-secondary" />
                  </div>
                  <h4 className="font-semibold mb-1">{t('eduCard2Title')}</h4>
                  <p className="text-xs text-muted-foreground">{t('eduCard2Desc')}</p>
                </div>
                <div className="rounded-lg bg-background/50 p-4 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                    <Clock className="h-5 w-5 text-amber-500" />
                  </div>
                  <h4 className="font-semibold mb-1">{t('eduCard3Title')}</h4>
                  <p className="text-xs text-muted-foreground">{t('eduCard3Desc')}</p>
                </div>
              </div>

              {/* What is it for */}
              <div>
                <h4 className="font-semibold mb-3">{t('whatIsItFor')}</h4>
                <ul className="grid gap-2 sm:grid-cols-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
                    {t('purpose1')}
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
                    {t('purpose2')}
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
                    {t('purpose3')}
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
                    {t('purpose4')}
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
                    {t('purpose5')}
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
                    {t('purpose6')}
                  </li>
                </ul>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-3 rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
                <p className="text-sm text-muted-foreground">{t('stakingWarning')}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Protocol Stats - Always visible (read-only) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="border-primary/20 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                {t('protocolStats')}
              </CardTitle>
              <CardDescription>{t('protocolStatsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-background/50 p-4 text-center">
                  <p className="text-sm text-muted-foreground">{t('totalStaked')}</p>
                  <p className="text-xl font-bold text-primary">
                    {protocol.totalStaked !== null
                      ? `${formatTokenAmount(protocol.totalStaked)} SEON`
                      : t('notAvailableYet')}
                  </p>
                  <div className="mt-2">
                    {protocol.totalStaked !== null && stakingVaultSolscanUrl ? (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-8 border-primary/30 px-3 text-xs"
                      >
                        <a href={stakingVaultSolscanUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-3.5 w-3.5" />
                          Solscan
                        </a>
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">{t('notAvailableYet')}</p>
                    )}
                  </div>
                </div>
                <div className="rounded-lg bg-background/50 p-4 text-center">
                  <p className="text-sm text-muted-foreground">{t('rewardVault')}</p>
                  <p className="text-xl font-bold text-primary">
                    {protocol.rewardVaultBalance !== null
                      ? `${formatTokenAmount(protocol.rewardVaultBalance)} SEON`
                      : t('notAvailableYet')}
                  </p>
                  <div className="mt-2">
                    {protocol.rewardVaultBalance !== null && rewardVaultSolscanUrl ? (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-8 border-primary/30 px-3 text-xs"
                      >
                        <a href={rewardVaultSolscanUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-3.5 w-3.5" />
                          Solscan
                        </a>
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">{t('notAvailableYet')}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-background/30 p-3 text-center">
                  <p className="text-xs text-muted-foreground">{t('stakingStatus')}</p>
                  <p className={`font-semibold ${stakingOpened ? 'text-green-500' : 'text-amber-500'}`}>
                    {stakingOpened ? t('open') : t('closed')}
                  </p>
                </div>
                <div className="rounded-lg bg-background/30 p-3 text-center">
                  <p className="text-xs text-muted-foreground">{t('lockDuration')}</p>
                  <p className="font-semibold">{LOCK_DAYS} {lockUnitWord}</p>
                </div>
                <div className="rounded-lg bg-background/30 p-3 text-center">
                  <p className="text-xs text-muted-foreground">{t('totalRewardsPaid')}</p>
                  <p className="font-semibold">
                    {protocol.totalRewardsPaid !== null 
                      ? formatTokenAmount(protocol.totalRewardsPaid) 
                      : '---'} SEON
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {!connected ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-md"
          >
            <Card className="border-primary/20 bg-card/50 backdrop-blur">
              <CardContent className="flex flex-col items-center gap-6 p-8">
                <div className="rounded-full bg-primary/10 p-4">
                  <Lock className="h-8 w-8 text-primary" />
                </div>
                <p className="text-center text-muted-foreground">
                    {stakingLive ? t('connectWalletPrompt') : t('connectWalletFuturePrompt')}
                  </p>
                {stakingLive && <WalletButton />}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Create Position Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-1"
            >
              <Card className="border-primary/20 bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-primary" />
                    {t('createPosition')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      {t('amount')} (SEON)
                    </label>
                    <div className="space-y-4 rounded-lg border border-primary/10 bg-background/30 p-4">
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={stakeAmount}
                          onChange={handleAmountInputChange}
                          step="0.01"
                          min="0"
                          className="bg-background/50"
                          disabled={!canPerformActions}
                        />
                        <span className="shrink-0 text-xs font-medium text-muted-foreground">SEON</span>
                      </div>
                      <Slider
                        value={[stakeAmountSlider]}
                        onValueChange={handleAmountSliderChange}
                        min={0}
                        max={walletAmount}
                        step={0.01}
                        className="w-full"
                        disabled={!canPerformActions || protocol.userData.seonBalance === null}
                      />
                      <div className="flex flex-wrap gap-2">
                        {AMOUNT_PRESETS.map((preset) => (
                          <Button
                            key={preset.label}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-xs"
                            onClick={() => preset.label === 'MAX' ? setMaxAmount() : setAmountPreset(preset.numerator, preset.denominator)}
                            disabled={!canPerformActions || protocol.userData.seonBalance === null}
                          >
                            {preset.label}
                          </Button>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('balance')}: {walletValue(protocol.userData.seonBalance)}
                    </p>
                  </div>
                  </div>

                  <div className="rounded-lg bg-primary/10 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {locale === 'es' ? 'Lock obligatorio' : 'Mandatory lock'}
                      </span>
                      <span className="text-xl font-bold text-primary">
                        {LOCK_DAYS} {lockUnitWord}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border border-primary/15 bg-background/40 p-4 text-sm">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="font-semibold">{t('stakeRentNoticeTitle')}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {t('stakeRentNoticeDesc')}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleStake}
                    className="w-full bg-gradient-to-r from-primary to-primary/80"
                    disabled={!canSubmitStake}
                  >
                    <Lock className="mr-2 h-4 w-4" />
                    {stakingTransactionsEnabled ? (isStaking ? t('stakingNow') : t('stake')) : t('onchainStakingPending')}
                  </Button>
                  
                  {stakeDisabledReason && (
                    <p className="text-center text-xs text-amber-500">
                      {stakeDisabledReason}
                    </p>
                  )}
                  {stakeError && (
                    <p className="text-center text-xs text-destructive">
                      {stakeError}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Positions List */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-2"
            >
              <Card className="border-primary/20 bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    {t('yourPositions')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!walletSnapshotLoaded ? (
                    <div className="py-12 text-center">
                      <Wallet className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <p className="mt-4 text-muted-foreground">
                        {t('positionsPending')}
                      </p>
                      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                        {t('positionsPendingDesc')}
                      </p>
                    </div>
                  ) : positions.length === 0 ? (
                    <div className="py-12 text-center">
                      <Wallet className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <p className="mt-4 text-muted-foreground">
                        {t('noPositions')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {positions.map((position, index) => {
                        const claimable = estimateClaimableRewards(
                          position,
                          protocol.config ? projectRewardPerTokenQ64(protocol.config, nowSeconds) : BigInt(0)
                        );
                        const startTimeSeconds = Number(position.lockStartTime);
                        const endTimeSeconds = Number(position.lockEndTime);
                        const durationDays = LOCK_DAYS;
                        const isExpired = nowSeconds >= endTimeSeconds;
                        const graceEnd = endTimeSeconds + gracePeriodSeconds;
                        const pastGrace = nowSeconds > graceEnd;
                        const claimReady = !pastGrace && claimable > BigInt(0);
                        const status = position.isClosed
                          ? t('closed')
                          : isExpired
                            ? t('expired')
                            : t('active');
                        const claimActionKey = `claim-${position.positionId.toString()}`;
                        const renewActionKey = `renew-${position.positionId.toString()}`;
                        const unstakeActionKey = `unstake-${position.positionId.toString()}`;

                        return (
                          <div
                            key={`${position.owner.toBase58()}-${position.positionId.toString()}`}
                            className="rounded-lg border border-primary/10 bg-background/40 p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold text-primary">
                                    {positionLabel} {index + 1}
                                  </p>
                                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                                    {status}
                                  </span>
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {formatTokenAmount(position.amount)} SEON
                                  {' · '}
                                  {formatDays(durationDays)} {lockUnitLabel}
                                </p>
                                {pastGrace && (
                                  <p className="mt-1 text-xs text-amber-500">
                                    {locale === 'es'
                                      ? 'Fuera de gracia: solo puedes renovar o retirar. Cualquier wallet puede ejecutar la limpieza pública.'
                                      : 'Post-grace: only renew or unstake remain available. Any wallet may run public cleanup.'}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">{t('claimableRewards')}</p>
                                <p className="font-semibold text-secondary">
                                  {formatTokenAmount(claimable)} SEON
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                              <div className="rounded-md bg-background/50 p-3">
                                <p className="text-xs text-muted-foreground">{t('lockStarted')}</p>
                                <p className="font-semibold">
                                  {formatDateTime(startTimeSeconds)}
                                </p>
                              </div>
                              <div className="rounded-md bg-background/50 p-3">
                                <p className="text-xs text-muted-foreground">{locale === 'es' ? 'Deducción al reclamar' : 'Claim deduction'}</p>
                                <p className="font-semibold">
                                  {(position.rewardRedistributionBps / 100).toFixed(2)}%
                                </p>
                              </div>
                              <div className="rounded-md bg-background/50 p-3">
                                <p className="text-xs text-muted-foreground">{t('lockedUntil')}</p>
                                <p className="font-semibold">
                                  {formatDateTime(endTimeSeconds)}
                                </p>
                              </div>
                              <div className="rounded-md bg-background/50 p-3">
                                <p className="text-xs text-muted-foreground">{t('status')}</p>
                                <p className="font-semibold">{status}</p>
                              </div>
                            </div>

                            <div className="mt-4 rounded-lg border border-primary/10 bg-background/30 p-4">
                              <div className="space-y-3">
                                <div className="grid max-w-md gap-3 sm:grid-cols-2 sm:mx-auto">
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    className="border border-primary/25 bg-primary/10 text-foreground shadow-sm hover:bg-primary/20"
                                    onClick={() => handlePositionAction('renew', position)}
                                    disabled={!stakingTransactionsEnabled || !isExpired || activeAction === renewActionKey}
                                  >
                                    {activeAction === renewActionKey ? t('stakingNow') : t('restake')}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    className="border border-primary/25 bg-primary/10 text-foreground shadow-sm hover:bg-primary/20"
                                    onClick={() => handlePositionAction('unstake', position)}
                                    disabled={!stakingTransactionsEnabled || !isExpired || activeAction === unstakeActionKey}
                                  >
                                    {activeAction === unstakeActionKey ? t('stakingNow') : t('unstake')}
                                  </Button>
                                </div>
                                <div className="max-w-sm mx-auto">
                                  <Button
                                    type="button"
                                    className="w-full"
                                    onClick={() => handlePositionAction('claim', position)}
                                    disabled={!stakingTransactionsEnabled || !claimReady || activeAction === claimActionKey}
                                  >
                                    {activeAction === claimActionKey
                                      ? t('stakingNow')
                                      : claimReady
                                        ? t('claim')
                                        : pastGrace
                                          ? (locale === 'es' ? 'Claim cerrado tras la gracia' : 'Claim closed after grace')
                                          : t('claim')}
                                  </Button>
                                </div>
                                <p className="text-right text-xs text-muted-foreground">
                                  {renewNotice}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Reward budget disclaimer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-8"
        >
          <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-4 text-sm">
            <Info className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
            <p className="text-muted-foreground">{t('aprNotGuaranteed')}</p>
          </div>
        </motion.div>

        {/* Terminal Section for Advanced Users - Collapsible */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <Collapsible>
            <Card className="border-secondary/20 bg-card/30 backdrop-blur">
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-secondary/5 transition-colors">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Terminal className="h-5 w-5 text-secondary" />
                      {t('advancedUsersTitle')}
                    </span>
                    <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
                  </CardTitle>
                  <CardDescription className="text-left">{t('terminalDesc')}</CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="space-y-3 rounded-lg bg-black/50 p-4 font-mono text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-green-500">$</span>
                      <code className="text-gray-300">{t('terminalStake')}</code>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-500">$</span>
                      <code className="text-gray-300">{t('terminalClaim')}</code>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-500">$</span>
                      <code className="text-gray-300">{t('terminalUnstake')}</code>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-500">$</span>
                      <code className="text-gray-300">{t('terminalRenew')}</code>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2 pl-4">
                      {t('terminalRenewNote')}
                    </div>
                  </div>
                  <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-sm">
                    <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
                    <p className="text-amber-200/80">
                      {t('reviewWarning')}
                    </p>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </motion.div>
      </div>
    </main>
  );
}
