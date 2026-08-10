'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';
import {
  CalendarDays,
  CheckCircle2,
  Coins,
  ExternalLink,
  FileCheck2,
  Gift,
  Landmark,
  ShieldCheck,
  UserRoundCog,
  Users,
  WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  GENESIS_RECIPIENT_COUNT,
  GENESIS_WALLETS_PER_WAVE,
  GENESIS_WAVE_COUNT,
  SEON_CREATOR_ALLOCATION,
  SEON_GENESIS_AIRDROP_ALLOCATION,
  SEON_GENESIS_WALLET_AMOUNT,
  SEON_MARKET_LIQUIDITY_ALLOCATION,
  SEON_REWARD_VAULT_INITIAL,
  SOLEON_CONFIG,
} from '@/lib/solana/config';

type PublicAddress = {
  label: string;
  value: string | null;
};

const waveDates = [
  '2026-08-31',
  '2026-09-07',
  '2026-09-14',
  '2026-09-21',
  '2026-09-28',
  '2026-10-05',
  '2026-10-12',
  '2026-10-19',
  '2026-10-26',
  '2026-11-02',
] as const;

function formatAmount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function solscanAccountUrl(address: string): string {
  const suffix = SOLEON_CONFIG.cluster === 'devnet' ? '?cluster=devnet' : '';
  return `https://solscan.io/account/${address}${suffix}`;
}

function AddressRow({
  item,
  pendingLabel,
}: {
  item: PublicAddress;
  pendingLabel: string;
}) {
  return (
    <div className="border-b border-border/50 py-4 last:border-b-0">
      <p className="text-sm font-medium">{item.label}</p>
      {item.value ? (
        <a
          href={solscanAccountUrl(item.value)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex max-w-full items-center gap-2 break-all text-sm text-primary underline-offset-4 hover:underline"
        >
          {item.value}
          <ExternalLink className="h-4 w-4 shrink-0" />
        </a>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">{pendingLabel}</p>
      )}
    </div>
  );
}

export function GenesisContent() {
  const isEn = useLocale() === 'en';
  const metrics: [LucideIcon, string, string][] = [
    [Gift, `${formatAmount(SEON_GENESIS_AIRDROP_ALLOCATION)} SEON`, isEn ? 'Genesis Airdrop' : 'Airdrop Genesis'],
    [Users, formatAmount(GENESIS_RECIPIENT_COUNT), isEn ? 'selected wallets' : 'wallets seleccionadas'],
    [CalendarDays, String(GENESIS_WAVE_COUNT), isEn ? 'weekly waves' : 'olas semanales'],
    [WalletCards, `${formatAmount(SEON_GENESIS_WALLET_AMOUNT)} SEON`, isEn ? 'per wallet' : 'por wallet'],
  ];
  const allocations = [
    {
      amount: SEON_REWARD_VAULT_INITIAL,
      percent: '99.000%',
      label: isEn ? 'Finite staking reward vault' : 'Reward vault finita de staking',
      icon: Coins,
    },
    {
      amount: SEON_GENESIS_AIRDROP_ALLOCATION,
      percent: '0.900%',
      label: isEn ? 'Genesis Airdrop distribution wallet' : 'Wallet de distribución del Airdrop Genesis',
      icon: Gift,
    },
    {
      amount: SEON_MARKET_LIQUIDITY_ALLOCATION,
      percent: '0.090%',
      label: isEn ? 'Temporary market and liquidity reserve' : 'Reserva temporal de mercado y liquidez',
      icon: Landmark,
    },
    {
      amount: SEON_CREATOR_ALLOCATION,
      percent: '0.010%',
      label: isEn ? 'Initial developer allocation' : 'Asignación inicial del desarrollador',
      icon: UserRoundCog,
    },
  ];
  const selectionRules = isEn
    ? [
        'Candidate sources, snapshot slot, eligibility rules and exclusions are published before selection.',
        'Eligible wallets must show sustained Solana activity, recent ecosystem interaction and a snapshot SOL balance between 0.05 and 500 SOL.',
        'Protocol, exchange, bot, duplicate and Soleon-controlled addresses are excluded.',
        'A public future seed selects 400 recipients deterministically; the result is split into ten fixed waves.',
        'Every completed wave publishes recipients, transaction signatures, failures and a cumulative verification report.',
      ]
    : [
        'Las fuentes de candidatos, el slot del snapshot, las reglas y las exclusiones se publican antes de la selección.',
        'Las wallets elegibles deben mostrar actividad sostenida en Solana, interacción reciente con el ecosistema y entre 0.05 y 500 SOL en el snapshot.',
        'Se excluyen protocolos, exchanges, bots, duplicados y direcciones controladas por Soleon.',
        'Una seed pública futura selecciona 400 receptores de forma determinista; el resultado se divide en diez olas fijas.',
        'Cada ola completada publica receptores, firmas de transacción, errores e informe acumulado de verificación.',
      ];
  const publicAddresses: PublicAddress[] = [
    {
      label: isEn ? 'Genesis Distribution Wallet' : 'Wallet de Distribución Genesis',
      value: SOLEON_CONFIG.genesisDistributionWallet,
    },
    {
      label: isEn ? 'Genesis Distribution token account' : 'Cuenta de token de Distribución Genesis',
      value: SOLEON_CONFIG.genesisDistributionTokenAccount,
    },
    {
      label: isEn ? 'Market / Liquidity Wallet' : 'Wallet de Mercado / Liquidez',
      value: SOLEON_CONFIG.marketLiquidityWallet,
    },
    {
      label: isEn ? 'Market / Liquidity token account' : 'Cuenta de token de Mercado / Liquidez',
      value: SOLEON_CONFIG.marketLiquidityTokenAccount,
    },
    {
      label: isEn ? 'Developer Wallet' : 'Wallet del desarrollador',
      value: SOLEON_CONFIG.creatorAllocationWallet,
    },
  ];

  return (
    <main className="min-h-screen bg-background py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-3xl text-center"
        >
          <Image
            src="/images/logo-token.png"
            alt="Soleon"
            width={72}
            height={72}
            className="mx-auto"
          />
          <p className="mt-5 text-sm font-semibold uppercase text-primary">
            {isEn ? 'Transparent initial distribution' : 'Distribución inicial transparente'}
          </p>
          <h1 className="mt-3 font-serif text-4xl font-bold text-gradient-gold sm:text-5xl">
            {isEn ? 'Soleon Genesis Airdrop' : 'Airdrop Genesis de Soleon'}
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            {isEn
              ? '4,000,000 SEON are transferred directly on-chain to 400 independently selected Solana wallets through ten public weekly waves.'
              : '4,000,000 SEON se transfieren directamente on-chain a 400 wallets de Solana seleccionadas de forma independiente mediante diez olas semanales públicas.'}
          </p>
        </motion.header>

        <section className="mt-10 border-y border-primary/25 bg-primary/5 px-5 py-6">
          <div className="flex items-start gap-4">
            <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">
                {isEn ? 'No claim is required' : 'No hace falta reclamar'}
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {isEn
                  ? 'Selected recipients receive SEON automatically. Soleon will never ask you to connect a wallet, sign a message, approve a transaction or pay a fee to receive a Genesis allocation.'
                  : 'Los receptores seleccionados reciben SEON automáticamente. Soleon nunca pedirá conectar una wallet, firmar un mensaje, aprobar una transacción ni pagar una fee para recibir una asignación Genesis.'}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map(([Icon, value, label]) => (
            <Card key={label} className="border-border/50 bg-card/50">
              <CardContent className="p-5">
                <Icon className="h-5 w-5 text-primary" />
                <p className="mt-4 text-2xl font-bold">{value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-semibold">
            {isEn ? 'Fixed supply allocation' : 'Asignación de supply fija'}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {isEn
              ? 'The four allocations sum exactly to the fixed 444,444,444 SEON supply. There is no presale and no hidden review reserve.'
              : 'Las cuatro asignaciones suman exactamente el supply fijo de 444,444,444 SEON. No hay preventa ni reserva oculta de revisión.'}
          </p>
          <div className="mt-5 divide-y divide-border/50 border-y border-border/50">
            {allocations.map(({ amount, percent, label, icon: Icon }) => (
              <div key={label} className="grid items-center gap-3 py-4 sm:grid-cols-[36px_190px_1fr_90px]">
                <Icon className="h-5 w-5 text-primary" />
                <strong>{formatAmount(amount)} SEON</strong>
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-right text-sm font-semibold text-primary">{percent}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-semibold">
            {isEn ? 'Ten weekly waves' : 'Diez olas semanales'}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {isEn
              ? 'Each wave contains 40 preselected wallets and distributes 400,000 SEON. Failed transfers are retried idempotently and never replaced with discretionary recipients.'
              : 'Cada ola contiene 40 wallets preseleccionadas y distribuye 400,000 SEON. Las transferencias fallidas se reintentan de forma idempotente y nunca se sustituyen por receptores discrecionales.'}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {waveDates.map((date, index) => (
              <div key={date} className="border-l-2 border-primary/40 px-4 py-2">
                <p className="text-sm font-semibold">
                  {isEn ? `Wave ${index + 1}` : `Ola ${index + 1}`}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{date}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {GENESIS_WALLETS_PER_WAVE} wallets
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-primary" />
                {isEn ? 'Reproducible selection' : 'Selección reproducible'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm leading-6 text-muted-foreground">
                {selectionRules.map((rule) => (
                  <li key={rule} className="flex gap-3">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-4 text-sm">
                {SOLEON_CONFIG.genesisSelectionRulesUrl && (
                  <a
                    href={SOLEON_CONFIG.genesisSelectionRulesUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-semibold text-primary hover:underline"
                  >
                    {isEn ? 'Selection rules' : 'Reglas de selección'}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                {SOLEON_CONFIG.genesisReportsUrl && (
                  <a
                    href={SOLEON_CONFIG.genesisReportsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-semibold text-primary hover:underline"
                  >
                    {isEn ? 'Wave reports' : 'Informes de las olas'}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-primary" />
                {isEn ? 'Public addresses' : 'Direcciones públicas'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {publicAddresses.map((item) => (
                <AddressRow
                  key={item.label}
                  item={item}
                  pendingLabel={isEn ? 'Published after mainnet creation' : 'Se publicará tras su creación en mainnet'}
                />
              ))}
            </CardContent>
          </Card>
        </div>

        <section className="mt-16 border-t border-border/60 pt-8">
          <h2 className="text-2xl font-semibold">
            {isEn ? 'Temporary market reserve' : 'Reserva temporal de mercado'}
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground">
            {isEn
              ? 'The 400,000 SEON market allocation is held in a separately published wallet. It may place genuine SEON/USDC bids and asks under public rules, but it never trades against another Soleon-controlled wallet and never fabricates volume. After two to three months, real activity determines whether the remaining assets can seed a permanently locked or burned-LP pool. If that condition is not met, no pool is forced.'
              : 'La asignación de mercado de 400,000 SEON se mantiene en una wallet pública separada. Puede colocar bids y asks reales de SEON/USDC bajo reglas públicas, pero nunca opera contra otra wallet controlada por Soleon ni fabrica volumen. Tras dos o tres meses, la actividad real determina si los activos restantes pueden iniciar un pool con LP bloqueado o quemado permanentemente. Si no se cumple esa condición, no se fuerza ningún pool.'}
          </p>
        </section>

        <section className="mt-10 border-t border-border/60 pt-8">
          <h2 className="text-2xl font-semibold">
            {isEn ? 'Maintainer and protocol control' : 'Mantenedor y control del protocolo'}
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground">
            {isEn
              ? 'Soleon Maintainer operates the website, public reports and temporary launch wallets. This operational role is disclosed and is not presented as protocol decentralization. The staking upgrade authority remains only through the ten-wave monitoring window; after the final audit, critical authorities are revoked and the published staking rules become immutable.'
              : 'Soleon Maintainer opera la web, los informes públicos y las wallets temporales de lanzamiento. Este papel operativo se declara y no se presenta como descentralización del protocolo. La upgrade authority del staking se mantiene solo durante la ventana de monitorización de diez olas; tras la auditoría final se revocan las autoridades críticas y las reglas publicadas de staking pasan a ser inmutables.'}
          </p>
        </section>
      </div>
    </main>
  );
}
