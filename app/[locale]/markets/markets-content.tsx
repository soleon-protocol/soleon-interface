'use client';

import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Copy,
  ExternalLink,
  Info,
  Landmark,
  Layers,
  ListFilter,
  Shield,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SOLEON_CONFIG } from '@/lib/solana/config';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSoleonProtocol } from '@/hooks/use-soleon-protocol';
import { formatTokenAmount } from '@/lib/solana/client';

type MarketCacheStatus = 'ready' | 'pending' | 'error' | 'unavailable' | 'no_mint' | 'no_rpc';
type MarketVerification = 'verified' | 'community' | 'high_risk' | 'fake' | 'pending';

type MarketSummarySnapshot = {
  priceUsd: string | null;
  marketCapUsd: string | null;
  totalLiquidityUsd: string | null;
  volume24hUsd: string | null;
  marketsStatus: string;
  sourceName: string | null;
  sourceUrl: string | null;
};

type ManifestMarketSnapshot = {
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
};

type MarketPoolSnapshot = {
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
};

type MarketRouteSnapshot = {
  id: string;
  name: string;
  status: MarketCacheStatus;
  url: string | null;
  description: string;
};

type MarketCacheResponse = {
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
};

const MARKET_REFRESH_MS = 2 * 60 * 1000;

export function MarketsContent() {
  const t = useTranslations('markets');
  const locale = useLocale();
  const isEn = locale === 'en';
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<MarketCacheResponse | null>(null);
  const [marketLoading, setMarketLoading] = useState(true);
  const { connected } = useWallet();
  const protocol = useSoleonProtocol();
  const mintAddress =
    protocol.soleonMint?.toBase58()
    ?? SOLEON_CONFIG.soleonMint
    ?? marketData?.mintAddress
    ?? null;
  const manifest = marketData?.manifest ?? null;
  const pools = marketData?.pools ?? [];
  const routes = marketData?.routes ?? [];

  useEffect(() => {
    let cancelled = false;

    const loadMarketData = async () => {
      try {
        const response = await fetch('/api/market-cache', {
          method: 'GET',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error(`Market cache request failed: ${response.status}`);

        const payload = await response.json() as MarketCacheResponse;
        if (!cancelled) setMarketData(payload);
      } catch (error) {
        console.error('[markets] Failed to load market cache:', error);
        if (!cancelled) setMarketData(null);
      } finally {
        if (!cancelled) setMarketLoading(false);
      }
    };

    loadMarketData();
    const refreshInterval = window.setInterval(loadMarketData, MARKET_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(refreshInterval);
    };
  }, []);

  const getLocalizedHref = (href: string) => `/${locale}${href === '/' ? '' : href}`;
  const solscanSuffix = SOLEON_CONFIG.cluster === 'devnet' ? '?cluster=devnet' : '';
  const getSolscanTokenUrl = (address: string) => `https://solscan.io/token/${address}${solscanSuffix}`;
  const getSolscanAccountUrl = (address: string) => `https://solscan.io/account/${address}${solscanSuffix}`;

  const handleCopy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedValue(value);
    window.setTimeout(() => setCopiedValue(null), 2000);
  };

  const getStatusLabel = (status: MarketCacheStatus | string | null | undefined) => {
    const normalized = (status ?? 'pending').toLowerCase();
    if (normalized === 'ready' || normalized === 'live') return t('live');
    if (normalized === 'unavailable') return t('unavailable');
    if (normalized === 'no_rpc') return t('noRpc');
    if (normalized === 'error') return t('error');
    return t('pending');
  };

  const getVerificationLabel = (verification: MarketVerification) => {
    if (verification === 'verified') return t('labelVerified');
    if (verification === 'community') return t('labelCommunity');
    if (verification === 'high_risk') return t('labelHighRisk');
    if (verification === 'fake') return t('labelFake');
    return t('pending');
  };

  const getVerificationVariant = (verification: MarketVerification) => {
    if (verification === 'verified') return 'default';
    if (verification === 'fake') return 'destructive';
    return 'secondary';
  };

  const updatedAt = marketData?.updatedAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'medium' }).format(marketData.updatedAt)
    : t('pending');

  return (
    <main className="min-h-screen bg-background pb-16 pt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
          <h1 className="max-w-full whitespace-normal break-words font-serif text-3xl font-bold leading-tight text-gradient-gold sm:text-4xl md:text-5xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-muted-foreground">{t('subtitle')}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Card className="border-secondary/25 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-secondary" />
                {isEn ? 'Permissionless market formation' : 'Formación permissionless del mercado'}
              </CardTitle>
              <CardDescription>
                {isEn
                  ? 'Soleon reserves no SEON for market operations, places no controlled initial bids or asks and promises no official liquidity.'
                  : 'Soleon no reserva SEON para operar el mercado, no coloca bids o asks iniciales controlados ni promete liquidez oficial.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm leading-6 text-muted-foreground">
                {isEn
                  ? 'The verified SEON/USDC order book on Manifest may begin with no orders. Any orders, price, volume or depth come from independent participants. Community-created pools may be listed after address and mint verification, but they remain independent and carry no Soleon guarantee.'
                  : 'El order book verificado SEON/USDC en Manifest puede comenzar sin órdenes. Cualquier orden, precio, volumen o profundidad procede de participantes independientes. Los pools creados por la comunidad podrán mostrarse tras verificar su dirección y mint, pero seguirán siendo independientes y sin garantía de Soleon.'}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Card className="border-primary/20 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CircleDollarSign className="h-5 w-5 text-primary" />
                {t('mintAddress')}
              </CardTitle>
              <CardDescription>{t('mintAddressDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Image src="/images/logo-token.png" alt="SEON" width={40} height={40} className="h-10 w-10 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted-foreground">Soleon (SEON)</p>
                    <p className={mintAddress ? 'truncate font-mono text-sm' : 'text-sm text-amber-500'}>
                      {mintAddress ?? t('mintPending')}
                    </p>
                  </div>
                </div>
                {mintAddress && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleCopy(mintAddress)}>
                      {copiedValue === mintAddress ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      <span className="ml-2">{copiedValue === mintAddress ? t('copied') : t('copy')}</span>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={getSolscanTokenUrl(mintAddress)} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Solscan
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Card className="border-primary/30 bg-card/50">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ListFilter className="h-5 w-5 text-primary" />
                    {t('manifestTitle')}
                  </CardTitle>
                  <CardDescription className="mt-2">{t('manifestDesc')}</CardDescription>
                </div>
                <Badge variant={getVerificationVariant(manifest?.verification ?? 'pending')}>
                  {getVerificationLabel(manifest?.verification ?? 'pending')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-3">
                <div className="rounded-lg bg-background/50 p-4">
                  <p className="font-semibold">{t('manifestWhatTitle')}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{t('manifestWhatDesc')}</p>
                </div>
                <div className="rounded-lg bg-background/50 p-4">
                  <p className="font-semibold">{t('manifestHowTitle')}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{t('manifestHowDesc')}</p>
                </div>
                <div className="rounded-lg bg-background/50 p-4">
                  <p className="font-semibold">{t('manifestWhyTitle')}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{t('manifestWhyDesc')}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg bg-background/50 p-4">
                  <p className="text-sm text-muted-foreground">{t('pair')}</p>
                  <p className="mt-1 font-semibold">SEON/USDC</p>
                </div>
                <div className="rounded-lg bg-background/50 p-4">
                  <p className="text-sm text-muted-foreground">{t('bestBid')}</p>
                  <p className="mt-1 font-semibold">{manifest?.bestBidUsd ?? t('pending')}</p>
                </div>
                <div className="rounded-lg bg-background/50 p-4">
                  <p className="text-sm text-muted-foreground">{t('bestAsk')}</p>
                  <p className="mt-1 font-semibold">{manifest?.bestAskUsd ?? t('pending')}</p>
                </div>
                <div className="rounded-lg bg-background/50 p-4">
                  <p className="text-sm text-muted-foreground">{t('spread')}</p>
                  <p className="mt-1 font-semibold">{manifest?.spread ?? t('pending')}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border/50 bg-background/30 p-4">
                <p className="text-sm text-muted-foreground">{t('manifestAddress')}</p>
                {manifest?.marketAddress ? (
                  <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <p className="min-w-0 flex-1 truncate font-mono text-sm">{manifest.marketAddress}</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleCopy(manifest.marketAddress!)}>
                        {copiedValue === manifest.marketAddress ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        <span className="ml-2">{copiedValue === manifest.marketAddress ? t('copied') : t('copy')}</span>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={getSolscanAccountUrl(manifest.marketAddress)} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Solscan
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 font-semibold text-amber-500">{t('notAvailable')}</p>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                {manifest?.tradeUrl ? (
                  <Button asChild>
                    <a href={manifest.tradeUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      {t('tradeOnManifest')}
                    </a>
                  </Button>
                ) : (
                  <Button disabled>{t('tradeOnManifest')}</Button>
                )}
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t('manifestOrderBookNote')}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <Card className="border-primary/20 bg-card/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                {t('marketOverviewTitle')}
              </CardTitle>
              <CardDescription>{t('marketOverviewDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  [t('seonPrice'), marketData?.summary.priceUsd],
                  [t('marketCap'), marketData?.summary.marketCapUsd],
                  [t('totalLiquidity'), marketData?.summary.totalLiquidityUsd],
                  [t('volume24h'), marketData?.summary.volume24hUsd],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-background/50 p-3">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="mt-1 font-semibold">{value ?? t('pending')}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">{t('updatedAt')}: {updatedAt}</p>
              {connected && (
                <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4 text-sm">
                  <span className="text-muted-foreground">{t('yourSeonBalance')}</span>
                  <span className="font-semibold">
                    {protocol.isLoading
                      ? '...'
                      : protocol.userData.state === 'loaded' && protocol.userData.seonBalance !== null
                        ? `${formatTokenAmount(protocol.userData.seonBalance)} SEON`
                        : t('balanceUnavailable')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-500">
                <AlertTriangle className="h-5 w-5" />
                {t('verifyWarningTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>{t('verifyWarningDesc')}</p>
              <p>{t('transferFeeWarning')}</p>
              <p>{t('noOfficialLiquidityNote')}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Card className="border-secondary/20 bg-card/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-secondary" />
                {t('communityPoolsTitle')}
              </CardTitle>
              <CardDescription>{t('communityPoolsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-3">
                <div className="rounded-lg bg-background/50 p-4">
                  <p className="font-semibold">{t('communityPoolsWhatTitle')}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{t('communityPoolsWhatDesc')}</p>
                </div>
                <div className="rounded-lg bg-background/50 p-4">
                  <p className="font-semibold">{t('communityPoolsWhyTitle')}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{t('communityPoolsWhyDesc')}</p>
                </div>
                <div className="rounded-lg bg-background/50 p-4">
                  <p className="font-semibold">{t('communityPoolsHowTitle')}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{t('communityPoolsHowDesc')}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{t('communityPoolsGuideTitle')}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t('communityPoolsGuideDesc')}</p>
                </div>
                <Button asChild variant="outline" className="shrink-0">
                  <a href={getLocalizedHref('/guides#liquidity-pool-guide')}>
                    {t('liquidityGuideCtaButton')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>

              {pools.length === 0 ? (
                <div className="rounded-lg border border-border/50 bg-background/30 p-4">
                  <p className="font-semibold text-amber-500">{t('notAvailable')}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{t('communityPoolsPending')}</p>
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {pools.map((pool) => (
                    <div key={pool.id} className="rounded-lg border border-border/50 bg-background/30 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{pool.dex}</p>
                          <p className="text-sm text-muted-foreground">{pool.pair}</p>
                        </div>
                        <Badge variant={getVerificationVariant(pool.verification)}>
                          {getVerificationLabel(pool.verification)}
                        </Badge>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div><p className="text-muted-foreground">{t('poolTvl')}</p><p className="font-semibold">{pool.tvlUsd ?? t('pending')}</p></div>
                        <div><p className="text-muted-foreground">{t('poolVolume')}</p><p className="font-semibold">{pool.volume24hUsd ?? t('pending')}</p></div>
                        <div><p className="text-muted-foreground">{t('poolFee')}</p><p className="font-semibold">{pool.fee ?? t('pending')}</p></div>
                        <div><p className="text-muted-foreground">{t('liquidityControl')}</p><p className="font-semibold">{pool.liquidityControl ?? t('pending')}</p></div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <a href={getSolscanAccountUrl(pool.poolAddress)} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Solscan
                          </a>
                        </Button>
                        {pool.tradeUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={pool.tradeUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              {t('openDex')}
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 grid gap-6 lg:grid-cols-2">
          <Card className="border-primary/20 bg-card/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-primary" />
                {t('routesTitle')}
              </CardTitle>
              <CardDescription>{t('routesDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {routes.map((route: MarketRouteSnapshot) => (
                <div key={route.id} className="flex items-center gap-3 rounded-lg bg-background/50 p-3">
                  {route.status === 'ready'
                    ? <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                    : <Clock className="h-5 w-5 shrink-0 text-muted-foreground" />}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{route.name}</p>
                    <p className="text-xs text-muted-foreground">{route.description}</p>
                  </div>
                  {route.url ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={route.url} target="_blank" rel="noopener noreferrer" aria-label={`${t('openExternal')} ${route.name}`}>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  ) : (
                    <Badge variant="secondary">{getStatusLabel(route.status)}</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-card/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                {t('poolVerificationTitle')}
              </CardTitle>
              <CardDescription>{t('poolVerificationDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3, 4].map((index) => (
                <div key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  <span>{t(`verificationRule${index}`)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-primary/20 bg-card/40">
            <CardHeader>
              <CardTitle>{t('liquidityGuideCtaTitle')}</CardTitle>
              <CardDescription>{t('liquidityGuideCtaDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <a href={getLocalizedHref('/guides#liquidity-pool-guide')}>
                  {t('liquidityGuideCtaButton')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
