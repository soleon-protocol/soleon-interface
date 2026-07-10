'use client';

import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Code2, Gift, Lock, RefreshCw, ShieldCheck, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Step = [string, string, string, LucideIcon];

export function HowItWorksContent() {
  const t = useTranslations('howItWorks');
  const isEn = useLocale() === 'en';
  const steps: Step[] = isEn
    ? [
        ['1', 'Genesis Claim', 'SEON starts with a free on-chain distribution: one 2,000 SEON claim per eligible wallet, verified by public Solana reputation rules and a server-side eligibility signature.', Gift],
        ['2', 'Public review', 'The staking source code and website are published for review while the staking program remains undeployed. There is no review reserve or promised payout program.', Code2],
        ['3', 'Staking opening', 'Staking opens only after Genesis Claim is complete or September 1, 2026, whichever comes later, and only if the rehearsal is correct.', Lock],
        ['4', 'Immutable protocol', 'After final verification, critical authorities are revoked or transferred to protocol-controlled rules so the published on-chain behavior cannot be changed by an administrator.', ShieldCheck],
      ]
    : [
        ['1', 'Genesis Claim', 'SEON comienza con una distribución on-chain gratuita: un claim de 2,000 SEON por wallet elegible, verificado con reglas públicas de reputación Solana y una firma server-side de elegibilidad.', Gift],
        ['2', 'Revisión pública', 'El código de staking y la web se publican para revisión mientras el programa de staking permanece sin desplegar. No existe reserva de revisión ni programa de pagos prometido.', Code2],
        ['3', 'Apertura del staking', 'El staking se abre solo cuando Genesis Claim haya terminado o el 1 de septiembre de 2026, lo que ocurra más tarde, y siempre que el rehearsal sea correcto.', Lock],
        ['4', 'Protocolo inmutable', 'Tras la verificación final, las autoridades críticas se revocan o pasan a reglas controladas por el protocolo para que un administrador no pueda cambiar el comportamiento on-chain publicado.', ShieldCheck],
      ];
  const stakingRules = isEn
    ? [
        'Claim is available whenever rewards are positive until the grace period ends.',
        'An on-time renew compounds principal and rewards and lowers the future reward redistribution by 0.5 percentage points.',
        'New positions start with 10% reward redistribution to the reward vault. It reaches 0% after 20 on-time renewals.',
        'After grace, claim is disabled. Renew or unstake still works, but reward redistribution resets to 10%.',
        'Expired positions can be cleaned up publicly after grace; principal always returns to its owner.',
      ]
    : [
        'El claim está disponible cuando existan rewards positivos hasta que termine la gracia.',
        'Un renew puntual consolida principal y rewards y reduce la redistribución futura en 0.5 puntos porcentuales.',
        'Las posiciones nuevas empiezan con un 10% de redistribución de rewards a la reward vault. Llega al 0% tras 20 renew puntuales.',
        'Tras la gracia se bloquea el claim. Renew o unstake siguen disponibles, pero la redistribución vuelve al 10%.',
        'Las posiciones expiradas pueden limpiarse públicamente tras la gracia; el principal siempre vuelve a su propietario.',
      ];

  return (
    <main className="min-h-screen bg-background py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <h1 className="font-serif text-4xl font-bold text-gradient-gold sm:text-5xl">{t('title')}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{t('subtitle')}</p>
        </motion.div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {steps.map(([number, title, description, Icon], index) => (
            <motion.div key={String(number)} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * index }}>
              <Card className="h-full border-border/50 bg-card/50">
                <CardHeader className="flex-row items-center gap-3 space-y-0">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">{String(number)}</span>
                  <Icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{String(title)}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{String(description)}</CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <section className="mt-14 grid gap-6 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-semibold"><Lock className="h-5 w-5 text-primary" />{isEn ? 'Staking cycle' : 'Ciclo de staking'}</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {[
                [isEn ? 'Lock' : 'Lock', isEn ? '7 days' : '7 días'],
                [isEn ? 'Grace' : 'Gracia', isEn ? '3 days' : '3 días'],
                [isEn ? 'Initial redistribution' : 'Redistribución inicial', '10%'],
                [isEn ? 'On-time renew reduction' : 'Reducción por renew puntual', '0.5 pp'],
              ].map(([label, value]) => (
                <div key={label} className="border-b border-border/50 py-3">
                  <div className="text-sm text-muted-foreground">{label}</div>
                  <div className="mt-1 text-2xl font-bold text-primary">{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-semibold"><RefreshCw className="h-5 w-5 text-primary" />{isEn ? 'Position rules' : 'Reglas de posición'}</h2>
            <ul className="mt-5 space-y-3 text-muted-foreground">
              {stakingRules.map((rule) => <li key={rule} className="flex gap-3"><span className="text-primary">-</span><span>{rule}</span></li>)}
            </ul>
          </div>
        </section>

        <p className="mt-12 flex items-start gap-3 border-t border-border/60 pt-6 text-sm text-muted-foreground">
          <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          {isEn ? 'The website builds transactions; wallets sign them. It does not custody user funds.' : 'La web construye transacciones; las wallets las firman. La web no custodia fondos de usuarios.'}
        </p>
      </div>
    </main>
  );
}
