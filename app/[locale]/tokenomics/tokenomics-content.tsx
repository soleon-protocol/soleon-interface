'use client';

import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Coins, Flame, Gift, Lock, Percent, RefreshCw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function TokenomicsContent() {
  const t = useTranslations('tokenomics');
  const isEn = useLocale() === 'en';
  const allocations = [
    ['440,000,000 SEON', isEn ? 'Finite staking reward vault' : 'Reward vault finita de staking', '99.000%'],
    ['4,400,000 SEON', isEn ? 'Genesis Claim contract vault' : 'Vault del contrato Genesis Claim', '0.990%'],
    ['44,444 SEON', isEn ? 'Initial developer allocation' : 'Asignación inicial del desarrollador', '0.010%'],
  ];
  const feeRules = isEn
    ? ['Mint creation: 0%', 'When staking opens: permissionless update to 0.02%', '+0.02 percentage points per completed staking year', 'Maximum: 0.4%', 'Maximum fee per transfer: 400 SEON', 'Distribution: 20% burn, up to 1 SEON maintenance caller incentive, remainder to the reward vault']
    : ['Creación del mint: 0%', 'Al abrir staking: actualización permissionless a 0.02%', '+0.02 puntos porcentuales por cada año completo de staking', 'Máximo: 0.4%', 'Fee máxima por transferencia: 400 SEON', 'Distribución: 20% quema, hasta 1 SEON de incentivo al ejecutor de mantenimiento y el resto a la reward vault'];
  const rewardRules = isEn
    ? ['Year 1 budget: up to 1% of the uncommitted reward vault', '+0.5 percentage points each staking year', 'Maximum annual percentage: 100%', 'Rewards accrue proportionally to active staked SEON', 'Returned funds affect the next annual budget, not the current one']
    : ['Presupuesto del año 1: hasta el 1% de la reward vault no comprometida', '+0.5 puntos porcentuales cada año de staking', 'Porcentaje anual máximo: 100%', 'Los rewards se devengan proporcionalmente al SEON en staking activo', 'Los fondos retornados afectan al presupuesto del siguiente año, no al actual'];

  return (
    <main className="min-h-screen bg-background py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <h1 className="font-serif text-4xl font-bold text-gradient-gold sm:text-5xl">{t('title')}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{t('subtitle')}</p>
        </motion.div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {([
            [Coins, '444,444,444 SEON', isEn ? 'Fixed supply' : 'Supply fija'],
            [Gift, '440,000,000 SEON', isEn ? 'Reward vault' : 'Reward vault'],
            [Lock, isEn ? '7 days' : '7 días', isEn ? 'Single staking lock' : 'Lock único de staking'],
            [Percent, '0% -> 0.4%', isEn ? 'Token-2022 transfer fee' : 'Fee de transferencia Token-2022'],
          ] as [LucideIcon, string, string][]).map(([Icon, value, label]) => (
            <Card key={String(label)} className="border-border/50 bg-card/50">
              <CardContent className="p-5"><Icon className="h-5 w-5 text-primary" /><div className="mt-4 text-2xl font-bold">{String(value)}</div><div className="mt-1 text-sm text-muted-foreground">{String(label)}</div></CardContent>
            </Card>
          ))}
        </div>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold">{isEn ? 'Initial allocation' : 'Asignación inicial'}</h2>
          <div className="mt-5 divide-y divide-border/50 border-y border-border/50">
            {allocations.map(([amount, label, percent]) => <div key={amount} className="grid gap-2 py-4 sm:grid-cols-[180px_1fr_90px]"><strong>{amount}</strong><span className="text-muted-foreground">{label}</span><span className="text-right text-primary">{percent}</span></div>)}
          </div>
        </section>

        <div className="mt-14 grid gap-7 lg:grid-cols-2">
          <Card className="border-border/50 bg-card/50">
            <CardHeader><CardTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5 text-primary" />{isEn ? 'Finite annual rewards' : 'Rewards anuales finitos'}</CardTitle></CardHeader>
            <CardContent><ul className="space-y-3 text-sm text-muted-foreground">{rewardRules.map((rule) => <li key={rule}>- {rule}</li>)}</ul></CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50">
            <CardHeader><CardTitle className="flex items-center gap-2"><Flame className="h-5 w-5 text-primary" />{isEn ? 'Transfer-fee schedule' : 'Calendario de fee de transferencia'}</CardTitle></CardHeader>
            <CardContent><ul className="space-y-3 text-sm text-muted-foreground">{feeRules.map((rule) => <li key={rule}>- {rule}</li>)}</ul></CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
