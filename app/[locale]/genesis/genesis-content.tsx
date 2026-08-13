'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';
import {
  BadgeDollarSign,
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
  const summaryMetrics = [
    {
      icon: Coins,
      label: isEn ? 'Total supply' : 'Supply total',
      value: '444,444,444 SEON',
      detail: isEn ? 'Fixed supply' : 'Supply fijo',
      iconClassName: 'bg-primary/15 text-primary',
      valueClassName: 'text-foreground',
    },
    {
      icon: Gift,
      label: isEn ? 'Genesis Airdrop' : 'Airdrop Genesis',
      value: `${formatAmount(SEON_GENESIS_AIRDROP_ALLOCATION)} SEON`,
      detail: isEn ? '440 wallets · 10,000 SEON each' : '440 wallets · 10,000 SEON cada una',
      iconClassName: 'bg-muted text-muted-foreground',
      valueClassName: 'text-foreground',
    },
    {
      icon: ShieldCheck,
      label: isEn ? 'Genesis claim' : 'Reclamación Genesis',
      value: isEn ? 'No claim' : 'No se reclama',
      detail: isEn
        ? 'No wallet connection, signature or payment.'
        : 'Sin conectar una wallet, firmar ni pagar.',
      iconClassName: 'bg-emerald-500/15 text-emerald-400',
      valueClassName: 'text-emerald-400',
    },
    {
      icon: BadgeDollarSign,
      label: isEn ? 'Initial sale' : 'Venta inicial',
      value: isEn ? 'No sale' : 'No se vende',
      detail: isEn
        ? 'No presale or Genesis purchase.'
        : 'Sin preventa ni compra Genesis.',
      iconClassName: 'bg-emerald-500/15 text-emerald-400',
      valueClassName: 'text-emerald-400',
    },
  ];
  const metrics: [LucideIcon, string, string][] = [
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
      percent: '0.990%',
      label: isEn ? 'Genesis Airdrop distribution wallet' : 'Wallet de distribución del Airdrop Genesis',
      icon: Gift,
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
        'A public future seed selects 440 recipients deterministically; the result is split into ten fixed waves.',
        'Every completed wave publishes recipients, transaction signatures, failures and a cumulative verification report.',
      ]
    : [
        'Las fuentes de candidatos, el slot del snapshot, las reglas y las exclusiones se publican antes de la selección.',
        'Las wallets elegibles deben mostrar actividad sostenida en Solana, interacción reciente con el ecosistema y entre 0.05 y 500 SOL en el snapshot.',
        'Se excluyen protocolos, exchanges, bots, duplicados y direcciones controladas por Soleon.',
        'Una seed pública futura selecciona 440 receptores de forma determinista; el resultado se divide en diez olas fijas.',
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
          <h1 className="mt-3 max-w-full whitespace-normal break-words font-serif text-3xl font-bold leading-tight text-gradient-gold sm:text-5xl">
            {isEn ? 'Soleon Genesis Airdrop' : 'Airdrop Genesis de Soleon'}
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            {isEn
              ? '4,400,000 SEON are transferred directly on-chain to 440 independently selected Solana wallets through ten public weekly waves.'
              : '4,400,000 SEON se transfieren directamente on-chain a 440 wallets de Solana seleccionadas de forma independiente mediante diez olas semanales públicas.'}
          </p>
        </motion.header>

        <section className="mt-10 overflow-hidden rounded-lg border border-primary/25 bg-card/40">
          <div className="grid sm:grid-cols-2 xl:grid-cols-4">
            {summaryMetrics.map(({ icon: Icon, label, value, detail, iconClassName, valueClassName }, index) => (
              <div
                key={label}
                className={`flex min-h-40 items-center gap-4 border-primary/15 px-5 py-7 ${
                  index > 0 ? 'border-t' : ''
                } ${index % 2 === 1 ? 'sm:border-l' : ''} ${index === 1 ? 'sm:border-t-0' : ''} ${
                  index > 0 ? 'xl:border-l xl:border-t-0' : ''
                }`}
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconClassName}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className={`mt-1 text-xl font-bold ${valueClassName}`}>{value}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
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
              ? 'The three allocations sum exactly to the fixed 444,444,444 SEON supply. There is no presale and no hidden review or market reserve.'
              : 'Las tres asignaciones suman exactamente el supply fijo de 444,444,444 SEON. No hay preventa ni reserva oculta de revisión o mercado.'}
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
              ? 'Each wave contains 44 preselected wallets and distributes 440,000 SEON. Failed transfers are retried idempotently and never replaced with discretionary recipients.'
              : 'Cada ola contiene 44 wallets preseleccionadas y distribuye 440,000 SEON. Las transferencias fallidas se reintentan de forma idempotente y nunca se sustituyen por receptores discrecionales.'}
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
            {isEn ? 'Open market formation' : 'Formación abierta del mercado'}
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground">
            {isEn
              ? 'Soleon reserves no SEON for market operations, and no Soleon-controlled wallet places initial bids or asks. A verified permissionless SEON/USDC order book may begin empty. Orders, price, volume and liquidity can only emerge from independent participants. No official pool or liquidity commitment is planned.'
              : 'Soleon no reserva SEON para operar el mercado y ninguna wallet controlada coloca bids o asks iniciales. Un order book permissionless y verificado de SEON/USDC puede comenzar vacío. Las órdenes, el precio, el volumen y la liquidez solo pueden surgir de participantes independientes. No se planifica un pool oficial ni un compromiso de liquidez.'}
          </p>
        </section>

        <section className="mt-10 border-t border-border/60 pt-8">
          <h2 className="text-2xl font-semibold">
            {isEn ? 'Maintainer and protocol control' : 'Mantenedor y control del protocolo'}
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground">
            {isEn
              ? 'Soleon Maintainer operates the website, public reports and required launch wallets. This operational role is disclosed and is not presented as protocol decentralization. The staking upgrade authority remains only through the ten-wave monitoring window; after the final audit, critical authorities are revoked and the published staking rules become immutable.'
              : 'Soleon Maintainer opera la web, los informes públicos y las wallets necesarias para el lanzamiento. Este papel operativo se declara y no se presenta como descentralización del protocolo. La upgrade authority del staking se mantiene solo durante la ventana de monitorización de diez olas; tras la auditoría final se revocan las autoridades críticas y las reglas publicadas de staking pasan a ser inmutables.'}
          </p>
        </section>
      </div>
    </main>
  );
}
